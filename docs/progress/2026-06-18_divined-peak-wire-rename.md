# Rating card: `divined_sigil` → `divined_peak` (Item A frontend cutover)

**Date:** 2026-06-18  ·  Frontend.

## Goal
Match the backend's `divined_sigil` → `divined_peak` wire rename (handoff Item A — the Gemma-divined
peak-strength label, the Rating card hero). The backend `/rating` payload now emits `divined_peak`.

## What Was Done
- `src/lib/data/rating.server.ts` — `StatCommentary.divined_sigil` → `divined_peak` (+ doc comment;
  marker note updated `SIGIL:` → `PEAK:`).
- `src/components/solid/RatingCard.tsx` — hero-label consumer `commentary()?.divined_sigil`
  → `divined_peak` (+ comment).

The card already falls back `?? breakdownLabel` when the field is null, so the brief window between the
backend deploy and this frontend deploy degraded the hero to the engine label (not a crash); this deploy
restores the Gemma-divined label.

## Files Changed
`src/lib/data/rating.server.ts` · `src/components/solid/RatingCard.tsx`.

## Verification
`tsc --noEmit` clean · 113/113 vitest. Backend `/rating` confirmed emitting `divined_peak` (e.g.
player 237 → "Playmaking"). Live render checked on deploy.

## Result
The Rating hero label reads the renamed `divined_peak` wire key end-to-end. Closes the frontend side of
the Sigil-convergence tail (paired with the backend `divined_peak` rename and the Item B metaBody fix).
