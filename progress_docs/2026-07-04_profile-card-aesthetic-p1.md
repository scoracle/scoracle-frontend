# 2026-07-04 — Profile card aesthetic P1 pass

## Goal

Execute the P1 items from the 2026-07-03 profile-card aesthetic audit without
changing product contracts or crossing into the larger token/backend follow-ups.

## What Changed

- Added data-bearing corner labels to profile cards where the served product
  already carries scope:
  - Stats / Rating / Trends / Roster use the resolved season year.
  - News uses the active news scope, preferring `WK N` from the served scope
    start date and falling back to a compact scope label.
- Changed `EmptyCard` so the parenthetical note defaults to empty instead of
  leaking the News-specific "(no mentions found)" text onto Stats/Rating/Roster.
- Set the Trends hero score back to regular display weight and updated the
  stale fixed-color comment.
- Made Roster list headers neutral so they no longer promise fixed series
  colors while row values use tier colors.
- Removed sticky positioning from the News identifier so it reads as card
  content, not an app toolbar.
- Renamed Sigil card aria labels from "Vibe" to "Sigil".

Also copied the full audit into `../scoracle-wiki/progress_docs/` so the
cross-repo aesthetic findings are discoverable from the shared docs.

## Files Changed

- `src/components/solid/EmptyCard.tsx`
- `src/components/solid/StatsCard.tsx`
- `src/components/solid/RatingCard.tsx`
- `src/components/solid/NewsCard.tsx`
- `src/components/solid/MomentumCard.tsx`
- `src/components/solid/RosterCard.tsx`
- `src/components/solid/SigilCard.tsx`
- `src/components/solid/MomentumCard.css`
- `src/components/solid/RatingList.css`
- `src/components/solid/NewsCard.css`
- `../scoracle-wiki/progress_docs/2026-07-03_profile-card-aesthetic-audit.md`

## Verification

- `npm run typecheck` clean.
- `npm test` passes: 20 files / 130 tests.
- `npm run build` passes for client and SSR bundles.

## Result

The small P1 doctrine fixes are landed while leaving P2/P3 work intact:
micro-label/token consolidation, deck-back loading states, shared identifiers,
Sigil visual peak, trajectory-first Momentum, sparkline mass, and avatar
framing remain follow-ups.

## Follow-Up

- Continue with the P2 system pass once token ownership is decided for
  eyebrow/micro-eyebrow cuts.
- Do not derive Momentum direction client-side; wait for or verify the backend
  payload contract before changing the Trends headline.
