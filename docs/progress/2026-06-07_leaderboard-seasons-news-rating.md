# 2026-06-07 — Leaderboard: season filter, drop News, General→Rating

Three small follow-ups after the leaderboard adopted the ScopeStrip.

## Goal
1. Remove the **News** board (raw mention counts, not Gemma-audited like transfers
   — noisy results).
2. Rename the composite pillar's client label **General → Rating** (Special stays).
3. Add a **season dropdown** to the Rating board.

## What Was Done
- **Drop News** (`routes/leaderboard.tsx`, `lib/cards/og-bodies.ts`,
  `lib/data/leaderboard.server.ts`, `lib/utils/data-sources.ts`): removed "news"
  from `BoardId`/`BOARD_ITEMS`/`BOARD_BLURB`/`board()`, the data dispatch, and the
  row-mapper; dropped the OG leaderboard news branch; deleted the now-orphaned
  `getNewsLeaderboard`/`NewsLeaderboardResponse`/`fetchNewsLeaderboardImpl`/
  `newsLeaderboardUrl` chain. (Backend `news_leaderboard` endpoint left intact —
  harmless.) The profile's per-entity News *feed* tab is unaffected.
- **General → Rating** (`lib/cards/card-meta.ts`): `pillarLabel("composite")` now
  returns "Rating" for players too (was "General"; teams were already "Rating").
  This is the single source for the NavStrip tab, the in-app headline, the meta
  widget, and the OG heading — all flip together. Updated the og-bodies fallback.
- **Season dropdown** (`routes/leaderboard.tsx`, `lib/data/leaderboard.server.ts`):
  `LeaderboardResponse` gains `available_seasons` (backend change, same day). A
  season `<Select>` rides the ScopeStrip for the Rating board (shown only when >1
  season), backed by `?season=` (dropped at the latest season for clean URLs) and
  threaded into `getLeaderboard`. Default = the backend's latest rated season.

## Files Changed
`src/routes/leaderboard.tsx`, `src/lib/cards/card-meta.ts`, `src/lib/cards/og-bodies.ts`,
`src/lib/data/leaderboard.server.ts`, `src/lib/utils/data-sources.ts`.

## Verification
`npm run typecheck` clean; `npm test` → 111 pass. Browser (dev → prod API):
- Leaderboard rail = Rating / Vibes / Transfers (no News). ScopeStrip = Players ▾ ·
  2025 ▾ · Search ▾; season options [2025..2018]; picking 2023 → `?season=2023`,
  board = Dončić / Jokić / Haliburton.
- Profile tabs = **Rating** / Special / Trends / Vibe / News (composite renamed).

## Result
The leaderboard drops the noisy News board, gains a season filter on Rating, and
the rating pillar reads "Rating" everywhere — consistent with the leaderboard's
board name and the settled pillar labels.
