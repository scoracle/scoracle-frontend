# 2026-06-07 — /leaderboard Transfers board: tap-to-expand Gemma blurb

## Goal

Bring the profile Transfers tab's expand affordance to the dedicated `/leaderboard`
Transfers board, so users can read Gemma's grounded rumor blurb there too.

## What Was Done

- `leaderboard.tsx`: `DisplayRow` gains an optional `blurb`; the transfers mapping sets it
  from `gemma_summary`. Rows with a blurb render a `⌄` chevron toggle (an extra grid column)
  and, when open, the full blurb beneath the row (spanning from the name column).
  Open state is a `Set<number>` keyed by rank, with `toggleBlurb`/`isBlurbOpen`; a
  `createEffect(on(data, …))` collapses everything when the board/sport/type switches
  (ranks would otherwise point at different rumors).
- `leaderboard.css`: `.lb-row-expandable` adds the chevron column; `.lb-row-blurb-toggle` +
  `.lb-chevron` (rotates when open); `.lb-row-blurb` wraps the summary under the name.
  Renamed the row blurb class to `.lb-row-blurb` to avoid colliding with the page's existing
  `.lb-blurb` board subtitle.

## Files Changed

`routes/leaderboard.tsx`, `routes/leaderboard.css`.

## Verification

`typecheck` clean; `npm test` 97/97. Real worker + Playwright: transfers board shows 48
chevrons; clicking one expands exactly that row to the real Gemma blurb ("Multiple sources
report that Arsenal is in a transfer race to sign Eli Junior Kroupi…"); the Rating board has
0 chevrons; zero console errors.

## Result

The transfers leaderboard rows expand to reveal Gemma's blurb, matching the profile
Transfers tab. Other boards are unaffected (no blurb → no toggle).
