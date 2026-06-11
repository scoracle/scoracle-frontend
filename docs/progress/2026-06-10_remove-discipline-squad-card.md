# Remove the Discipline & Squad context card

**Date:** 2026-06-10

## Goal

Keep the Composite simple: offense + defense for teams, one card for players. The
z-score default surfaced a third "Discipline & Squad" chips card for the newly
non-templated entities (teams, football players) — Scott: remove it. (A special-teams
/ set-piece / dead-ball card is a possible future add, not needed at launch.)

## What was done

- **`CompositeCard.tsx`** — removed the `chips()` helper and the "Discipline & Squad"
  `<Shell>` it rendered. Teams now show exactly Offense + Defense; players show one card.

## Files changed

- `src/components/solid/CompositeCard.tsx`

## Verification

`npm run typecheck` clean; `npm test` 119/119.
