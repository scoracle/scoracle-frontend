# 2026-06-04 — Leaderboard page + home launcher (vibes/news/transfers boards)

## Goal

Stand up the standalone `/leaderboard` stack-rank page consuming the new backend
boards, plus an on-brand home-page entry point into it. Sport comes from the home
selector; boards switch via a tab rail.

## What Was Done

- **Data layer** — `data-sources.ts`: `vibesLeaderboardUrl` / `newsLeaderboardUrl` /
  `transfersLeaderboardUrl` (→ `/{sport}/leaderboard/{vibes,news,transfers}`).
  `leaderboard.server.ts`: `getVibesLeaderboard` / `getNewsLeaderboard` /
  `getTransfersLeaderboard` query fetchers + `BoardEntry` / `TransferLeader` types.
- **`/leaderboard` route** (`routes/leaderboard.tsx` + `.css`) — standalone, sport-scoped
  (uses `<Shell>` + `<NavStrip>` directly, NOT `<Card>`, which needs ProfileContext).
  Four boards behind one rail: **Rating** (`getLeaderboard` composite), **Vibes**, **News**,
  **Transfers**. All state on the URL (`?sport`, `?board`, `?type`) → one dispatch
  `createAsync` re-fetches only the active board. Players/teams toggle (hidden for
  transfers — those are pairs), a "Search" filter over the loaded rows, and a unified
  row (rank · avatar+crest · name/sub · tier-colored metric) across every board.
- **Home launcher** (`components/solid/LeaderboardMenu.tsx` + `.css`) — a quiet body-font
  `⌄` chevron just below the search (same gap as search↔sport-selector). Tapping it drops
  a sheet with the board tab rail (`<NavStrip>`); picking a board navigates to
  `/leaderboard?sport=<current>&board=<id>`. Flips to `⌃` while open; closes on
  outside-click / Escape. Wired into `routes/index.tsx` under the SearchBar.

## Files Changed

`lib/utils/data-sources.ts`, `lib/data/leaderboard.server.ts`, `routes/leaderboard.tsx` (new),
`routes/leaderboard.css` (new), `components/solid/LeaderboardMenu.tsx` (new),
`components/solid/LeaderboardMenu.css` (new), `routes/index.tsx`.

## Verification

`typecheck` clean; `npm test` 97/97. Real worker (`cf:dev` on :8787) + Playwright:
`/leaderboard` SSR-renders 200 on direct load — Rating 50, Vibes 50, News 30, Transfers 50
rows, zero console errors. Home 200 with the chevron→rail launcher. **Caught & fixed a
real bug:** the first (button) launcher hung the worker (500) by calling
`document.removeEventListener` in an SSR-run `onCleanup`; the rewrite scopes listeners
inside `onMount` so nothing touches `document` during SSR. Measured the launcher rail's
hairline against the sport selector's — pixel-identical (1px, rgba(23,23,23,0.1)).

## Result

A live `/leaderboard` page with four sport-wide boards and an on-brand chevron launcher on
the home page. Backend boards are live (scoracle-backend `65bda22`).

## Follow-ups

- Composite-board cohort scoping (league / conference / position / season pickers) — the
  backend `/leaderboard` already accepts these; the page UI is the next iteration.
- Leaderboard top-N OG snapshot to flip `leaderboard` shareable (task #16).
