# Cleanup #2 — rename stale "sigil" internal names on the Rating card

**Date:** 2026-06-18  ·  Frontend, deployed (Worker 223ea33a).

## Goal
Several internal names still called the Rating card "sigil" (pre-convergence, when the strength card
WAS the sigil). Rename them so "sigil" exclusively means the crown. The crown's own names
(`SigilCard`, `getSigil`, `sigil.server`, the `sigil` CardId, `bodies/vibe.ts`→crown) are CORRECT and untouched.

## What Was Done
- `utils/sigil-art.tsx` → `utils/rating-art.tsx`; `cards/bodies/sigil.ts` → `cards/bodies/rating.ts`
  (`sigilBodySvg`→`ratingBodySvg`, `SigilBodyInput`→`RatingBodyInput`, `sigilBody`→`ratingBody`).
- `.sigil-*` CSS → `.rating-*` (RatingCard.css + its consumers RatingCard.tsx, rating-art.tsx). No collisions.
- **User-facing leaks fixed:** RatingCard `aria-label="Sigil"` → `"Rating"`; empty state
  `"No sigil rating yet."` → `"No rating yet."`
- Stale comments (RatingCard.tsx/.css, bodies/rating.ts, rating-art.tsx) sigil→peak/rating.

## Left for #3 / flagged separately
- `divined_sigil` (Gemma strength column) — the #3 handoff item.
- **FLAGGED (separate bug, not a rename):** `og-bodies.ts metaBody` (profile-share OG) mislabels its
  pillars post-convergence — peak skill labeled "Sigil" (line 219) and the crown sigil score
  (`getSigil().current.score`) labeled "Vibe" (line 224), with the real Vibe sentiment missing. The
  in-app `EntityMeta` does Rating·Sigil·Vibe correctly; the OG drifted. See the handoff doc.

## Verification
tsc clean · 113 tests · build · deployed. Live: rating tab `aria-label="Rating"`; `/og/rating`,
`/og/meta`, `/og/sigil` all 200 image/png (confirms the `bodies/rating` rename renders).
