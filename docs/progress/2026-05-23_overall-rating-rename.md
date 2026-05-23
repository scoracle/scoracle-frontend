# 2026-05-23 — Rename "Overall" → "Rating" / "Overall score" → "Overall rating"

## Goal

Make the meta-card's numeric readout label more indicative of what the
value actually is. "Overall" alone is ambiguous; "Rating" names it.
Apply the same logic to the per-category readouts under each Stats /
Compare butterfly chart, which were labelled "Overall score: NN" —
swap to "Overall rating: NN" so the language matches across surfaces.

## What Was Done

`EntityMeta.tsx`:
- `<span class="pw-detail-label">Overall</span>` → `Rating`.

`StatsCard.tsx`:
- `Overall score:` readout under each category chart → `Overall rating:`.

`CompareCard.tsx`:
- All three "Overall score:" readouts (single-entity fallback +
  primary/secondary in the butterfly compare row) → `Overall rating:`.

The internal `overallScore()` memo/function names are untouched —
this is a label rename only, not a logic change. Comments in
`stats-categorizer.ts` and `CompareCard.tsx` still reference
"Overall score" since they're documenting the historical computation,
which is unchanged.

## Files Changed

- `src/components/solid/EntityMeta.tsx`
- `src/components/solid/StatsCard.tsx`
- `src/components/solid/CompareCard.tsx`

## Verification

- `npm run typecheck` — clean.
- `grep "Overall score" src/` — only comments remain, no live JSX.

## Result

Meta-card readout: `Rating: 73`. Stats / Compare per-category readouts:
`Overall rating: 73`. Consistent terminology across the three surfaces
that display the pooled-average value.
