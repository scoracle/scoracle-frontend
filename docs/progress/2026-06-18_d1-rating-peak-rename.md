# D1 — rating_sigil* → rating_peak* (frontend cutover)

**Date:** 2026-06-18
**Commit:** deployed (Worker bafdbe49).

## What Was Done
Mirrored the backend wire rename of the peak datapoint:
- Top-level `rating_sigil*` → `rating_peak*` in leaderboard/roster/rating/stats server types + the
  two consumers (`og-bodies.ts` peak label, `RosterCard.tsx` peak score) + `stats.test.ts`.
- Nested `rating_modes` keys `sigil*` → `peak*` in `RatingModeBlock` + `RatingView` (stats.server.ts)
  + the `stats.test.ts` fixtures/assertions. (No component reads `view.sigil*` — only the type + test
  did; the Rating card uses the separate `divined_sigil` strength text, which stays.)
- Stale doc comments that called the peak datapoint "sigil" → "peak" (incl. rating.server.ts's header,
  which also mislabeled itself as the "/sigil" fetcher — it fetches `/rating`).

## Left as-is
- `getSigil` (crown fetcher), the `sigil` CardId entries, `.sigil-*` CSS classes, and the `sigilBody`
  OG renderer internal names — not wire fields; renaming is separate internal churn with no contract value.
- `divined_sigil` (separate Gemma strength column).

## Verification
tsc clean · 113 tests · build · deployed. Live: roster tab renders peak scores (72.8 Luka, 59.3, 58.9)
via `rating_peak_score`; player/team/rating profile pages all 200. Coordinated with the backend deploy
(backend first, frontend immediately) — the only window-exposed surfaces were the roster peak column +
OG peak label (RatingCard doesn't read the top-level peak fields); ~1 min, self-healed.

## Result
The peak datapoint is `rating_peak*` end to end; "sigil" is exclusively the crown.
