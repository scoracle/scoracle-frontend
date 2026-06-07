# 2026-06-07 — Compare: entity color key + OG half-washes

## Goal
Restore the old-compare entity differentiation: the center divider, subtle
per-entity background tints, and a small color key next to each name — so it's
obvious which half of the butterfly is which entity. (In-app butterfly already had
the half-washes + divider via ButterflyChart; the key + the OG version were missing.)

## What Was Done
- **In-app** (`CompositeCard` CompareView + `StatsCard.css`): a color-key swatch
  next to each name — blue (`#5b8fc9`) before the primary (left half), mauve
  (`#b07ba0`) after the compared entity (right half), matching ButterflyChart's
  `--compare-primary-bg` / `--compare-secondary-bg` half-washes.
- **OG** (`bodies/compare.ts`): added the two entity-tinted half-disc washes
  behind the butterfly (left `#e8eff8`, right `#f3ecf0`) — mirroring
  ButterflyChart's `BackgroundHalf` — plus the matching key swatches beside each
  name in the headline. The center divider was already present.

## Files Changed
`components/solid/CompositeCard.tsx`, `components/solid/StatsCard.css`,
`lib/cards/bodies/compare.ts`.

## Verification
- `npm run typecheck` clean; `npm test` → 111 tests pass.
- Live (dev vs prod): in-app compare shows the blue/mauve half-washes, the center
  divider, and the key swatches next to Jokić (blue) / Luka (mauve). OG washes +
  keys verify post-deploy (resvg wasm renders in prod only).

## Result
Compare differentiation matches the old design: divider + subtle per-entity
backgrounds + color key, consistent across the in-app butterfly and the OG share card.
