# Leaderboard UI: Rankings launcher + transfers chevron placement

## Goal
Two leaderboard-navigation polish items: (1) the home-page leaderboard launcher
was a bare, stray-looking `⌄` glyph under the search box — give it a "Rankings"
label matching the site's scope-control look; and (2) on the leaderboard
transfers board, the per-row expand chevron dangled in a column to the *right* of
the HEAT score — move it beside the score like the TransfersCard row.

## What Was Done
- **Home launcher (LeaderboardMenu):** replaced the bare `⌄` trigger with a
  "Rankings" control that borrows Select's trigger styling (`.select-trigger` /
  `.select-value` / `.select-chevron`) — italic display label, CSS chevron,
  hairline underline — so it reads as one family with the leaderboard/profile
  scope Selects. Reused the *look*, not the Select component itself (Select is a
  listbox value-picker; this is a navigation menu via Disclosure + board
  NavStrip). Open state flips the chevron up. Also dropped the retired **News**
  entry from the dropdown's `BOARD_ITEMS` (the leaderboard News board was removed
  in `0541bec`).
- **Leaderboard transfers chevron:** moved the `.lb-row-blurb-toggle` button to
  render before the metric cell and reordered `.lb-row-expandable`'s grid columns
  (`… minmax(0, 1fr) 1.4rem auto`) so the chevron sits just left of the HEAT
  score instead of past it.

## Files Changed
- `src/components/solid/LeaderboardMenu.tsx` — Rankings trigger markup +
  `Select.css` import; News removed from `BOARD_ITEMS`; doc comment.
- `src/components/solid/LeaderboardMenu.css` — dropped the bare-glyph trigger
  rules; borrow `.select-*`; scope the open-state chevron flip + reduced-motion.
- `src/routes/leaderboard.tsx` — reorder the transfers expand-chevron before the
  metric cell.
- `src/routes/leaderboard.css` — `.lb-row-expandable` grid column reorder.

## Verification
- `npm run typecheck` — clean.
- Rendered live (Playwright against the dev server): home launcher shows
  "Rankings" with the italic label / underline / flipping chevron and a
  Rating · Vibes · Transfers rail (no News); leaderboard transfers board (47
  expandable rows) shows the chevron immediately left of each HEAT score, with
  expand/flip + blurb reveal working.

## Result
Home leaderboard launcher reads as a deliberate "Rankings" control matching the
scope-control idiom (News gone); transfers-board row chevron placed beside the
HEAT score like the TransfersCard.
