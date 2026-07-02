# 2026-07-02 - Card Primitive Token Wiring

## Goal

Wire the frontend card vessel to the promoted `card-*` tokens from
`scoracle-tokens`.

## What Changed

- Updated global card chrome to use `card-radius`, `card-border-width`,
  `card-frame-inset`, `card-corner-offset`, and `card-corner-dot-size`.
- Replaced local card width/aspect definitions with token-backed
  `card-width-*` and `card-aspect-*` values, with fallbacks for older installed
  token packages.

## Files Changed

- `src/global.css`
- `progress_docs/2026-07-02_card-primitive-token-wiring.md`

## Verification

```bash
npm run build
```

Result: passed.

## Result

The web Shell/Card primitive now reads brand-defining card metrics from the
shared token contract.

## Follow-Up

- Remove fallbacks only after the published `@scoracle/tokens` package consumed
  by the frontend includes the new `card-*` tokens.
