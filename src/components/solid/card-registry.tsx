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

import { getMomentum } from "../../lib/data/momentum.server";
import { getStats } from "../../lib/data/stats.server";
import { getRating } from "../../lib/data/rating.server";
import { getNews } from "../../lib/data/news.server";
import { getTransfers } from "../../lib/data/transfers.server";
import { getSigil } from "../../lib/data/sigil.server";
import { getRoster } from "../../lib/data/roster.server";

export interface CardDef {
  id: ProfileTab;
  label: string;
  body: () => JSX.Element;
  fallback: () => JSX.Element;
  preload: (sport: string, type: EntityType, id: string, season: number | null) => void;
  showFor?: (type: EntityType) => boolean;
  controls?: readonly CardControl[];
}

export const CARD_REGISTRY: ReadonlyArray<CardDef> = [
  {
    id: "stats",
    label: "Stats",
    body: () => <StatsCard />,
    fallback: () => <StatsCardSkeleton />,
    controls: ["model", "rate", "scope", "season", "compare"],
    preload: (sport, type, id, season) => void getStats(sport, type, id, season),
  },
  {
    id: "rating",
    label: "Rating",
    body: () => <RatingCard />,
    fallback: () => <RatingCardSkeleton />,
    controls: ["rate", "season"],
    preload: (sport, type, id, season) => void getRating(sport, type, id, season),
  },
  {
    id: "news",
    label: "News",
    body: () => <NewsCard />,
    fallback: () => <NewsCardSkeleton />,
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
    preload: (sport, type, id) => void getSigil(sport, type, id),
  },
  {
    id: "roster",
    label: "Roster",
    body: () => <RosterCard />,
    fallback: () => <RosterCardSkeleton />,
    showFor: (type) => type === "team",
    controls: ["season"],
    preload: (sport, _type, id, season) => void getRoster(sport, id, season),
  },
];
