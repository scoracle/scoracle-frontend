# 2026-06-08 — "Transfers" → "Trades" for NBA/NFL (football keeps "Transfers")

## Goal

A player move is a *transfer* in football but a *trade* in the NBA/NFL. Every
surface read "Transfers" regardless of sport. Make NBA/NFL cards, leaderboards,
and the home rankings dropdown read "Trades", while football stays "Transfers".

## What Was Done

- `lib/cards/card-meta.ts`: new `transferNoun(sport)` SSOT — `football` → `"Transfers"`,
  else `"Trades"` (case-insensitive). Lives in the pure-data label module (zero
  component imports), already imported by ContentShell and the OG renderer. Collapses
  the one-off `football ? … : …` ternary that previously lived only in TransfersCard.
- `components/solid/ContentShell.tsx`: the profile **Transfers tab** caption now
  resolves via `transferNoun(ctx.sport())` (special-cased in `navItems`, mirroring the
  existing `pillarLabel(...) ?? t.label` pattern).
- `components/solid/TransfersCard.tsx`: `noun()` now calls `transferNoun` (same
  behaviour, one source); the loading skeleton's `aria-label` is sport-aware too
  (was hardcoded "Transfers").
- `routes/leaderboard.tsx`: a reactive `boardItems()` relabels the Transfers board;
  `boardLabel()` reads it, so the tab rail, the page/share title, and the section
  aria-labels all follow the sport.
- `components/solid/LeaderboardMenu.tsx`: the home **rankings dropdown** relabels the
  Transfers board via `boardItems()` (sport from `$currentSport`, default `nba`).
- `lib/cards/og-bodies.ts`: the OG leaderboard snapshot header uses
  `transferNoun(ctx.sport)` (e.g. "NBA Trades") instead of hardcoded "Transfers".
- `components/solid/card-registry.tsx`: comment refreshed to point at the
  ContentShell/`transferNoun` resolution.

The board *blurb* ("Hottest rumors by heat index") is sport-neutral and unchanged.

## Files Changed

`lib/cards/card-meta.ts`, `lib/cards/og-bodies.ts`, `components/solid/ContentShell.tsx`,
`components/solid/TransfersCard.tsx`, `components/solid/LeaderboardMenu.tsx`,
`components/solid/card-registry.tsx`, `routes/leaderboard.tsx`.

## Verification

`npm run typecheck` clean; `npx vitest run` 111/111. No tests reference the labels.

## Result

NBA/NFL now read "Trades" on the profile card (tab + heading), the `/leaderboard`
board + its share title/OG image, and the home rankings dropdown; football still reads
"Transfers". One `transferNoun()` helper is the single source for the term.

Note: committed on worktree branch `worktree-transfers-to-trades`. `LeaderboardMenu.tsx`
and `leaderboard.tsx` also had unrelated uncommitted polish in the main checkout (Rankings
launcher + row chevron reorder); the terminology hunks here don't overlap it but were
authored on the committed base, so reconcile those two files when merging onto main.
