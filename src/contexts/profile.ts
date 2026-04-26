/**
 * Profile context — entity params + view state for the /profile route.
 *
 * The route reads `useSearchParams` once and provides the values here.
 * Every descendant (EntityMeta, NewsCard, StatsCard, every tab) reads via
 * `useProfile()` instead of touching `window.location.search` at component
 * setup. That removes the SSR boundary that previously forced the cards
 * into `clientOnly()` wrappers.
 *
 * sport/type/id are captured-once values (the route is unmounted on
 * cross-entity navigation in practice — `SearchBar` does a hard
 * `window.location.href` swap). `view` is a signal because the toggle
 * flips it during a session.
 */
import { createContext, useContext, type Accessor } from "solid-js";
import type { EntityType } from "../lib/types";

export interface ProfileContextValue {
  /** Lowercase sport id, e.g. "nba". */
  sport: string;
  /** Entity discriminator. */
  type: EntityType;
  /** Entity id from the URL. */
  id: string;
  /** Current card view ("news" or "stats"). */
  view: Accessor<"news" | "stats">;
  /** Flip the card. Updates `view` and persists `?view=stats` to the URL. */
  setView: (v: "news" | "stats") => void;
}

export const ProfileContext = createContext<ProfileContextValue>();

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile() called outside <ProfileContext.Provider>");
  }
  return ctx;
}
