# Magnitude rating — switch the displayed RATING from percentile to score

**Date:** 2026-06-11

## Goal

The displayed composite "RATING" was the percentile rank, which pins the top 1% of any
population at ~99 (a wall of 99s). Backend 067/068 added a magnitude score
(`rating_composite_score` = `50 + 10·z(composite)`, clamped [1,99]); this switches the
display to it so the rating finally spreads by value (Yamal 99 → Greenwood 83).

## What was done

- **`tier-color.ts`** — new `tierColorScore(score)` on the magnitude scale (mean 50,
  SD 10): ≥65 elite / ≥55 above / ≥45 average / ≥35 below / else poor. `tierColor`
  (percentile) is left for the percentile surfaces.
- **Leaderboard** (`leaderboard.server.ts` type + `leaderboard.tsx`) — composite board
  metric + color now read `rating_composite_score` via `tierColorScore`.
- **Composite card** (`CompositeCard.tsx`) — new `scopedScore(view, scope)` =
  `scoped_scores[scope] ?? composite_score`; the headline (and both compare-butterfly
  headlines) display the score, colored by `tierColorScore`. Fantasy headline keeps the
  percentile palette. Pizza slices untouched.
- **Profile meta** (`EntityMeta.tsx`) — composite chip → score. Specialist chip (per-skill
  datapoint pct) unchanged.
- **Roster** (`roster.server.ts` type + `RosterCard.tsx`) — composite + specialist columns
  → scores, colored by `tierColorScore`.
- **Sparkline plumbing** (`sparkline.server.ts`) — `SparklineRating` / `RatingModeBlock` /
  `RatingView` gain `*_score` + `scoped_scores`; `ratingForMode` populates them (default
  from the top-level fields, per-mode from the `rating_modes[mode]` block).

Intentionally left on percentile (different concept, separate follow-up): SpecialistCard /
Meta per-skill `pct`, TrendsCard per-event `rating_composite_pct`, and the OG card bodies.

## Files changed

- `src/lib/utils/tier-color.ts`, `src/routes/leaderboard.tsx`,
  `src/lib/data/leaderboard.server.ts`, `src/lib/data/sparkline.server.ts`,
  `src/components/solid/CompositeCard.tsx`, `src/components/solid/EntityMeta.tsx`,
  `src/lib/data/roster.server.ts`, `src/components/solid/RosterCard.tsx`,
  `src/lib/data/sparkline.test.ts`

## Verification

- `npm run typecheck` clean; `npm test` 119/119. Prod API already serving the score
  (verified Yamal 99.0). Build clean; deployed to Cloudflare.

## Result

The leaderboard and profile show a rating that differentiates value instead of a wall of
99s — the OG cards + per-skill specialist percentile are the remaining follow-up.
