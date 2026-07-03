# 2026-07-03 - NavRail Selection Primitive

## Goal

Unify Scoracle's tab, scope, mode, and selector rail vocabulary behind one
brand primitive while preserving the product distinction between tabs and
scopes.

## What Changed

- Added `NavRail` as the platform selection rail primitive.
- Added `NavRailStack` as the page-level composition for item rail + optional
  scoped-control rail.
- Replaced `NavStrip` item rails with `NavRail` on home, profile content,
  leaderboard, and the leaderboard launcher.
- Replaced `ScopeStrip` control rows with child-composed `NavRail` control
  rails in profile content and leaderboard controls.
- Kept semantics distinct: item rails render `tablist`; mixed control rails
  render labelled `group` rows and let child controls keep their own roles.
- Updated README and architecture guidance so future work reuses shared brand
  primitives before adding surface-specific controls.
- Replaced `ScopeStrip` component coverage with `NavRail` tests for both item
  and control rails.

## Files Changed

- `src/components/solid/NavRail.tsx`
- `src/components/solid/NavRail.css`
- `src/components/solid/NavRail.test.tsx`
- `src/components/solid/NavRailStack.tsx`
- `src/components/solid/NavRailStack.css`
- `src/components/solid/NavRailStack.test.tsx`
- `src/components/solid/ContentShell.tsx`
- `src/components/solid/LeaderboardMenu.tsx`
- `src/routes/index.tsx`
- `src/routes/leaderboard.tsx`
- `README.md`
- `docs/ARCHITECTURE.md`

Retired:

- `src/components/solid/NavStrip.tsx`
- `src/components/solid/NavStrip.css`
- `src/components/solid/ScopeStrip.tsx`
- `src/components/solid/ScopeStrip.css`
- `src/components/solid/ScopeStrip.test.tsx`

## Verification

- `npm run typecheck` - clean
- `npm test` - 18 files / 127 tests passed
- `npm run build` - clean client and SSR build
- Local dev SSR smoke:
  - `http://127.0.0.1:5173/` - 200
  - `http://127.0.0.1:5173/leaderboard?sport=NBA` - 200
  - `http://127.0.0.1:5173/profile?sport=NBA&type=player&id=237` - 200

## Result

The web repo now has one reusable selection rail primitive. Product tabs,
sport selectors, and board selectors use item rails; seasons, scopes, modes,
compare, and search compose inside control rails. This lines up the flagship web
implementation with the intended cross-product `scoracle-tokens` vocabulary
without turning scopes into product tabs.

## Follow-Up

- `scoracle-tokens` doctrine was updated in companion progress doc
  `../scoracle-tokens/progress_docs/2026-07-03_navrail-doctrine.md`.
- Implement `NavRail` and `NavRailStack` equivalents in `scoracle-ios`.
