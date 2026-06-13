# Unranked · low-minutes state (Phase 2 frontend)

## Goal
Sub-gate (low-minute) players now carry a breakdown but no composite rank (backend
migration 080). Render their data with an "Unranked · low min" state instead of an
empty profile or a fake 0 rating.

## What Was Done
- `sparkline.server.ts` — `SparklineRating` + `RatingView` composite/specialist
  rank/score (+ specialty) are now `number | null` (sub-gate players have null rank/score,
  a present breakdown).
- `EntityMeta.tsx` — new `unranked` memo (rating present + breakdown + null composite);
  the composite chip shows an **"Unranked · low min"** badge (muted "—") in that case,
  instead of the score chip (which only renders when the value is non-null).
- `EntityMeta.css` — `.pw-score-unranked` (tertiary, no tier color).
- `og-bodies.ts` — null-coalesce the scoped composite (OG path; share is paused anyway).

The Composite pizza needs no change — it renders from `rating_breakdown`, which sub-gate
players now have (fill = the 50+10z magnitude vs the rated cohort).

## Files Changed
- `src/lib/data/sparkline.server.ts`, `src/components/solid/EntityMeta.tsx` + `.css`,
  `src/lib/cards/og-bodies.ts`

## Verification
- `npm run typecheck` clean · `npm test` pass · `npm run build` OK.
- Backend live: player 29809271 (9 apps) sparkline → 15-datapoint breakdown, rank/score NULL.

## Result
Low-minute players show their full datapoint breakdown + an Unranked badge; ranked players
unchanged; unranked players stay off the leaderboard (composite NULL).
