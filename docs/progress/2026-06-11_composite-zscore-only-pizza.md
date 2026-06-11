# Composite pizza shows only the z-score (composite) metrics

**Date:** 2026-06-11

## Goal

"Display the z-score metrics" — the Composite pizza should render only the datapoints
that actually compose the rating, not display-only decoration. Pairs with backend
migration 063 (the football GK/outfield split): together they make the card an honest
window into what's rated.

## What was done

- **`CompositeCard.tsx`** — the `eligible` filter changes from
  `(d.in_comp || !d.in_spec)` to **`d.in_comp`**. Display-only datapoints (in_comp =
  FALSE — football Clearances / Blocks / Penalties Won, moved to display in migrations
  060–062) drop out of the pizza and the compare butterfly. Only composite
  contributors remain. Comment updated; the old goalkeeper special-case note now points
  at the position-gated `rating_datapoints` (063) — a keeper's breakdown already
  carries only keeping metrics, an outfielder's only outfield metrics, so the pizza
  splits cleanly with no client-side position logic.

Frontend-only; the rating breakdown already carries the right datapoints (063 made the
GK/outfield split at the rating level).

## Files changed

- `src/components/solid/CompositeCard.tsx`

## Verification

- `npm run typecheck` clean; `npm test` 119/119.
- Post-063, a keeper's pizza shows the four keeping wedges; an outfielder's shows the
  ~12 composite outfield wedges with no GK clutter and no display-only Clearances /
  Blocks / Penalties Won.

## Result

The Composite pizza is now exactly the rating's z-score composition — nothing
decorative, honest about what counts.
