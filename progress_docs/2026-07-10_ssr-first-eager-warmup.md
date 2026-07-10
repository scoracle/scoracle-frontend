# 2026-07-10 - SSR-First Profile Warmup

## Goal

Break the old preload-all SSR path while preserving Scoracle's eager product UX for top-level users.

## What Changed

- Split profile product warming into a named `warmProfileProducts` pass.
- Limited SolidStart route preload to entity meta plus the landing/active card.
- Passed `newsScope` through the News registry preload so warm keys match card reads.
- Changed `ContentShell` to render only the active pane for SSR and the first hydration pass, then mount all panes after `onMount`.
- Added pane-local error boundaries so hidden product failures cannot replace the whole content shell.
- Made EntityMeta's season-aware subtitle and score chips post-hydration enhancements with isolated Suspense/ErrorBoundary wrappers.
- Pruned duplicate entity-change warming so product warmup runs once per entity/product scope.
- Made ContentShell's stats control resource conditional so News/Sigil SSR does not create a Stats read.
- Hid the post-hydration score row when no score chips have rendered.

## Files Changed

- `src/routes/profile.tsx`
- `src/components/solid/ContentShell.tsx`
- `src/components/solid/ContentShell.css`
- `src/components/solid/card-registry.tsx`
- `src/components/solid/EntityMeta.tsx`
- `src/components/solid/EntityMeta.css`
- `src/lib/data/entities.ts`
- `src/lib/data/sport-meta.ts`
- `src/lib/utils/entity-name.ts`
- `src/routes/profile-preload.test.ts`
- `README.md`
- `docs/ARCHITECTURE.md`

## Verification

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run cf:build`
- `rg "Uncaught Client Exception" dist -n` returned no matches

## Result

Crawler/review HTML now stays focused on route identity, metadata, navigation, and the active card. Top-level hydrated browsers still eagerly warm and mount every product surface after the entity is known.

## Follow-Up

- Add browser smoke coverage for SSR/no-JS and cross-origin preview framing.
- Retire the SolidStart error-boundary patch once the framework exposes a supported production fallback hook.
