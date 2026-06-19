# Fix the `metaBody` OG mislabel — Rating · Sigil · Vibe

**Date:** 2026-06-18  ·  Frontend.

## Goal
Close Item B of the [[Handoff - divined_sigil rename + OG meta fix]]. The default profile-share OG
card (`metaBody`) drifted during the Sigil convergence and mislabeled its pillars: it showed the
**peak skill** labeled "Sigil" (the crown's label on the wrong value) and the **crown sigil score**
(`getSigil().current.score`) labeled "Vibe", while the real Vibe sentiment was never fetched. Rework
it to mirror the in-app `EntityMeta` exactly — the three convergence scores **Rating · Sigil · Vibe**.

## What Was Done
- `metaBody` (`src/lib/cards/og-bodies.ts`) now fetches `getStats` + `getSigil` + **`getMomentum`**
  and pushes three pillars matching `EntityMeta`:
  - **Rating** — the statistical end product. Type-conditional: `rating_composite_score` for players
    (magnitude), `rating_composite_rank` for teams (percentile). (Was: rank for all types.)
  - **Sigil** — the crown synthesis score (`getSigil().current.score`), centred, for **both** types.
    (Was: mislabeled "Vibe".)
  - **Vibe** — the emotional end product: the latest day of the momentum sentiment series
    (`entity_season_sentiment_series` → newest `sentiment_avg`). (Was: missing entirely.)
- **Peak-skill pillar dropped** — the in-app meta does not show it as its own pillar (product call,
  locked with Scott). The peak datapoint still lives on the Rating card / `/og/rating`.
- Local `vibe` var renamed `sigil` (it holds the crown, not the vibe) — de-confuses the read.

## Files Changed
- `src/lib/cards/og-bodies.ts` — `metaBody()` reworked (one function).

## Verification
- `tsc --noEmit` clean (validates every new field access: `rating_composite_score`,
  `entity_season_sentiment_series`, `sentiment_avg`, `sigil.current.score`).
- `vitest run` — 113/113 pass, no regressions.
- Structural parity with the live, proven `EntityMeta.tsx` (Rating·Sigil·Vibe sources/labels).
- Visual `/og/meta/{sport}/{type}/{id}` render eyeballed on the deploy (dev uses a relative API base
  with no local backend, so the pixel check is done against the live wiring — same as prior OG work).

## Result
The profile-share OG card now tells the same three-score story users see in-app: Rating, the crowned
Sigil, and the real Vibe sentiment — no more crown-labeled-as-Vibe or peak-labeled-as-Sigil. Closes
Item B; Item A (the `divined_sigil` → `divined_peak` column rename) is the remaining tail item.
