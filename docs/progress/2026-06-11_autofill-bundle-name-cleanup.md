# Autofill bundle refresh — clean player names (trailing nbsp)

**Date:** 2026-06-11

## Goal
Surface the cleaned player names (backend migration 075 stripped a trailing non-breaking
space from 153 football players, e.g. "Harry Kane ") in the client-side autocomplete +
profile-header bundle, which had the old names baked in.

## What Was Done
- Backend (sibling repo) shipped migration 075 (strip nbsp from `players.name`) + the seeder
  fix. The name surfaces client-side via the bundled `public/data/{sport}.json` /
  `{sport}-meta.json`, regenerated from the Go `/{sport}/meta` endpoint.
- `/meta` reads `football.autofill_entities` (a materialized view on `players.name`), which
  was stale; refreshed it (`REFRESH MATERIALIZED VIEW CONCURRENTLY`) and restarted the API to
  clear its 5-min response cache, then regenerated the bundle (`node scripts/fetch-autofill.mjs`).
- Result: 0 names end in nbsp across the football bundle; id 997 = "Harry Kane" (was
  "Harry Kane "). NBA/NFL bundles re-emitted too (names already clean; only `generatedAt` +
  any freshly-seeded data move).

## Files Changed
- `public/data/football.json`, `public/data/football-meta.json` (clean names)
- `public/data/nba.json`, `public/data/nba-meta.json`, `public/data/nfl.json`,
  `public/data/nfl-meta.json` (routine refresh)

## Verification
`/meta` for football 997 returns `'Harry Kane'` (x-cache MISS, fresh). Bundle scan: 0 player
names ending in U+00A0 in either football file. Share text no longer renders "Harry Kane 's".

## Result
Clean names live across autocomplete, profile header, and share copy after deploy.
