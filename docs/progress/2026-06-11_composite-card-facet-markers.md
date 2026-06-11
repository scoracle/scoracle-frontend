# Composite card: Offense/Defense marker at top, drop per-card rating readout

**Date:** 2026-06-11
## Goal
On team profiles the two facet pizzas each repeated the overall rating at the foot (and it
fell back to the overall rating because `rating_categories` is null), reading as a duplicate
of the meta-header rating chip. Move a facet marker to the top so users can tell the pizzas
apart, and drop the redundant readout.
## What was done
- `CompositeCard.tsx`: each facet card now shows its **facet label (Offense/Defense) at the
  TOP**, but only for multi-facet entities (teams) — a single-pizza player card stays clean.
  The per-card rating footer is dropped in Regular mode (the rating lives in the meta chip).
  **Fantasy mode keeps its points headline** at the foot. Removed the now-dead `cardScore` /
  `catPct` helpers.
## Verification
- `npm run typecheck` clean; `npm test` 119/119; build clean; deployed.
## Result
Team profiles read clearly — "Offense" / "Defense" label each pizza, no duplicate rating.
