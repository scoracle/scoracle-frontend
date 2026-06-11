# Teams keep the percentile rating; players keep magnitude; render Discipline facet

**Date:** 2026-06-11

## Goal

Magnitude rating reads great for players but percentile fits teams better (Scott's call —
teams live in a ranked league table; a percentile reads naturally there). So the composite
RATING display now branches on entity type. Also surface the new football team Discipline
datapoint (Yellow Cards, migration 068).

## What was done

- **Entity-type-conditional rating** — **team → percentile** (`rating_composite_rank` /
  `scoped_ranks` / `composite_rank`, colored by `tierColor`); **player → magnitude score**
  (`rating_composite_score` / `scoped_scores` / `composite_score`, colored by
  `tierColorScore`). Applied in:
  - `leaderboard.tsx` (composite board — branches on `r.entity_type`).
  - `CompositeCard.tsx` (headline + both compare-butterfly headlines — branch on
    `ctx.type()`; restored a `scopedRank` helper for teams).
  - `EntityMeta.tsx` (composite chip).
  - RosterCard untouched (its rows are players → magnitude).
- **Discipline facet** — `PIZZA_FACETS` gains `"discipline"` so the football team Yellow
  Cards pizza (and NFL penalty-yards datapoints) render. `FACET_LABEL` already had it.

## Files changed

- `src/routes/leaderboard.tsx`, `src/components/solid/CompositeCard.tsx`,
  `src/components/solid/EntityMeta.tsx`

## Verification

- `npm run typecheck` clean; `npm test` 119/119; build clean; deployed to Cloudflare.

## Result

Players carry the magnitude score that spreads by value; teams carry the percentile that
reads like a league rank. Football team profiles now show a Discipline pizza.
