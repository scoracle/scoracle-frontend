# 2026-06-08 — One rating per Rating card, pinned to the bottom

## Goal
The Rating-tab pizza cards listed the rating twice: a per-category score in the top
header (`OFFENSE · 80.0`) AND the overall composite in the footer (`RATING: 90.5`).
Two ratings on one card read as confusing and redundant. Each card should show a
single rating, always at the bottom (so the OG share artifact, which crops to the
footer, carries the right number).

## What Was Done
`components/solid/CompositeCard.tsx` (`CompositeView`):
- Removed the top `.category-chart-label` header line (it held the duplicate/second
  rating — the `facetLabel · catPct` block).
- Dropped the `<Show when={i() === 0}>` gate on the footer so the bottom rating now
  renders on **every** facet card, not just the first.
- Added a `cardScore(facet)` helper that picks the one value to show:
  - **Teams** → the facet's own per-category sub-score (`rating_categories[facet].pct`),
    labeled by facet → `OFFENSE: 80.0`, `DEFENSE: 85.5` (one per category card).
  - **Players + flat single-pizza entities** (no `rating_categories`) → the existing
    scope-aware overall composite → `RATING: 90.5` (or `RATING · POSITION: …` when a
    cohort scope is active).

Net: top header gone, footer carries the single self-identifying rating. Footer keeps
the `overall-score-line` styling (tier-colored value + hover-pop) unchanged.

Out of scope (flagged, not done): the OG share body `lib/cards/bodies/composite.ts`
still renders the rating as a top headline on a single merged pizza — it has no
duplication, but it isn't per-category and its rating isn't bottom-pinned. Mirroring
this convention into the OG (and per-category share cards) is the Phase-D follow-on.

## Files Changed
`src/components/solid/CompositeCard.tsx`.

## Verification
`npm run typecheck` clean; `npm test` → 111 pass (16 files). Traced both paths:
team offense/defense cards each show only their category score at the foot; the single
player card shows its overall composite at the foot; no card renders two ratings.

## Result
Each Rating card shows exactly one rating, pinned to the bottom — the category
sub-score for each team facet card, the overall composite for the player card.
