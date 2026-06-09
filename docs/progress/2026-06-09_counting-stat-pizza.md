# 2026-06-09 — Counting-stat pizza (Phase 3)

## Goal
Render the per-position counting-stat template (backend migration 047) on the Composite
card for NFL offensive skill players — real stats (QB: attempts/yards/TDs/INTs/rush) with
within-position percentiles — while every other position/sport keeps the z-score pizza.

## What Was Done
- `src/lib/data/sparkline.server.ts`: `TemplateStat` type + `template: Record<RateMode,
  TemplateStat[]> | null` on `SparklineRating` + `templateForMode(r, mode)` (falls back to
  the default template; null when the position has none).
- `src/components/solid/CompositeCard.tsx`: new `pizzaGroups()` chooses the pizza source —
  `templateForMode(rating, rateMode)` → ONE counting-stat pizza (NFL offense), else the
  existing facet-grouped z-score pizzas (NBA / football / NFL defense / teams). Template
  wedges are within-position, so the cohort-scope selector affects only the headline. The
  Regular/Fantasy headline branch (Phase 2) is unchanged — slices stay the same in both
  modes. Discipline/squad chips suppressed when a template is active.

## Files Changed
- `src/lib/data/sparkline.server.ts`, `src/lib/data/sparkline.test.ts` (template fixture + 3 tests)
- `src/components/solid/CompositeCard.tsx`

## Verification
- `npm run typecheck` clean; `npm test` 117 passed. Backend template_block validated on
  prod (Josh Allen QB: att/yds/TDs/INT(inverted)/rush). Deployed (Worker `35d98529`);
  prod API serves the QB template, NBA/Safety null; live QB profile 200.

## Result
NFL offensive skill players now show a real counting-stat pizza (the headline still flips
z-rating ↔ fantasy points via the Model selector). NBA/football/NFL-defense keep their
z-score wheels untouched. Compare-view templates + share-card OG are follow-ons.
