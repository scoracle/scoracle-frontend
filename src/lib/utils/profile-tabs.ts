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
  "news",
  "x",
  "vibes",
  "trends",
  "stats",
  "traits",
  "compare",
]);

const DEFAULT_TAB: ProfileTab = "news";

/**
 * Translate the optional `?tab=` URL param into the initial `activeTab`
 * value. Missing or unrecognized values fall back to the locked default
 * ("news").
 */
export function deriveInitialTab(tabParam: string | undefined): ProfileTab {
  const tab = (tabParam ?? "").toLowerCase() as ProfileTab;
  return VALID_TABS.has(tab) ? tab : DEFAULT_TAB;
}
