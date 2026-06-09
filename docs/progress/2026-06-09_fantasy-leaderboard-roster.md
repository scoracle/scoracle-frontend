# 2026-06-09 — Fantasy on Leaderboard + Roster (Phase 2b)

## Goal
Expose fantasy points (backend migration 046) in the two ranked-list surfaces: a
Fantasy board on /leaderboard and a Fantasy column on the team Roster card.

## What Was Done
- **Leaderboard** (`src/routes/leaderboard.tsx`): new `"fantasy"` board in `BoardId` /
  `BOARD_ITEMS` / `BOARD_BLURB`, gated to nba/nfl (`FANTASY_SPORTS`) — the rail filters
  it out for other sports and `board()` falls back to `composite`. Players-only (type
  toggle hidden). The dispatch fetches `getLeaderboard(s, "player", "fantasy", …)`; a new
  `kind: "fantasy"` row-mapper shows the fantasy-points total as the metric, tier-colored
  by `fantasy_rank`. Season dropdown + `?board=fantasy` URL state reused.
- **Roster** (`RosterCard.tsx` + `RatingList.css`): for nba/nfl, a 5th **Fantasy**
  column (a `.rating-list--fantasy` grid variant) showing each player's fantasy points;
  other sports keep the 4-column Comp/Spec layout. Display-only (ordering unchanged).
- DTOs: `LeaderboardEntry` += `fantasy_points?`/`fantasy_rank?`; `RosterPlayer` += `fantasy_points?`.

## Files Changed
- `src/routes/leaderboard.tsx`, `src/lib/data/leaderboard.server.ts`
- `src/components/solid/RosterCard.tsx`, `src/components/solid/RatingList.css`
- `src/lib/data/roster.server.ts`

## Verification
- `npm run typecheck` clean; `npm test` 114 passed. Backend leaderboard/roster validated
  on prod (Jokić 62.93 #1; Memphis roster carries fantasy_points). Deployed (Worker
  `9fffa703`); live `/leaderboard?board=fantasy` 200 for NBA + NFL; team roster 200.

## Result
A live **Fantasy Points leaderboard** (NBA per-game / NFL season-total) and a fantasy
column on team rosters. Rate variants (per-game/per-season toggle on the board) are a
fast-follow.
