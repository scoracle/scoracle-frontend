# 2026-06-03 — Composite category pizzas + per-slice volume + year selector

## Goal

Task 5 (frontend) increments off the new backend rating data: team offense/defense
category pizzas, raw volume on each wedge, and a profile year selector.

## What Was Done

**Category pizzas + volume** (commit 8f4f995):
- `CompositeCard` renders the faceted team breakdown — one pizza per facet
  (offense/defense), each headlined with its category percentile from
  `rating_categories` ("Offense · 86.2").
- Includes display-only datapoints (oreb/dreb split, opp FG%) via
  `in_comp || !in_spec` — specialist-only terms (NBA Foul Drawing) stay on the
  Specialist card.
- Each wedge sub-label is the raw **volume** (`value`) instead of the signed z.
- Cards/injuries (`discipline`/`squad` facets) render as chips below the rings.
- `starline.server.ts`: `RatingDatapoint.value` + `StarlineRating.rating_categories`.

**Year selector**:
- Backend: `available_seasons` (newest-first seasons with a rated row) added to the
  starline payload (`db.go`) — sourced from the already-fetched starline rather than
  the retired Stats endpoint. Live on the running API.
- `ContentShell`: a **scope-selector row** below the tabs / above the cards — the
  convention for all scope pickers (dropdowns). `SeasonSelect` mounted here, wired to
  `ctx.season()` / `setSeason` (URL-synced; cards refetch on change).
- `StarlineResponse.available_seasons` type; `.scope-row` CSS.

## Files Changed

`CompositeCard.tsx`, `ContentShell.tsx`, `ContentShell.css`, `starline.server.ts`
(frontend); `go/internal/db/db.go` (backend, separate repo).

## Verification

`npm run typecheck` clean. Backend verified live: starline serves
`available_seasons: [2025…2018]` + `rating_categories`.

## Result

Team Composite tab shows offense/defense category pizzas with volumes + category
percentiles; every profile has a year selector. Needs `cf:deploy` to reach prod.
Remaining Task 5: scope toggles (re-rank within cohort — needs backend scoped
percentiles). Leaderboard z-vs-percentile still an open preference.
