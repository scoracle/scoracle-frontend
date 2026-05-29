# 2026-05-28 — About page: box score data sources

## Goal
Disclose on the public About page where Scoracle's box score / stats data comes from.

## What Was Done
Added a new **"Where our data comes from"** section to `src/routes/about.tsx`, placed after "How it works". It credits the upstream statistical data providers (verified against the backend ingestion handlers in `scoracle-backend/seed/services/event/handlers/`):

- **NBA & NFL** — BallDontLie (`bdl_nba.py`, `bdl_nfl.py`)
- **Football (soccer)** — SportMonks (`sportmonks_football.py`)

Each provider is an outbound link (`target="_blank" rel="noopener noreferrer"`). The section also clarifies that Scoracle ingests the raw stats and layers its own ratings/trends/vibe analysis on top, plus a non-affiliation disclaimer for the providers and leagues.

## Files Changed
- `src/routes/about.tsx` — new section + provider list.

## Verification
- `npm run typecheck` — passes clean.

## Result
Public About page now attributes box score data to BallDontLie (NBA/NFL) and SportMonks (football).
