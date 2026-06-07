/**
 * Profile context — entity params + active tab for the /profile route.
 *
 * The route reads `useSearchParams` once and provides the values here.
 * Every descendant (EntityMeta, ContentShell, every Card) reads via
 * `useProfile()` instead of touching `window.location.search` at
 * component setup. That removes the SSR boundary that previously forced
 * the cards into `clientOnly()` wrappers.
 *
 * Flat nav model — locked 2026-05-14 (Compare folded into Stats 2026-05-28):
 * ContentShell renders ONE `<NavStrip>` strip over five sibling panes
 * (Stats / Trends / Vibes / Traits / News; Stats is the default landing
 * tab). The News pane is a unified feed of articles + tweets. Compare is
 * no longer its own tab — the Stats card carries the compare search +
 * butterfly charts. State is a single `activeTab` signal here.
 *
 * sport/type/id are REACTIVE accessors (they read the URL search params).
 * Cross-entity navigation is client-side (`SearchBar` calls `navigate()`),
 * so the route component stays mounted; reading the params reactively means
 * every Card's `createAsync` re-fetches on entity change with no remount —
 * which removes the old keyed-`<Show>`-remount that raced during hydration
 * and intermittently blanked the page on direct/shared-link loads.
 */
import { createContext, useContext, type Accessor, type Setter } from "solid-js";
import type { EntityType } from "../lib/types";

export type ProfileTab =
  | "news"
  | "vibes"
  | "trends"
  | "composite"
  | "specialist"
  | "leaderboard"
  | "roster"
  | "transfers";

/**
 * Percentile comparison scope. `all` = sport-wide (position-partitioned).
 * `scoped` = position × conference (NBA/NFL) or position × league (Football).
 * Shared across Stats / Traits so the user's choice persists as they
 * flip between those cards (Stats also drives the in-card compare view).
 */
export type PercentileScope = "all" | "scoped";

/**
 * Rating scope (cohort re-rank). "all" = positionless rating_composite_rank;
 * the others re-rank the composite WITHIN the cohort (from rating_scoped_ranks):
 * position (players); conference / division (NBA/NFL teams); league (football
 * teams). Applies to Composite + Leaders only.
 */
export type RatingScope = "all" | "position" | "conference" | "division" | "league";

/**
 * Per-X rate mode (PLAYERS). "default" = season totals (the rating_* columns;
 * for NBA those are already per-game). The alternates re-rate within the per-X
 * population (backend migration 042): NBA `per_36`, football `per_90`, NFL
 * `per_game`. URL-synced via `?rate=`; the Composite/Specialist cards switch
 * which rating_modes block they render. Teams have no rate mode.
 */
export type RateMode = "default" | "per_36" | "per_90" | "per_game";

export interface ProfileContextValue {
  /** Lowercase sport id, e.g. "nba". Reactive — reads the URL, so cards
   *  re-fetch when the user navigates to a different entity without a remount. */
  sport: Accessor<string>;
  /** Entity discriminator. Reactive (see `sport`). */
  type: Accessor<EntityType>;
  /** Entity id from the URL. Reactive (see `sport`). */
  id: Accessor<string>;
  /** Currently selected destination card. */
  activeTab: Accessor<ProfileTab>;
  setActiveTab: Setter<ProfileTab>;
  /** Selected percentile comparison scope (shared across stats cards). */
  percentileScope: Accessor<PercentileScope>;
  setPercentileScope: Setter<PercentileScope>;
  /**
   * Selected season. `null` means "let the backend serve the entity's
   * most recent season"; numeric values must come from a stats response's
   * `meta.available_seasons` to be guaranteed valid. Setter syncs to
   * `?season=` on the URL so reload + share preserve selection.
   */
  season: Accessor<number | null>;
  setSeason: (next: number | null) => void;
  /** Selected rating scope (cohort re-rank); URL-synced via `?scope=`. */
  scope: Accessor<RatingScope>;
  setScope: (next: RatingScope) => void;
  /** Selected per-X rate mode (players); URL-synced via `?rate=`. "default" = totals. */
  rateMode: Accessor<RateMode>;
  setRateMode: (next: RateMode) => void;
  /** Compare-target entity id; URL-synced via `?vs=`. null = no comparison. When
   *  set, the Composite renders this entity beside the primary. */
  vs: Accessor<string | null>;
  setVs: (next: string | null) => void;
}

export const ProfileContext = createContext<ProfileContextValue>();

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile() called outside <ProfileContext.Provider>");
  }
  return ctx;
}
