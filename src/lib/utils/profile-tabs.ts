/**
 * profile-tabs — pure helpers for the profile route's tab state.
 *
 * `deriveInitialTab` translates the optional `?tab=` URL param into
 * the initial value of the `activeTab` signal. Pulled out of
 * `routes/profile.tsx` so vitest can exercise every branch without
 * spinning up a route — and so future preload helpers that care
 * about the active tab share the same parsing.
 *
 * The accepted values mirror `ProfileTab` from `~/contexts/profile.ts`.
 */

import type { ProfileTab } from "../../contexts/profile";

const VALID_TABS: ReadonlySet<ProfileTab> = new Set<ProfileTab>([
  "stats",
  "rating",
  "news",
  "momentum",
  "sigil",
]);

export const DEFAULT_TAB: ProfileTab = "stats";

// Backward-compat for retired/renamed tab ids, so old `?tab=` deep links + share
// URLs still land somewhere sensible after the Sigil-convergence rename:
//   composite → stats     (the composite card is now "Stats")
//   vibes     → sigil      (the holistic synthesis is now the crown "Sigil")
//   trends/starline → momentum  (the rating+vibe trajectory)
//   traits/specialist → rating  (the statistical read is now "Rating")
//   transfers/suitors → news    (transfers folded into News as a scope)
//   compare/leaderboard → stats (compare lives on Stats; leaders → /leaderboard page)
// Note: `?tab=sigil` now lands on the crown Sigil (it previously meant the strength
// card, which is now "rating") — an accepted consequence of reusing the cleanest word.
const TAB_ALIASES: Record<string, ProfileTab> = {
  composite: "stats",
  vibes: "sigil",
  trends: "momentum",
  starline: "momentum",
  traits: "rating",
  specialist: "rating",
  transfers: "news",
  suitors: "news",
  roster: "stats",
  compare: "stats",
  leaderboard: "stats",
};

/**
 * Translate the optional `?tab=` URL param into the initial `activeTab` value.
 * Retired ids are aliased forward; anything else unrecognized falls back to the
 * locked default ("stats").
 */
export function deriveInitialTab(tabParam: string | undefined): ProfileTab {
  const raw = (tabParam ?? "").toLowerCase();
  const tab = (TAB_ALIASES[raw] ?? raw) as ProfileTab;
  return VALID_TABS.has(tab) ? tab : DEFAULT_TAB;
}
