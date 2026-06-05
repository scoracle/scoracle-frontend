# 2026-06-04 — Header scrollbar-gap fix + leaderboard nav (hamburger link, drop profile tab)

## Goal

Three small follow-ups now that the dedicated `/leaderboard` page exists:
(#21) kill the gap on the right of the dark header on no-scrollbar pages; (A) add a
Leaderboard link to the hamburger menu; (B) drop the leaderboard tab from the profile page.

## What Was Done

- **Header gap (#21).** Root cause: `html { scrollbar-gutter: stable }` reserved a ~15px
  gutter; the dark sticky header (`width:100%`) stopped at the content box, so on pages
  with no scrollbar the reserved gutter showed the cream page bg as a strip to the bar's
  right. Removed the reservation — the header now collapses to the content width when a
  scrollbar appears and reaches the window edge when it doesn't (clean in both states,
  home button stays correctly positioned). Documented the accepted trade-off in
  `global.css` (centered content nudges ~half a scrollbar width when an in-place height
  change toggles the scrollbar — rare since CoMentionsCard was retired; home never shifts).
  Chosen by Scott over the always-show-scrollbar alternative.
- **(A) Hamburger Leaderboard link.** Added a `Leaderboard` entry (bar-chart icon) to the
  header menu, after Home. Links to `/leaderboard` — the route defaults to the Rating
  (composite) board and reads the current sport from the `$currentSport` store.
- **(B) Dropped the profile leaderboard tab.** Removed the `leaderboard` entry (and its
  imports) from `CARD_REGISTRY`; removed `leaderboard` from `VALID_TABS` and aliased
  `?tab=leaderboard` → `composite` so old deep links still land. Deleted the now-orphaned
  `LeaderboardCard.tsx`. `leaderboard` stays a `CardId`/`ProfileTab` value (its share/OG
  identity for the dedicated page, task #16) but is no longer a rendered tab.

## Files Changed

`global.css`, `components/solid/Header.tsx`, `components/solid/Header.css` (revert),
`components/solid/card-registry.tsx`, `lib/utils/profile-tabs.ts`,
`components/solid/LeaderboardCard.tsx` (deleted), and the two guard tests
(`routes/profile-preload.test.ts`, `lib/utils/profile-tabs.test.ts`).

## Verification

`typecheck` clean; `npm test` 97/97 (updated the two guards to reflect leaderboard as a
non-tab CardId). Real worker (`cf:dev`) + Playwright: home header `right == innerWidth`
(dark bar to the edge, no gap), no horizontal scroll; hamburger shows
`Home · Leaderboard · Terms · Privacy` (→ `/leaderboard`); player profile tabs are
`General · Special · Trends · Vibe · News` — no Leaders.

## Result

The dark header reaches the edge cleanly with no scrollbar; the leaderboard is reachable
from the hamburger; the profile page no longer carries a redundant leaderboard tab.
