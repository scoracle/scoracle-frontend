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
export type CardControl = "model" | "rate" | "scope" | "season" | "compare" | "newsScope";

import StatsCard, { StatsCardSkeleton } from "./StatsCard";
import RatingCard, { RatingCardSkeleton } from "./RatingCard";
import MomentumCard, { MomentumCardSkeleton } from "./MomentumCard";
import SigilCard, { SigilCardSkeleton } from "./SigilCard";
import NewsCard, { NewsCardSkeleton } from "./NewsCard";
import RosterCard, { RosterCardSkeleton } from "./RosterCard";
// TransfersCard is no longer a standalone tab — it renders inside NewsCard as a
// selectable scope (dropdown). The "transfers" CardId survives for the /leaderboard
// board + CARD_META/OG; the profile just has no Transfers tab.

import { getMomentum } from "../../lib/data/momentum.server";
import { getStats } from "../../lib/data/stats.server";
import { getRating } from "../../lib/data/rating.server";
import { getNews } from "../../lib/data/news.server";
import { getTransfers } from "../../lib/data/transfers.server";
import { getSigil } from "../../lib/data/sigil.server";
import { getRoster } from "../../lib/data/roster.server";

export interface CardDef {
  /** Stable card id — matches the `?tab=` deep-link value and ProfileTab union. */
  id: ProfileTab;
  /** NavStrip caption. */
  label: string;
  /** Active-pane Card. */
  body: () => JSX.Element;
  /** Suspense fallback shown while the Card's data is in flight */
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
    id: "stats",
    label: "Stats",
    body: () => <StatsCard />,
    fallback: () => <StatsCardSkeleton />,
    // Regular|Fantasy model (players, fantasy sports), Per-X (players), cohort scope
    // (position / conference / division / league), season, and Compare (players →
    // side-by-side vs another entity).
    controls: ["model", "rate", "scope", "season", "compare"],
    // The Stats card (composite + scopes) + the ContentShell control strip + the meta
    // row read the stats product — query() dedupes them to one fetch.
    preload: (sport, type, id, season) => void getStats(sport, type, id, season),
  },
  {
    id: "rating",
    label: "Rating",
    body: () => <RatingCard />,
    fallback: () => <RatingCardSkeleton />,
    // Rating = the statistical rail's end product: the positionless magnitude score +
    // a strengths blurb (Gemma's read). Per-X re-picks the peak skill; scope doesn't apply.
    controls: ["rate", "season"],
    preload: (sport, type, id, season) => void getRating(sport, type, id, season),
  },
  {
    id: "news",
    label: "News",
    body: () => <NewsCard />,
    fallback: () => <NewsCardSkeleton />,
    // News = the narratives, with Transfers as a selectable scope (dropdown). Warm
    // both products so the scope flip is instant.
    controls: ["newsScope"],
    preload: (sport, type, id) => {
      void getNews(sport, type, id);
      void getTransfers(sport, type, id);
    },
  },
  {
    id: "momentum",
    label: "Trends",
    body: () => <MomentumCard />,
    fallback: () => <MomentumCardSkeleton />,
    controls: ["season"],
    // Momentum = the rating trajectory + the vibe trajectory. Reads stats (rating line
    // via events) + momentum (vibe line). Warm both.
    preload: (sport, type, id, season) => {
      void getStats(sport, type, id, season);
      void getMomentum(sport, type, id, season);
    },
  },
  {
    id: "sigil",
    label: "Sigil",
    body: () => <SigilCard />,
    fallback: () => <SigilCardSkeleton />,
    // The Sigil — the crown synthesis (Rating + Vibe + Momentum). Also read by the
    // meta centre score (query() dedupes).
    preload: (sport, type, id) => void getSigil(sport, type, id),
  },
  // Leaderboard retired as a profile tab 2026-06-04 — it now lives on the dedicated
  // /leaderboard page. Transfers folded into News as a scope (above).
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
];
