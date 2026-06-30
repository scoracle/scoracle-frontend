# 2026-06-30 — Visual brand cleanup

## Goal
Tighten the web aesthetic around the shared token vision: light-only chrome,
quiet controls, data-only color, and stable card interactions.

## What Was Done
- Returned the persistent header to the warm neutral field instead of inverted
  dark chrome.
- Flattened select/search/compare overlay panels by removing mini-card shadows.
- Turned News headline category badges into quiet metadata labels.
- Removed the oversized Stats hover pop so card interactions stay stable.
- Replaced ad debug `accent` usage with neutral tertiary ink.
- Fixed OG token consumption to match the generated CommonJS token package.

## Files Changed
- `src/components/solid/Header.css`
- `src/components/solid/Select.css`
- `src/components/solid/SearchControl.css`
- `src/components/solid/CompareControl.css`
- `src/components/solid/NewsCard.css`
- `src/components/solid/StatsCard.css`
- `src/components/solid/AdSlot.css`
- `src/components/solid/GutterAds.css`
- `src/lib/cards/bodies/token-hex.ts`

## Verification
- `npm run typecheck`
- `npm run build`
- `npm run audit:clients` from `scoracle-tokens`
- `git diff --check`

## Result
The web client keeps the card bedrock intact while reducing off-brand variance
in persistent chrome, controls, metadata badges, and hover behavior.
