# 2026-06-29 - Token hex OG cleanup

## Goal

Remove the remaining token-drift warnings from hardcoded token hex values in
share/OG SVG renderers.

## What Changed

- Added `src/lib/cards/bodies/token-hex.ts`, which reads hex values from
  `@scoracle/tokens`.
- Replaced scattered token hex literals in share-card body SVG modules and
  `build-card.ts` with `TOKEN_HEX`.
- Kept renderer-only literal colors that are not token values, such as compare
  key swatches.
- Moved the global `.eyebrow` font role from `font-body` to `font-ui` so web
  labels match the shared display/body/UI/numeric topic.

## Verification

Ran:

```bash
npm run typecheck
npm run build
```

Result: pass.

## Result

The `scoracle-tokens` cross-client audit reports zero warnings.
