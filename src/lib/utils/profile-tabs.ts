/**
 * profile-tabs — pure helpers for the profile route's tab state.
 *
 * `deriveInitialTab` translates the optional `?tab=` URL param into
 * the initial value of the `activeTab` signal. Pulled out of
 * `routes/profile/[sport]/[type]/[id].tsx` so vitest can exercise every branch without
 * spinning up a route — and so future preload helpers that care
 * about the active tab share the same parsing.
 *
 * The accepted values mirror `ProfileTab` from `~/contexts/profile.ts`.
 */

import type { ProfileTab } from "../../contexts/profile";

const VALID_TABS: ReadonlySet<ProfileTab> = new Set<ProfileTab>([
  "scouting",
  "profile",
  "narratives",
  "transfers",
  "vibe",
  "momentum",
  "sigil",
]);

export const DEFAULT_TAB: ProfileTab = "scouting";

// Backward-compat for retired/renamed tab ids, so old `?tab=` deep links + share
// URLs still land somewhere sensible after the Characters restructure (six peer
// cards, 2026-07-22):
//   stats/rating → scouting   (the Scout's one turn merges both cards)
//   composite/traits/specialist → scouting  (pre-Sigil-convergence ids, same fate)
//   compare/leaderboard/roster → scouting   (compare lives on Scouting; leaders → /leaderboard)
//   news → narratives          (the Journalist's card keeps the content, new name)
//   trends/starline → momentum (the rating+vibe trajectory)
//   vibes → sigil              (the pre-convergence synthesis id — unchanged mapping)
//   suitors → transfers        (the Insider's card is real now — better landing than News)
// Note `transfers` STOPS being an alias for news and becomes a real tab: old
// transfer deep links land on The Insider's actual card.
const TAB_ALIASES: Record<string, ProfileTab> = {
  stats: "scouting",
  rating: "scouting",
  composite: "scouting",
  traits: "scouting",
  specialist: "scouting",
  // Compare is a chart affair — it moved to the Profile card with the pizza
  // (the Scouting/Profile split, 2026-09-05).
  compare: "profile",
  leaderboard: "scouting",
  roster: "scouting",
  news: "narratives",
  trends: "momentum",
  starline: "momentum",
  vibes: "sigil",
  suitors: "transfers",
};

/**
 * Translate the optional `?tab=` URL param into the initial `activeTab` value.
 * Retired ids are aliased forward; anything else unrecognized falls back to the
 * locked default ("scouting").
 *
 * `newsViewParam` is the retired `?newsView=` News-hub facet (the route also
 * feeds the even older `?newsScope=transfers` shape through it): when an old
 * deep link lands on the News hub with the transfers or vibe facet selected,
 * it now lands on that character's real card. Facet promotion applies only when
 * the tab resolves to narratives — the facet rode the News hub, nowhere else.
 */
export function deriveInitialTab(
  tabParam: string | undefined,
  newsViewParam?: string | undefined,
): ProfileTab {
  const raw = (tabParam ?? "").toLowerCase();
  const tab = (TAB_ALIASES[raw] ?? raw) as ProfileTab;
  const resolved = VALID_TABS.has(tab) ? tab : DEFAULT_TAB;
  if (resolved === "narratives") {
    const view = (newsViewParam ?? "").toLowerCase();
    if (view === "transfers") return "transfers";
    if (view === "vibe") return "vibe";
  }
  return resolved;
}
