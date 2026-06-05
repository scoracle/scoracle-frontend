# 2026-06-05 — Meta card: season-aware team (+ link) + starline→sparkline path rename

## Goal

(1) Link the player meta card's team to the team profile. (2) Make the team season-aware:
most-recent team by default, the correct team when a year is selected (fixes the stale
last-seeded-team glitch — Luis Díaz → Bayern by default, Liverpool for 2024). (3) Clean the
`starline` endpoint name out of the frontend → `/sparkline`.

## What Was Done

- **Season-aware team** (`EntityMeta`): the player's team now comes from the (season-aware)
  `sparkline().rating.team` — defaults to the latest rated season's team, switches with the
  year selector, exactly like the stats. Falls back to the bundled meta team before the
  rating resolves / for unrated players. The team logo fallback (NBA/NFL no-photo players)
  also uses the season-aware crest.
- **Team link**: the player subtitle is now an `<a class="pw-subtitle-link">` →
  `/profile?...&type=team&id=<team_id>` (underline-on-hover; team entities keep the plain
  city subtitle).
- **Rename**: `sparklineUrl` now hits `/sparkline` (was `/starline`); `SparklineResponse.page`
  is `"sparkline"`; added `RatingTeam` + `SparklineRating.team` types. The backend keeps a
  `/starline` alias during rollout. (The `?tab=starline` / `/og/starline/…` backward-compat
  aliases for old *share links* are a separate concern and stay.)

## Files Changed

`components/solid/EntityMeta.tsx`, `components/solid/EntityMeta.css`,
`lib/data/sparkline.server.ts`, `lib/utils/data-sources.ts`.

## Verification

`typecheck` clean; `npm test` 97/97. Real worker (`cf:dev`, hitting the restarted API) +
Playwright on Luis Díaz (241036): default subtitle = "FC Bayern München" → links to
`team&id=503`; `?season=2024` = "Liverpool" → `team&id=8`; both are links; zero console
errors. Backend: scoracle-backend `889ae9b` (rename + season team, API restarted).

## Result

The meta card's team is correct (most-recent by default), changes with the selected year,
and links to the team profile. The frontend now speaks `/sparkline`.
