/**
 * Profile context — entity params + tab state for the /profile route.
 *
 * The route reads `useSearchParams` once and provides the values here.
 * Every descendant (EntityMeta, ContentShell, every Card) reads via
 * `useProfile()` instead of touching `window.location.search` at
 * component setup. That removes the SSR boundary that previously forced
 * the cards into `clientOnly()` wrappers.
 *
 * Tab state lifted to the route 2026-05-10 when the profile page split
 * from a three-Shell stack into the current two-Shell stack
 * (MetaShell + ContentShell). ContentShell renders the parent + child
 * <NavTabs> directly using these signals, and shows the matching Card
 * below.
 *
 * sport/type/id are captured-once values (the route is unmounted on
 * cross-entity navigation in practice — `SearchBar` does a hard
 * `window.location.href` swap; the outer keyed `<Show>` in profile.tsx
 * remounts ProfileBody on entity change).
 */
import { createContext, useContext, type Accessor, type Setter } from "solid-js";
import type { EntityType } from "../lib/types";

export type ProfileMode = "news" | "stats";
export type NewsSubTab = "news" | "x" | "vibes";
export type StatsSubTab = "stats" | "traits" | "compare";
/**
 * Percentile comparison scope. `all` = sport-wide (position-partitioned).
 * `scoped` = position × conference (NBA/NFL) or position × league (Football).
 * Shared across Stats / Traits / Compare so the user's choice persists
 * across stats-mode subtabs.
 */
export type PercentileScope = "all" | "scoped";

export interface ProfileContextValue {
  /** Lowercase sport id, e.g. "nba". */
  sport: string;
  /** Entity discriminator. */
  type: EntityType;
  /** Entity id from the URL. */
  id: string;
  /** Active parent tab — News or Stats. */
  mode: Accessor<ProfileMode>;
  setMode: Setter<ProfileMode>;
  /** Active child tab when mode === "news". */
  newsSubTab: Accessor<NewsSubTab>;
  setNewsSubTab: Setter<NewsSubTab>;
  /** Active child tab when mode === "stats". */
  statsSubTab: Accessor<StatsSubTab>;
  setStatsSubTab: Setter<StatsSubTab>;
  /** Selected percentile comparison scope (shared across stats subtabs). */
  percentileScope: Accessor<PercentileScope>;
  setPercentileScope: Setter<PercentileScope>;
}

export const ProfileContext = createContext<ProfileContextValue>();

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile() called outside <ProfileContext.Provider>");
  }
  return ctx;
}
