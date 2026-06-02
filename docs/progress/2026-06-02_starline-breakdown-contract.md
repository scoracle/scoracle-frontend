# 2026-06-02 — Starline `rating_breakdown` frontend contract (Phase 1b)

## Goal

Land the shared frontend type for the per-datapoint rating breakdown (backend
migration 030 / starline payload) so tonight's Composite-card, Specialist-card,
and meta-3-score-row work all build on a ready contract.

## What Was Done

`src/lib/data/starline.server.ts`:
- New exported `interface RatingDatapoint { label; z; pct; in_comp; in_spec; sign; facet; is_specialty }`.
- Added `rating_breakdown: RatingDatapoint[]` to `StarlineRating`.

Doc-commented the core principle on the type: the backend stores the z, the UI
draws `pct` (the percentile). No component consumes it yet — that's tonight's
Phase 2/3/4 work.

## Files Changed

```
src/lib/data/starline.server.ts
```

## Verification

- `npm run typecheck` clean (nothing constructs `StarlineRating`; it's API-shaped,
  so the added field is non-breaking).

## Result

`getStarline().rating.rating_breakdown` is now typed end-to-end. Tonight: build
`CompositeCard` (pizza from `in_comp` rows), `SpecialistCard` (hero the
`is_specialty` row + scarcity copy), and the meta 3-score row. Plan:
`~/.claude/plans/zany-dazzling-hamster.md`.
