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
 * sport/type/id are captured-once values (the route is unmounted on
 * cross-entity navigation in practice — `SearchBar` does a hard
 * `window.location.href` swap; the outer keyed `<Show>` in profile.tsx
 * remounts ProfileBody on entity change).
 */
import { createContext, useContext, type Accessor, type Setter } from "solid-js";
import type { EntityType } from "../lib/types";

export type ProfileTab =
  | "news"
  | "vibes"
  | "trends"
  | "stats"
  | "traits";

/**
 * Percentile comparison scope. `all` = sport-wide (position-partitioned).
 * `scoped` = position × conference (NBA/NFL) or position × league (Football).
 * Shared across Stats / Traits so the user's choice persists as they
 * flip between those cards (Stats also drives the in-card compare view).
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
  /**
   * Selected season. `null` means "let the backend serve the entity's
   * most recent season"; numeric values must come from a stats response's
   * `meta.available_seasons` to be guaranteed valid. Setter syncs to
   * `?season=` on the URL so reload + share preserve selection.
   */
  season: Accessor<number | null>;
  setSeason: (next: number | null) => void;
}

export const ProfileContext = createContext<ProfileContextValue>();

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile() called outside <ProfileContext.Provider>");
  }
  return ctx;
}
