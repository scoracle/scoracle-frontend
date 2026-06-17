/**
 * Card Registry — the single source of truth for the profile page's cards: what
 * exists and everything each one needs in-app.
 *
 * Share/identity (archetype, shareable, shareCategory) lives in the sibling
 * `lib/cards/card-meta.ts`, and the OG/share render in `lib/cards/og-bodies.ts`,
 * both keyed by the same `CardId` — see ~/scoracleWiki/wiki/Architecture/Card
 * Pillar.md. This file owns the in-app wiring.
 *
 * One descriptor per card co-locates the four things that used to live in three
 * separate, tab-keyed lists (and silently drifted apart):
 *   - `label`    — the NavStrip caption (ContentShell)
 *   - `body`     — the Card to mount when active (ContentShell)
 *   - `fallback` — the skeleton shown while the Card's data is in flight
 *   - `preload`  — warms the EXACT query the Card reads via createAsync
 *
 * Why `preload` lives here: query() keys its cache by [fn-name, ...args], so a
 * preload only helps if it calls the same function with the same args the Card
 * consumes. Keeping the preload next to the Card it serves makes that pairing
 * impossible to get wrong — adding a tab is one entry, and you literally can't
 * add the Card without adding its matching preload. (This replaced a hand-kept
 * preload list in profile.tsx that warmed `getNews`/`getTwitterFeed` while
 * NewsCard actually read the merged `getNewsFeed` — so the News feed cold-
 * fetched on tab click. See docs/progress/2026-05-28_news-preload-realign.md.)
 *
 * Order here IS the on-screen tab order. `stats` is the locked default landing
 * tab (set in deriveInitialTab / the activeTab signal), so it leads.
 */

import type { JSX } from "solid-js";
import type { ProfileTab } from "../../contexts/profile";
import type { EntityType } from "../../lib/types";

/** A view control this card declares for the <ScopeStrip> below the NavStrip.
 *  ContentShell renders each only when its data is present (a control self-hides
 *  on empty), so `rate` shows for players-with-modes, `scope` when the entity has
 *  cohort re-ranks, `season` when >1 season exists. */
export type CardControl = "model" | "rate" | "scope" | "season" | "compare";

import CompositeCard, { CompositeCardSkeleton } from "./CompositeCard";
import SigilCard, { SigilCardSkeleton } from "./SigilCard";
import TrendsCard, { TrendsCardSkeleton } from "./TrendsCard";
import VibeCard, { VibeCardSkeleton } from "./VibeCard";
import NewsCard, { NewsCardSkeleton } from "./NewsCard";
import RosterCard, { RosterCardSkeleton } from "./RosterCard";
import TransfersCard, { TransfersCardSkeleton } from "./TransfersCard";

import { getTrends } from "../../lib/data/trends.server";
import { getStats } from "../../lib/data/stats.server";
import { getSigil } from "../../lib/data/sigil.server";
import { getNews } from "../../lib/data/news.server";
import { getTransfers } from "../../lib/data/transfers.server";
import { getVibes } from "../../lib/data/vibes.server";
import { getRoster } from "../../lib/data/roster.server";

export interface CardDef {
  /** Stable card id — matches the `?tab=` deep-link value and ProfileTab union. */
  id: ProfileTab;
  /** NavStrip caption. */
  label: string;
  /** Active-pane Card. */
  body: () => JSX.Element;
  /** Suspense fallback shown while the Card's query resolves. */
  fallback: () => JSX.Element;
  /**
   * Warm the query this Card reads via createAsync. Same fn + same args as the
   * Card's own call — that identity is the whole point. `season` is passed to
   * every preload; tabs whose query ignores it simply don't use it.
   */
  preload: (sport: string, type: EntityType, id: string, season: number | null) => void;
  /**
   * Optional entity-type gate. Returns true if this tab should appear for the
   * given entity type. Omitted → shown for every entity type. ContentShell
   * filters the nav + panes through this against the profile's type.
   */
  showFor?: (type: EntityType) => boolean;
  /** View controls this card surfaces in the <ScopeStrip>. Omitted → none. */
  controls?: readonly CardControl[];
}

export const CARD_REGISTRY: ReadonlyArray<CardDef> = [
  {
    id: "composite",
    label: "Composite",
    body: () => <CompositeCard />,
    fallback: () => <CompositeCardSkeleton />,
    // Regular|Fantasy model (players, fantasy sports), Per-X (players), cohort scope
    // (position / conference / division / league), season, and Compare (players →
    // side-by-side vs another entity).
    controls: ["model", "rate", "scope", "season", "compare"],
    // The Composite card + the ContentShell control strip + the meta row read the
    // stats product (season rating) — query() dedupes them to one fetch.
    preload: (sport, type, id, season) => void getStats(sport, type, id, season),
  },
  {
    id: "sigil",
    label: "Sigil",
    body: () => <SigilCard />,
    fallback: () => <SigilCardSkeleton />,
    // Per-X re-picks the peak skill; scope doesn't apply (the sigil is positionless).
    controls: ["rate", "season"],
    preload: (sport, type, id, season) => void getSigil(sport, type, id, season),
  },
  {
    id: "trends",
    label: "Trends",
    body: () => <TrendsCard />,
    fallback: () => <TrendsCardSkeleton />,
    controls: ["season"],
    // The season sparkline (rating + vibe). Reads stats (rating line via events) +
    // trends (vibe line). Warm both.
    preload: (sport, type, id, season) => {
      void getStats(sport, type, id, season);
      void getTrends(sport, type, id, season);
    },
  },
  {
    id: "vibes",
    label: "Vibes",
    body: () => <VibeCard />,
    fallback: () => <VibeCardSkeleton />,
    // The vibes product — also read by the meta corner score (query() dedupes).
    preload: (sport, type, id) => void getVibes(sport, type, id),
  },
  {
    id: "news",
    label: "News",
    body: () => <NewsCard />,
    fallback: () => <NewsCardSkeleton />,
    // The news product — narratives only (transfers are their own product/card).
    preload: (sport, type, id) => void getNews(sport, type, id),
  },
  // Leaderboard retired as a profile tab 2026-06-04 — it now lives on the
  // dedicated /leaderboard page (reached via the home chevron + hamburger link).
  {
    id: "roster",
    label: "Roster",
    body: () => <RosterCard />,
    fallback: () => <RosterCardSkeleton />,
    // Team entities only — the profile id IS the team id.
    showFor: (type) => type === "team",
    controls: ["season"],
    preload: (sport, _type, id, season) => void getRoster(sport, id, season),
  },
  {
    id: "transfers",
    label: "Transfers",
    // ANY entity — a team's incoming/outgoing players + a player's interested clubs
    // (the old team-only "Transfers" + player-only "Suitors" split is unified here).
    // Tab label is sport-aware ("Transfers" / "Trades") via transferNoun in ContentShell.
    body: () => <TransfersCard />,
    fallback: () => <TransfersCardSkeleton />,
    // The transfers product (the vetted rumor heat list — pre-narrative data).
    preload: (sport, type, id) => void getTransfers(sport, type, id),
  },
];
