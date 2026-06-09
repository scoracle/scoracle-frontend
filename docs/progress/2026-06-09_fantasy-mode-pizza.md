# 2026-06-09 — Regular/Fantasy toggle swaps the pizza datapoints

## Goal
Make the Regular | Fantasy selector work like the other scope selectors: **Regular**
(default) shows the z-stat pizza; **Fantasy** shows the fantasy datapoints on the pizza —
so a user can flip between the house z-rating and standard fantasy scoring and see the
difference per stat.

## What Was Done (CompositeCard.tsx)
- The counting-stat `template` is now the **Fantasy-mode pizza**: `template()` returns a
  value only when `ctx.scoreModel() === "fantasy"`. Regular always renders the z-datapoint
  pizza (the prior Phase-3 behavior of showing the NFL template in *both* modes is gone).
- So: Regular → z-stats pizza (all sports). Fantasy → fantasy datapoints — NBA's DraftKings
  components (pts/reb/ast/stl/blk/3PM/turnover, backend migration 053) and NFL offensive-
  skill per-position counting stats (047); NFL defense / no-template positions fall back to
  the z-pizza. The fantasy pizza is labeled "Fantasy".
- The headline still follows the selector (Phase 2): Regular = z-composite rank; Fantasy =
  fantasy points + rank. So the toggle swaps headline + pizza together.

## Files Changed
- `src/components/solid/CompositeCard.tsx`

## Verification
- `npm run typecheck` clean; `npm test` 119 passed. Backend 053 applied + verified on prod
  (Jokić fantasy datapoints in the sparkline `template` block; no Go restart needed —
  position_group is called by name). Deployed (Worker `4efe8b6b`); live NBA profile loads in
  both Regular and Fantasy.

## Result
NBA (and NFL) player cards now let you toggle the pizza between the house z-rating
datapoints and the standard fantasy scoring datapoints. Compare-view + OG share still render
the z-pizza (deferred follow-ons).
