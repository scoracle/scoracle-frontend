# 2026-06-05 — Color-code the transfer verdict (stage) text

## Goal

Color the Gemma "verdict" stage on both transfer surfaces (the profile Transfers tab
and the /leaderboard Transfers board) on the site's green=hottest → red=coolest scale,
so the rumor stage reads at a glance.

## What Was Done

- New shared helper `lib/utils/transfer-stage.ts`: `transferStageLabel(stage)` and
  `transferStageColor(stage)`, plus `TRANSFER_STAGE_LABEL`. Stages map onto the standard
  tier palette (same tokens as ratings/vibes — blue "above" tier included, on-brand per
  Scott):
  - `speculation` → poor (red) · coolest
  - `concrete_interest` → average (gold)
  - `advanced_talks` → above (blue)
  - `here_we_go` → elite (green) · hottest
  - null/unknown → "Reported", neutral tertiary (no verdict yet).
- `TransfersCard` (profile tab): dropped the local `STAGE_LABEL`, render the stage in its
  own `.transfers-stage` span (tier color inline, medium weight); the rest of the blurb
  stays tertiary. Expand-on-tap behavior unchanged.
- `/leaderboard` Transfers board: added an optional `subAccent` to the unified `DisplayRow`
  (`{ text, color }`); transfers set it to the tier-colored stage and the row renders it as
  a colored chip after `team · direction`. Other boards leave it unset.

## Files Changed

`lib/utils/transfer-stage.ts` (new), `components/solid/TransfersCard.tsx`,
`components/solid/TransfersCard.css`, `routes/leaderboard.tsx`.

## Verification

`typecheck` clean; `npm test` 97/97. Real worker (`cf:dev`) + Playwright: leaderboard
Transfers board renders Speculation #a85252 (red), Concrete interest #c9a04a (gold),
Advanced talks #6b8fc7 (blue), Here we go #7a9b76 (green); profile Transfers tab colors the
stage identically. Zero console errors.

## Result

The transfer verdict reads green=closest-to-done, red=just-speculation across both surfaces,
in the same tier language as the rest of the site.
