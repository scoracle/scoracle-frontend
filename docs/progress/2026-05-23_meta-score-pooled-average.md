# 2026-05-23 — Meta Overall score: pool all percentiles, not mean-of-means

## Goal

The EntityMeta headline score was computed as `mean(category-means)` —
each chart-slot category contributed its own internal average, then
those category averages got averaged. That over-weights small
categories: a 3-stat Discipline slot counted exactly as much as an
8-stat Possession slot, biasing the headline toward whichever
categories happened to have the fewest data points.

Switching to a pooled average — every percentile-having data point in
every populated category contributes equally toward one mean — gives a
more comprehensive score that reflects the player's full stat universe
rather than how the categories happen to be sized.

## What Was Done

`src/components/solid/EntityMeta.tsx`:
- The `overallScore` memo no longer pushes per-category means into a
  `catAverages` array. Instead it accumulates `sum` and `count` across
  every `s.percentile != null` data point in every category, then
  returns `Math.round(sum / count)`.
- Threshold becomes `count < 2 → null` (need at least 2 percentile
  data points across the whole entity to publish a score). Previously
  the threshold was per-category (`count >= 2` inside each category to
  contribute) which could keep noisy categories from polluting the
  result; under the pooled approach the entity needs at least 2
  percentiled points anywhere.
- Updated the leading comment to describe pooling + when it differs
  from the per-card score.

## Behavior delta

- **NFL position-aware players** (QB, WR/TE, RB, defenders, special
  teams): `categorizeForCharts` returns a single position-specific
  category. Mean-of-means with one category is the same number as
  pool-then-mean. **No change** — meta still equals the positional
  pizza's Overall score.
- **NBA / football players, all teams**: multiple categories with
  varying stat counts. The headline shifts to reflect each data
  point's contribution proportionally. A team with 8 attack stats
  and 3 discipline stats now weighs the attack stats ~2.7× more in
  the headline than each discipline stat — same as how every
  individual category card computes its own Overall score.

## Files Changed

- `src/components/solid/EntityMeta.tsx`

## Verification

- `npm run typecheck` — clean
- `npm test` — 131/131

UI not opened in the browser this commit.

## Result

Headline number reflects every percentile data point equally, not
each category equally. More comprehensive score, no silent
over-weighting of skinny categories.
