/**
 * profile-tabs — pure helpers for the profile route's tab state.
 *
 * `deriveInitialTab` translates the optional `?tab=` URL param into
 * the initial value of the `activeTab` signal. Pulled out of
 * `routes/profile.tsx` so vitest can exercise every branch without
 * spinning up a route — and so future preload helpers that care
 * about the active tab share the same parsing.
 *
 * The accepted values mirror `ProfileTab` from `~/contexts/profile.ts`
 * and `ShareTab` from `~/lib/utils/share-url.ts`.
 */

import type { ProfileTab } from "../../contexts/profile";

const VALID_TABS: ReadonlySet<ProfileTab> = new Set<ProfileTab>([
  "composite",
  "specialist",
  "starline",
  "vibes",
  "news",
  "leaderboard",
  "roster",
]);

const DEFAULT_TAB: ProfileTab = "composite";

// Backward-compat for tab ids retired in the 2026-06-02 profile reframe, so old
// `?tab=` deep links + share URLs still land somewhere sensible:
//   stats   → composite  (the rating engine's datapoints replaced the stats pizza)
//   trends  → starline   (the unified rating+vibe sparkline, renamed)
//   traits  → composite  (Traits dropped; fold to the default)
//   compare → composite  (compare was folded into Stats earlier; now composite)
const TAB_ALIASES: Record<string, ProfileTab> = {
  stats: "composite",
  trends: "starline",
  traits: "composite",
  compare: "composite",
};

/**
 * Translate the optional `?tab=` URL param into the initial `activeTab` value.
 * Retired ids are aliased forward; anything else unrecognized falls back to the
 * locked default ("composite") — the rating engine's Composite is the headline.
 */
export function deriveInitialTab(tabParam: string | undefined): ProfileTab {
  const raw = (tabParam ?? "").toLowerCase();
  const tab = (TAB_ALIASES[raw] ?? raw) as ProfileTab;
  return VALID_TABS.has(tab) ? tab : DEFAULT_TAB;
}
