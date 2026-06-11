# TrendsCard headline: use magnitude score for players (was percentile)

**Date:** 2026-06-11
## Goal
The Trends/Starline card's headline RATING still showed `rating_composite_rank` (percentile)
— e.g. Dimarco read 100 there vs 90.9 in the meta header. It was missed in the magnitude
switch (only the per-event sparkline pct was intentionally excluded; the season headline
should follow the same player→magnitude / team→percentile rule as everywhere else).
## What was done
- `TrendsCard.tsx`: `generalScore()` now reads `rating_composite_score` for players (magnitude)
  and `rating_composite_rank` for teams (percentile); a new `generalScoreColor()` picks
  `tierColorScore` vs `tierColor` accordingly. Applied to the headline + the sparkline accent.
  The per-game sparkline line stays on per-event percentile (it's a form trend, not the rating).
## Verification
- `npm run typecheck` clean; tests pass; build + deploy.
## Result
The Trends headline now matches the meta header and Composite card (Dimarco 91, not 100).
