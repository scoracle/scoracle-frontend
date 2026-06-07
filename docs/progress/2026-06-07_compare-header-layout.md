# 2026-06-07 — Compare header layout: horizontal in-app + dual-header OG

## Goal
Let the butterfly (the star) breathe. In-app the names/scores were stacking
vertically; lay them out primary-left / vs / secondary-right and drop the
redundant "GENERAL" label. On the OG share card, give the two entities the same
treatment: primary top-left + secondary top-right, each with photo + meta
(position · team), instead of a single centered primary header.

## What Was Done
- **In-app** (`CompositeCard` CompareView + `StatsCard.css`): `.compare-headers`
  is now a `grid (1fr auto 1fr)` — primary left-aligned, "vs" centered, compared
  right-aligned (names wrap within their column). Removed the `compositeLabel`/
  scope label line. The butterfly gets the reclaimed vertical space.
- **OG dual header** (`lib/og/build-card.ts`): `BuildCardInput.compared` →
  `composeDualHeader`/`composeHeaderSide` render the primary top-left + compared
  top-right (photo + name + caps subtitle), mirroring the in-app layout. Non-compare
  cards keep the centered header.
- **OG route**: when `?vs=` is present, fetch the compared entity's facts + images
  and pass `compared` to `buildCardSvg`.
- **OG body** (`bodies/compare.ts`): names + meta moved to the dual header, so the
  body keeps only each scoped composite + its key swatch + "vs", then the butterfly
  (grown to maxR 220). `compareBody` no longer fetches entity facts (the route owns
  the header); dropped the now-unused name params + the `getOgEntityFacts` import.

## Files Changed
`components/solid/CompositeCard.tsx`, `components/solid/StatsCard.css`,
`lib/og/build-card.ts`, `routes/og/[cardType]/[sport]/[type]/[id].ts`,
`lib/cards/bodies/compare.ts`, `lib/cards/og-bodies.ts`.

## Verification
- `npm run typecheck` clean; `npm test` → 111 tests pass.
- In-app: compare header renders horizontal (primary left / vs / compared right),
  no "GENERAL"; butterfly below. OG dual header + body verify post-deploy (resvg
  wasm renders in prod only).

## Result
Compare reads cleanly on both surfaces: a left/right entity layout with the
butterfly as the focal point, and matching dual-entity headers (with meta) on the
shareable OG card.
