# 2026-05-23 — Refresh bundled autofill data (NBA/NFL richer team meta)

## Goal

Backend's `/api/v1/{sport}/meta` autofill endpoint now ships richer
team metadata for NBA and NFL — every team's `meta` payload includes
`city`, `country`, `founded`, `venue_name`, `venue_capacity`,
`conference`, `division`, `abbreviation`, `display_name`. Frontend's
bundled JSONs (`public/data/{sport}-meta.json`) were generated before
those fields existed, so the EntityMeta widget on team profiles
showed only the older minimal subset (city / conference / division).

`scripts/fetch-autofill.mjs` already maps every new field correctly
when the backend ships them, the `TeamMeta` TS interface already
declares them, and `EntityMeta.tsx` already renders them as labelled
detail rows (Country / Conference / Division / Founded / Venue /
Capacity). The only step needed was to re-run the script so the
bundled JSONs match the live endpoint shape — no code changes.

## What Was Done

- `npm run fetch-data` against `https://api.scoracle.com/api/v1`,
  refreshing all six bundled files:
  - `public/data/nba.json` + `public/data/nba-meta.json`
  - `public/data/nfl.json` + `public/data/nfl-meta.json`
  - `public/data/football.json` + `public/data/football-meta.json`
    (regenerated for parity even though no Football team-meta change
    was advertised — keeps the build timestamps coherent and catches
    any incidental backend changes).

## Files Changed

- `public/data/nba-meta.json`
- `public/data/nba.json`
- `public/data/nfl-meta.json`
- `public/data/nfl.json`
- `public/data/football-meta.json`
- `public/data/football.json`

## Verification

- Spot-check after refresh:
  ```
  nba-meta.json: 30 teams — venue=30, founded=30, country=30, capacity=30
  nfl-meta.json: 32 teams — venue=32, founded=32, country=32, capacity=32
  ```
  100% coverage on the new fields for both leagues.
- `npm run typecheck` — clean.
- `npm test` — 137/137 green.

## Result

Visiting a team profile (e.g. Atlanta Hawks, Arizona Cardinals) now
surfaces the full meta detail block — Country, Conference, Division,
Founded, Venue, Capacity — instead of the previous truncated trio.
Ready to deploy via `npm run cf:deploy`.
