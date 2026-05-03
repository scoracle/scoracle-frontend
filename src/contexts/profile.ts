/**
 * Profile context — entity params for the /profile route.
 *
 * The route reads `useSearchParams` once and provides the values here.
 * Every descendant (EntityMeta, ProfileCard, every tab) reads via
 * `useProfile()` instead of touching `window.location.search` at component
 * setup. That removes the SSR boundary that previously forced the cards
 * into `clientOnly()` wrappers.
 *
 * sport/type/id are captured-once values (the route is unmounted on
 * cross-entity navigation in practice — `SearchBar` does a hard
 * `window.location.href` swap; the outer keyed `<Show>` in profile.tsx
 * remounts ProfileBody on entity change).
 */
import { createContext, useContext } from "solid-js";
import type { EntityType } from "../lib/types";

export interface ProfileContextValue {
  /** Lowercase sport id, e.g. "nba". */
  sport: string;
  /** Entity discriminator. */
  type: EntityType;
  /** Entity id from the URL. */
  id: string;
}

export const ProfileContext = createContext<ProfileContextValue>();

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile() called outside <ProfileContext.Provider>");
  }
  return ctx;
}
