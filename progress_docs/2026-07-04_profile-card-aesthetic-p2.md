# 2026-07-04 — Profile card aesthetic P2 pass

## Goal

Execute the frontend-owned P2 items from the 2026-07-03 profile-card aesthetic
audit: shared card identifiers, deck-back whole-card loading, Rating whitespace
polish, and profile-card micro-label consolidation.

## What Changed

- Added shared profile-card type cuts in `content-cards.css`:
  - `card-identifier` for quiet opening/context lines.
  - `card-eyebrow` for section/scope labels.
  - `card-micro-eyebrow` for score, axis, and table captions.
- Added identifier lines to sparse cards:
  - Stats: `Season stats, <scope> scope`.
  - Compare Stats: `Season comparison, <scope> scope`.
  - Trends: `Season trajectory, rating and vibe`.
  Existing Rating and News identifier lines now use the same shared class.
- Replaced whole-card Suspense skeletons with `LoadingCard`, a deck-back loading
  face using `public/vibe-art/deck-back.svg`.
  Partial in-card loading remains on `Skeleton` in EntityMeta.
- Removed RatingCard's decorative grid divider and widened the grid rhythm so
  whitespace separates the hero from the supporting grid.
- Consolidated profile-card micro-labels across EntityMeta, Stats, Rating,
  Trends, News, Roster, and Transfers onto the shared cuts.

## Files Changed

- `src/components/solid/LoadingCard.tsx` (new)
- `src/components/solid/content-cards.css`
- `src/components/solid/EntityMeta.tsx`
- `src/components/solid/EntityMeta.css`
- `src/components/solid/StatsCard.tsx`
- `src/components/solid/StatsCard.css`
- `src/components/solid/RatingCard.tsx`
- `src/components/solid/RatingCard.css`
- `src/components/solid/NewsCard.tsx`
- `src/components/solid/NewsCard.css`
- `src/components/solid/MomentumCard.tsx`
- `src/components/solid/MomentumCard.css`
- `src/components/solid/RosterCard.tsx`
- `src/components/solid/RatingList.css`
- `src/components/solid/SigilCard.tsx`
- `src/components/solid/TransfersCard.tsx`

## Verification

- `npm run typecheck` clean.
- `npm test` passes: 20 files / 130 tests.
- `npm run build` passes for client and SSR bundles.

## Result

The page now has one frontend-level identifier idiom, one frontend-level
eyebrow/micro-eyebrow idiom for profile cards, and a branded loading state for
whole-card uncertainty.

## Follow-Up

- Promote the shared type cuts into `scoracle-tokens` only if the same concrete
  cuts are needed outside the web app.
- P3 remains: Sigil visual peak, trajectory-first Momentum headline, sparkline
  mass, and boxed avatar exploration.
