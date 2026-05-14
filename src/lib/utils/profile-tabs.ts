/**
 * profile-tabs — pure helpers for the profile route's tab state.
 *
 * `deriveInitialTabs` translates the optional `?tab=` URL param into
 * the initial `mode / newsSubTab / statsSubTab` signal values. Pulled
 * out of `routes/profile.tsx` so vitest can exercise every branch
 * without spinning up a route — and so future preload helpers that
 * care about the active tab share the same parsing.
 *
 * The accepted tab values mirror the `NewsSubTab` and `StatsSubTab`
 * unions from `~/contexts/profile.ts` and the `ShareTab` union from
 * `~/lib/utils/share-url.ts`.
 */

import type {
  ProfileMode,
  NewsSubTab,
  StatsSubTab,
} from "../../contexts/profile";

export interface InitialTabs {
  mode: ProfileMode;
  newsSubTab: NewsSubTab;
  statsSubTab: StatsSubTab;
}

const DEFAULTS: InitialTabs = {
  mode: "news",
  newsSubTab: "news",
  statsSubTab: "stats",
};

/**
 * Translate the optional `?tab=` URL param into initial-state signals
 * for ProfileContext. Missing or unrecognized values fall through to
 * the locked defaults.
 */
export function deriveInitialTabs(tabParam: string | undefined): InitialTabs {
  const tab = (tabParam ?? "").toLowerCase();
  switch (tab) {
    case "news":
    case "x":
    case "vibes":
      return { mode: "news", newsSubTab: tab, statsSubTab: "stats" };
    case "stats":
    case "traits":
    case "compare":
      return { mode: "stats", newsSubTab: "news", statsSubTab: tab };
    default:
      return { ...DEFAULTS };
  }
}
