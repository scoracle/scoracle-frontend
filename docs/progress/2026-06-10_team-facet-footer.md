# Team facet footers — label only, score dropped

**Date:** 2026-06-10

## Goal

On team Composite facet cards, the footer showed the facet's numeric sub-score
("OFFENSE: 87.1" / "DEFENSE: 87.1") — which read as a duplicate of the meta-card
rating and, when the two facets' percentiles coincide (Patriots 2025: both 87.1),
was actively confusing. Per Scott: keep the score in the meta card, drop it from
next to "Offense"/"Defense".

## What was done

- **`CompositeCard.tsx`** — `cardScore`'s team branch (rating_categories present)
  now returns `value: null`; the footer JSX renders the `": <score>"` suffix only
  when a value exists. Team facet cards show just "Offense" / "Defense"; player
  footers (no rating_categories → scope-aware composite, e.g. "Rating: 85.1")
  are unchanged, as is the Fantasy-model headline path.

## Files changed

- `src/components/solid/CompositeCard.tsx`

## Verification

- `npm run typecheck` clean; `npm test` 119/119.
- Playwright (local API): NBA team footers `["Offense","Defense"]` (no scores);
  NFL QB footer `["Rating: 85.1"]` unchanged.
