# 2026-06-29 - Token drift first cleanup

## Goal

Begin reducing the `scoracle-tokens` client drift audit warnings without
changing product behavior.

## What Changed

- Replaced stale undefined CSS aliases with existing token variables:
  `--text-primary`, `--text-muted`, `--bg-hover`, `--border-subtle`, and
  old status-color aliases.
- Replaced local undefined spacing/type aliases in `SigilCard.css` with concrete
  component-local values.
- Replaced `--weight-bold` with `--weight-semibold`, matching the token scale.
- Tightened news category and scope controls from pill radius to small boxed
  radius to better match the root aesthetic vision.

## Files Changed

- `src/components/solid/NewsCard.css`
- `src/components/solid/SearchControl.css`
- `src/components/solid/Select.css`
- `src/components/solid/SigilCard.css`
- `src/components/solid/StatsCard.css`
- `src/routes/profile.css`

## Verification

Ran:

```bash
npm run typecheck
npm run build
```

Result: pass.

`npm run build` needed normal write access to Vite's local
`node_modules/.vite-temp` cache.

## Result

The cross-client audit warning count dropped from 108 to 65 together with the
token-audit false-positive fix. Remaining warnings are hardcoded token hexes,
mostly in SVG/OG rendering code.
