/**
 * Profile context — entity params + active tab for the /profile route.
 *
 * The route reads `useSearchParams` once and provides the values here.
 * Every descendant (EntityMeta, ContentShell, every Card) reads via
 * `useProfile()` instead of touching `window.location.search` at
 * component setup. That removes the SSR boundary that previously forced
 * the cards into `clientOnly()` wrappers.
 *
 * Flat nav model — locked 2026-05-14:
 * ContentShell renders ONE `<NavStrip>` strip over six sibling panes
 * (Articles / X / Vibes / Stats / Traits / Compare). No parent
 * News/Stats grouping. State is a single `activeTab` signal here.
 *
 * sport/type/id are captured-once values (the route is unmounted on
 * cross-entity navigation in practice — `SearchBar` does a hard
 * `window.location.href` swap; the outer keyed `<Show>` in profile.tsx
 * remounts ProfileBody on entity change).
 */
import { createContext, useContext, type Accessor, type Setter } from "solid-js";
import type { EntityType } from "../lib/types";

export type ProfileTab =
  | "news"
  | "x"
  | "vibes"
  | "stats"
  | "traits"
  | "compare";

/**
 * Percentile comparison scope. `all` = sport-wide (position-partitioned).
 * `scoped` = position × conference (NBA/NFL) or position × league (Football).
 * Shared across Stats / Traits / Compare so the user's choice persists
 * as they flip between those cards.
 */
export type PercentileScope = "all" | "scoped";

export interface ProfileContextValue {
  /** Lowercase sport id, e.g. "nba". */
  sport: string;
  /** Entity discriminator. */
  type: EntityType;
  /** Entity id from the URL. */
  id: string;
  /** Currently selected destination card. */
  activeTab: Accessor<ProfileTab>;
  setActiveTab: Setter<ProfileTab>;
  /** Selected percentile comparison scope (shared across stats cards). */
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
