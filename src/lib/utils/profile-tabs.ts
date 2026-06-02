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

// Compare folded into Stats (2026-05-28): an old `?tab=compare` deep
// link is no longer a valid tab, so it falls back to the default
// ("stats") below — where the compare view now lives. The `?vs=<id>`
// param the old link also carried is still read by the Stats card, so a
// shared comparison URL resolves to the same butterfly view.
const VALID_TABS: ReadonlySet<ProfileTab> = new Set<ProfileTab>([
  "stats",
  "news",
  "vibes",
  "traits",
  "trends",
  "leaderboard",
  "roster",
]);

const DEFAULT_TAB: ProfileTab = "stats";

/**
 * Translate the optional `?tab=` URL param into the initial `activeTab`
 * value. Missing or unrecognized values fall back to the locked default
 * ("stats") — the rated value is the platform's headline output, so
 * that's the surface we land users on.
 */
export function deriveInitialTab(tabParam: string | undefined): ProfileTab {
  const tab = (tabParam ?? "").toLowerCase() as ProfileTab;
  return VALID_TABS.has(tab) ? tab : DEFAULT_TAB;
}
