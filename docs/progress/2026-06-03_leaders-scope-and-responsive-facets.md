# 2026-06-03 — Leaders-board cohort scope + responsive offense/defense cards

## Goal

(1) Finish the scope toggles — extend the cohort re-rank to the **Leaders** board.
(2) Make the offense/defense facet cards **responsive** — horizontal when the viewport
has room, vertical when narrow.

## What Was Done

**Leaders cohort scope:**
- Backend (separate repo): leaderboard statement + handler gain `conference`/`division`
  params (alongside the existing `position` + `league_id`); starline payload now serves
  the team's `conference`/`division` (joins `teams`) so the client has the cohort value.
  Live on the API (verified: `conference=West` → Thunder/Spurs/Nuggets…).
- `LeaderboardCard` reads `ctx.scope()` + the cohort value from `starline.rating`
  (position / conference / division / league) and passes it to `getLeaderboard`, so the
  board re-ranks within the profile entity's cohort. "All" = sport-wide board.
- `starline.server.ts`: `conference`/`division` on `StarlineRating`.
- `data-sources.leaderboardUrl` + `getLeaderboard`: cohort filter params.

**Responsive facets:**
- `CompositeCard` wraps the facet pizza cards in `.composite-facets` (flex-wrap) inside a
  `.composite-stack` (column; chips below). The facets row lays out **horizontally when
  the viewport has room and wraps to a vertical stack when narrow** (`width: min(840px,
  96vw)` → 2-up on ≳820px viewports, stacked below).

## Files Changed

Frontend: `LeaderboardCard.tsx`, `CompositeCard.tsx`, `StatsCard.css`,
`starline.server.ts`, `leaderboard.server.ts`, `data-sources.ts`.
Backend: `go/internal/db/db.go`, `go/internal/api/handler/data.go`.

## Verification

`npm run typecheck` clean; `go build` clean; API serves the conference-filtered board +
team conference/division live.

## Result

Scope toggles complete (Composite + Leaders). Offense/defense cards responsive. Needs
`cf:deploy` to reach prod.
