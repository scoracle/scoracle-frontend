# Refresh CLAUDE.md (+ card-meta comment) to the Sigil-convergence vocabulary

**Date:** 2026-06-18  ·  Frontend, docs (no behavior change).

## Goal
Phase 4 of the Sigil convergence: bring the repo's developer-facing docs up to the shipped vocabulary.
`CLAUDE.md`'s ContentShell/Vocabulary sections still described the **pre-convergence** tabs
(Composite / Specialist / Starline / Vibes / Leaders) and the retired `PROFILE_TABS` registry — actively
misleading anyone reading the live repo.

## What Was Done
- `CLAUDE.md` ContentShell bullet → the current tabs **Stats / Rating / News / Trends / Sigil** (+ Roster
  for teams), with accurate per-surface descriptions and the real deep-link aliases (`composite→stats`,
  `traits|specialist→rating`, `vibes→sigil`, `trends|starline→momentum`, `transfers→news`, etc.).
- `CLAUDE.md`: `PROFILE_TABS` (`profile-tabs.tsx`) → **`CARD_REGISTRY` (`card-registry.tsx`)**, the real
  single source of truth; NavStrip count `6 player / 7 team` → `5 player / 6 team`.
- `src/lib/cards/card-meta.ts`: the `pillarLabel` doc-comment described the old composite/specialist/vibe
  mapping → now `stats→Stats, rating→Rating, sigil→Sigil, momentum→Trends`.

## Files Changed
`CLAUDE.md` · `src/lib/cards/card-meta.ts` (comment only).

## Verification
`tsc --noEmit` clean (comment-only code change). Tab/label claims verified against `CARD_REGISTRY` +
`pillarLabel` + `profile-tabs.ts`.

## Result
The repo docs match the shipped convergence surfaces. (Vault Phase-4 docs — Glossary core terms, the
"Vibe Score Surface" → Sigil banner, Card Pillar roster — reconciled in `~/scoracleWiki` alongside.)
