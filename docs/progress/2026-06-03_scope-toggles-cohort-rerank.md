# 2026-06-03 — Scope toggles: composite re-rank within cohort

## Goal

Task 5 final piece — scope selectors that re-rank the rating within a cohort
(player = position; team = conference/division/league), per the locked semantics.

## What Was Done

**Backend** (migration 039, separate repo): precompute `rating_scoped_ranks` JSONB on
player_stats (position cohort) + team_stats (conference/division for NBA/NFL, league for
football) in `compute_rating`/`compute_team_rating` — `percent_rank` partitioned by the
cohort attribute. Frozen-math proof: composite/specialist/categories byte-identical.
`db.go` serves `rating_scoped_ranks` on the starline payload. Live on the API.

**Frontend:**
- `ProfileContext` gains `scope` state (`RatingScope`), URL-synced via `?scope=`
  (mirrors `season`).
- `ScopeSelect` — a dropdown (SeasonSelect aesthetic) for the scope, in the
  `ContentShell` scope row. Shown on **Composite + Leaders** tabs only; options are
  data-driven from `rating_scoped_ranks` (player → By Position; NBA/NFL team → By
  Conference / By Division; football team → By League; redundant league hidden for
  NBA/NFL).
- `CompositeCard` headline re-ranks to the selected cohort (`rating_scoped_ranks[scope]`);
  "All" stays the positionless `rating_composite_rank`.
- `starline.server.ts`: `StarlineRating.rating_scoped_ranks`.

## Files Changed

`contexts/profile.ts`, `routes/profile.tsx`, `components/solid/ScopeSelect.tsx` (new),
`ContentShell.tsx`, `CompositeCard.tsx`, `lib/data/starline.server.ts`.

## Verification

`npm run typecheck` clean. API serves `rating_scoped_ranks` (e.g. Thunder
`{conference:100, division:100, league:96.6}`).

## Result

Composite re-ranks within cohort via the scope dropdown. Needs `cf:deploy` to go live.
**Remaining:** the Leaders-board cohort re-rank (LeaderboardCard reading scope + the
leaderboard endpoint gaining conference/division params) — the Composite half is done.
