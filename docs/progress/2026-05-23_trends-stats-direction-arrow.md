# 2026-05-23 — TrendsCard Stats: bring back signed delta + direction arrow

## Goal

Make the Trends Stats section legible to a non-datahead. Pre-change a
row read `Tackle Success  494  vs 59.4` — values without a comparison
direction, often across mismatched units (Tottenham's season cumulative
tackles vs a per-match peer baseline). With the backend's migration 016
(`stat_definitions.unit` / `comparable`, trends statement now filtering
to comparable units and normalizing team cumulatives), the two sides
are finally on the same scale. Surface that as a signed % delta + a
direction arrow so the user can read trend direction + magnitude at a
glance, the way "15% higher tackle success vs peers" should read.

## What Was Done

`src/components/solid/TrendsCard.tsx`:

- New `formatDeltaPct(delta)` — signs +/- and rounds; sub-0.5%
  collapses to "0%".
- New `trendArrow(delta, inverted)` — `▲` when the move is in the
  good direction for the stat, `▼` when bad, empty string when too
  small to call. The good direction is positive for normal stats and
  negative for `inverted` ones (turnovers, fouls, etc.), driven by
  the existing `LOWER_IS_BETTER` set so the arrow always reinforces
  the tier color rather than fighting it.
- Stats row gains a fourth column: the delta indicator. The recent
  value is still tier-colored (existing behavior); the new delta is
  tier-colored too, so both signals point the same way. Two colored
  elements per row is intentional redundancy — direction encoded
  twice reads faster than direction encoded once.

`src/components/solid/TrendsCard.css`:

- `.trends-stat-row` grid extends from 3 → 4 columns.
- New `.trends-stat-delta` (tabular-nums, weight-medium, 0.82rem) and
  `.trends-stat-arrow` (tiny inline glyph) styles. Header comment
  rewritten to reflect the new row anatomy.

## Files Changed

- `src/components/solid/TrendsCard.tsx`
- `src/components/solid/TrendsCard.css`

## Verification

- `npm run typecheck` — clean
- `npm test` — 137/137
- Live `/trends` smoke: `GET /api/v1/football/team/18/trends`
  (Tottenham, 19-team cohort) now returns clean per-game-comparable
  pairs. Top movers:
    penalties               1.00 vs 0.12  +747%
    injuries                3.00 vs 0.95  +214%
    through_balls           2.00 vs 1.02   +96%
    blocked_shots           1.00 vs 3.77   −74%
    clearances             11.00 vs 27.5   −60%
  These are the kinds of signals a fan can act on: Spurs are
  penalty-prone, banged-up, creative through the middle, getting
  pinned in defensively. The presentation layer now matches the
  data layer's truthfulness.

UI not opened in the browser this commit. One known visual quirk
worth a follow-up if it bothers in practice: `+747%` off a tiny peer
baseline (0.12) reads as a giant outlier even though the math is
valid. Easy guard later — hide the % when peer < N, or cap display
at ±300% — wanted to see real-world rows first before tightening.

## Result

The Stats section is now a glanceable trend snapshot rather than a
pair of disconnected raw numbers. Direction (arrow) + magnitude
(signed %) + cohort baseline (vs N.NN) + the entity's own recent
value, all on one line, tier-colored to reinforce direction.
