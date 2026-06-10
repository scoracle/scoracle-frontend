# Football fantasy — Model selector lights up + fantasy-sport SSOT

**Date:** 2026-06-10

## Goal

Turn on the Regular | Fantasy model selector for football (backend migration 057
adds FPL-style `fantasy_points`). The payload (`fantasy_block`), the `<Select>`
Model control, and the CompositeCard fantasy branch already handle any sport once
the data exists — football just needed to be added to the fantasy-sport gate.

## What was done

- **`card-meta.ts`** — added `fantasySupported(sport)` (+ a private `FANTASY_SPORTS`
  set) as the single source of truth for which sports have a fantasy preset
  (`nba`, `nfl`, **`football`**). Case-insensitive, pure data — lives beside
  `transferNoun`/`pillarLabel` in the import-free pillar SSOT.
- Replaced **three** drifting local `FANTASY_SPORTS = new Set(["nba","nfl"])`
  copies with the shared helper:
  - `ContentShell.tsx` — the profile Model selector (`showModel`).
  - `RosterCard.tsx` — the team-roster fantasy-points column (`showFantasy`).
  - `leaderboard.tsx` — the Fantasy board (rail filter + `?board=` resolution).

  Flipping a sport in one place now lights up all three surfaces together — exactly
  the hand-kept-list drift CLAUDE.md warns against (cf. the News-preload realign).
  Each surface stays data-gated (the selector/board also checks the payload exists).

## Files changed

- `src/lib/cards/card-meta.ts`
- `src/components/solid/ContentShell.tsx`
- `src/components/solid/RosterCard.tsx`
- `src/routes/leaderboard.tsx`

## Verification

- `npm run typecheck` clean; `npm test` 119/119.
- Playwright (local API on the 057-migrated DB) — football profile (Haaland,
  id 154421): the **Fantasy** Model selector renders in the ScopeStrip
  (Fantasy · Per Season · All · 2025 · Compare); toggling Regular→Fantasy flips the
  headline **"RATING: 96.5" → "FANTASY: 194.0 PTS"** (season-total FPL points); the
  counting-stat pizza slices stay put (Phase-3 design — model flips only the headline).
- Sparkline fantasy block confirmed for football per mode (default/per_game/per_90)
  with scoped position ranks.

Leaderboard/roster fantasy surfaces for football verify on prod post-deploy (the local
clone has no `public.players` meta, so the leaderboard endpoint returns 0 for all sports
locally; the Go query is unchanged from the shipped NBA/NFL boards).

## Result

Football has a Fantasy model end-to-end. Ships with backend migration 057 (no API
restart — sport-agnostic prepared statements) in the same cf:deploy.
