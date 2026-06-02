/**
 * Profile tab registry — the single source of truth for what tabs exist on
 * the profile page and everything each one needs.
 *
 * One descriptor per tab co-locates the four things that used to live in three
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

import CompositeCard, { CompositeCardSkeleton } from "./CompositeCard";
import SpecialistCard, { SpecialistCardSkeleton } from "./SpecialistCard";
import TrendsCard, { TrendsCardSkeleton } from "./TrendsCard";
import VibeCard, { VibeCardSkeleton } from "./VibeCard";
import NewsCard, { NewsCardSkeleton } from "./NewsCard";
import LeaderboardCard, { LeaderboardCardSkeleton } from "./LeaderboardCard";
import RosterCard, { RosterCardSkeleton } from "./RosterCard";
import TransfersCard, { TransfersCardSkeleton } from "./TransfersCard";

import { getTrends } from "../../lib/data/trends.server";
import { getStarline } from "../../lib/data/starline.server";
import { getVibe } from "../../lib/data/vibe.server";
import { getNewsFeed } from "../../lib/data/news-feed.server";
import { getLeaderboard } from "../../lib/data/leaderboard.server";
import { getRoster } from "../../lib/data/roster.server";
import { getTransfers } from "../../lib/data/transfers.server";

export interface ProfileTabSpec {
  /** Stable tab id — matches the `?tab=` deep-link value and ProfileTab union. */
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
}

export const PROFILE_TABS: ReadonlyArray<ProfileTabSpec> = [
  {
    id: "composite",
    label: "Composite",
    body: () => <CompositeCard />,
    fallback: () => <CompositeCardSkeleton />,
    // Composite, Specialist, Starline, and the meta row all read the starline
    // season rating — query() dedupes them to one fetch.
    preload: (sport, type, id, season) => void getStarline(sport, type, id, season),
  },
  {
    id: "specialist",
    label: "Specialist",
    body: () => <SpecialistCard />,
    fallback: () => <SpecialistCardSkeleton />,
    preload: (sport, type, id, season) => void getStarline(sport, type, id, season),
  },
  {
    id: "starline",
    label: "Starline",
    body: () => <TrendsCard />,
    fallback: () => <TrendsCardSkeleton />,
    // The unified rating + vibe season sparkline. Reads starline (composite +
    // specialist lines) + trends (vibe line). Warm both.
    preload: (sport, type, id, season) => {
      void getStarline(sport, type, id, season);
      void getTrends(sport, type, id, season);
    },
  },
  {
    id: "vibes",
    label: "Vibes",
    body: () => <VibeCard />,
    fallback: () => <VibeCardSkeleton />,
    preload: (sport, type, id) => void getVibe(sport, type, id),
  },
  {
    id: "news",
    label: "News",
    body: () => <NewsCard />,
    fallback: () => <NewsCardSkeleton />,
    preload: (sport, type, id) => void getNewsFeed(sport, type, id),
  },
  {
    id: "leaderboard",
    label: "Leaders",
    body: () => <LeaderboardCard />,
    fallback: () => <LeaderboardCardSkeleton />,
    // Sport-scoped board matching the profile's entity type; top 25, composite.
    preload: (sport, type, _id, season) =>
      void getLeaderboard(sport, type, undefined, season, 25),
  },
  {
    id: "roster",
    label: "Roster",
    body: () => <RosterCard />,
    fallback: () => <RosterCardSkeleton />,
    // Team entities only — the profile id IS the team id.
    showFor: (type) => type === "team",
    preload: (sport, _type, id, season) => void getRoster(sport, id, season),
  },
  {
    id: "transfers",
    label: "Transfers",
    body: () => <TransfersCard />,
    fallback: () => <TransfersCardSkeleton />,
    // Team entities only. Card renames "Transfers"→"Trades" for nba/nfl internally.
    showFor: (type) => type === "team",
    preload: (sport, _type, id) => void getTransfers(sport, id),
  },
];
