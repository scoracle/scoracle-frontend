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

import StatsCard, { StatsCardSkeleton } from "./StatsCard";
import TrendsCard, { TrendsCardSkeleton } from "./TrendsCard";
import VibeCard, { VibeCardSkeleton } from "./VibeCard";
import TraitsCard, { TraitsCardSkeleton } from "./TraitsCard";
import NewsCard, { NewsCardSkeleton } from "./NewsCard";
import CompareCard, { CompareCardSkeleton } from "./CompareCard";

import { getStats } from "../../lib/data/stats.server";
import { getTrends } from "../../lib/data/trends.server";
import { getVibe } from "../../lib/data/vibe.server";
import { getNewsFeed } from "../../lib/data/news-feed.server";

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
}

export const PROFILE_TABS: ReadonlyArray<ProfileTabSpec> = [
  {
    id: "stats",
    label: "Stats",
    body: () => <StatsCard />,
    fallback: () => <StatsCardSkeleton />,
    preload: (sport, type, id, season) => void getStats(sport, type, id, season),
  },
  {
    id: "trends",
    label: "Trends",
    body: () => <TrendsCard />,
    fallback: () => <TrendsCardSkeleton />,
    preload: (sport, type, id, season) => void getTrends(sport, type, id, season),
  },
  {
    id: "vibes",
    label: "Vibes",
    body: () => <VibeCard />,
    fallback: () => <VibeCardSkeleton />,
    preload: (sport, type, id) => void getVibe(sport, type, id),
  },
  {
    id: "traits",
    label: "Traits",
    body: () => <TraitsCard />,
    fallback: () => <TraitsCardSkeleton />,
    preload: (sport, type, id, season) => void getStats(sport, type, id, season),
  },
  {
    id: "news",
    label: "News",
    body: () => <NewsCard />,
    fallback: () => <NewsCardSkeleton />,
    preload: (sport, type, id) => void getNewsFeed(sport, type, id),
  },
  {
    id: "compare",
    label: "Compare",
    body: () => <CompareCard />,
    fallback: () => <CompareCardSkeleton />,
    preload: (sport, type, id, season) => void getStats(sport, type, id, season),
  },
];

/** NavStrip items derived from the registry — same order, no second list. */
export const PROFILE_NAV_ITEMS: ReadonlyArray<{ id: ProfileTab; label: string }> =
  PROFILE_TABS.map((t) => ({ id: t.id, label: t.label }));
