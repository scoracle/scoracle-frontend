# Peel-back simplification — strip the Astro-port layers

**Date:** 2026-05-02
**Scope:** Three-phase strip-down of accumulated mechanical complexity in the profile route. Removed the flip card mechanism, made TabContainer render only the active tab, code-split each tab via `lazy()`. Result: ~150 lines deleted, 62.7% reduction on the initial profile JS chunk.

## Goal

Today's earlier session crystallized the org-level vision (pillar repos vs feature repos — see `2026-05-02_pillar-vs-feature-clarity.md`). For that model to work, each tab must be self-contained — own its mount lifecycle, data fetches, loading state, and code chunk. The flagship was carrying three blockers from the Astro port:

1. **Flip card** — 3D `rotateY` transform with both faces mounted simultaneously, ResizeObserver tracking heights, `min-height` JS coordination.
2. **All-tabs-mounted TabContainer** — `<For>` rendered every panel; `display: none` toggled inactive ones. Every tab's component function ran on TabContainer mount, every `createAsync` fired.
3. **No code-splitting per tab** — every tab statically imported. Profile-page load downloaded JS for every tab whether opened or not.

This work strips all three.

## What Was Done

### Phase 1 — Single-card slot replaces the flip card

`src/routes/profile.tsx` + `profile.css` lost the flip-card mechanism entirely:

- Dropped `flipContainerRef`, `frontRef`, `backRef`.
- Deleted the `onMount` block's ResizeObserver wiring (`updateHeight`, observer setup, view-change `createEffect`, `onCleanup` disconnect). Kept only the `entityDataStore.preloadAll()` call.
- Replaced the `card-flip-container` / `card-flip-inner` / `card-flip-front` / `card-flip-back` JSX with a single `<Show when={view() === "stats"} fallback={<NewsCard/>}><StatsCard/></Show>` — only the active card mounts.
- Stripped `card-flip-*` CSS rules (~50 lines) including the `overflow: hidden` workaround and the reduced-motion guard for the flip.
- Added a thin `.profile-card-slot` wrapper for max-width.

**Visual transition:** instant swap. No CSS transition, no animation. Click toggle → unmount old card → mount new card. Skeleton briefly visible only when the new card's data is cold; warm tabs (via query() cache + hover preload) render content instantly. The fastest swap is the one with no transition.

Removed `onCleanup` import (no longer used).

### Phase 2 — TabContainer renders only the active tab

`src/components/solid/TabContainer.tsx` — `TabDef.content` changed from `JSX.Element` to `() => JSX.Element` (thunk). Render now uses `<Show when={activeTab() === tab.id}>{tab.content()}</Show>`. Inactive tabs aren't in the DOM; their component functions don't run; their `createAsync` resources don't fire.

`src/components/solid/{NewsCard,StatsCard}.tsx` — wrap each tab content in arrow functions: `content: () => <NewsTab />`.

`src/components/solid/TabContainer.css` — dropped `.tab-panel { display: none }` / `.tab-panel.active { display: block }` rules. Only the active panel exists in the DOM now; `display: block` is the div default.

Each tab is now truly self-contained — its lifecycle starts on activation, not on parent mount. Tab switching unmounts → mounts; query() cache makes the data hit cheap on warm switches.

### Phase 3 — `lazy()` per tab for code-splitting

`src/components/solid/{NewsCard,StatsCard}.tsx` — replaced static tab imports with `lazy()`:

```tsx
import { lazy } from "solid-js";
const NewsTab = lazy(() => import("./NewsTab"));
const XTab = lazy(() => import("./XTab"));
// ...
```

Vite builds a separate chunk per `lazy()` call. Combined with Phase 2's deferred mounting: a tab's chunk only loads when the tab is first activated. Each tab is already inside a per-component `<Suspense fallback={<Skeleton/>}>` (commit 48c21a8), so the Suspense boundary catches both the chunk-load suspension and the data-load suspension — same UX, no additional code needed.

## Files Changed

**Modified**
- `src/routes/profile.tsx` — flip refs + onMount ResizeObserver block deleted; flip JSX replaced with single-slot Show; `onCleanup` removed from imports
- `src/routes/profile.css` — ~50 lines of card-flip-* rules + reduced-motion guard removed; thin `.profile-card-slot` added
- `src/components/solid/TabContainer.tsx` — `TabDef.content` is now a thunk; render uses Show conditional; doc comment updated to reflect lazy-mount + pillar-primitive framing
- `src/components/solid/TabContainer.css` — `.tab-panel` display toggle removed
- `src/components/solid/NewsCard.tsx` — tabs lazy-imported, content thunked, doc comment updated
- `src/components/solid/StatsCard.tsx` — same pattern as NewsCard

## Verification

- `npm run typecheck` — green at each phase.
- `npm test` — 67/67 passing at each phase.
- `npm run build` — green at each phase.
- Build output:
  - Phase 1 baseline: `profile.js` 93.56 KB (gzip 28.01 KB)
  - Phase 2 (deferred mount, no splitting): unchanged at 93.56 KB — tabs all still in profile chunk, just not mounted
  - Phase 3 (lazy per tab): **profile shell 34.85 KB** (gzip 11.71 KB) + per-tab chunks (NewsTab 1.65 KB · XTab 2.65 KB · TraitsTab 3.95 KB · VibesTab 5.48 KB · CoMentionsTab 6.27 KB · CompareTab 6.56 KB · StatsTab ~8.4 KB)
  - **62.7% reduction on initial profile JS** — exceeds the plan's 20-40% estimate.

## Result

The profile page is now structurally what the org-level vision describes:

- **One card slot, one mounted card, one mounted tab at a time.** Each tab owns its lifecycle, its data, its loading state, its code chunk.
- **62.7% smaller initial bundle.** Subsequent tabs load on click, cached after first activation.
- **TabContainer is a pillar primitive.** It doesn't know what a tab is; the project repo (`scoracle-frontend`) hands it tabs. When `scoracle-sandbox` lands, it will compose the same primitive with its own `LineupTab`, `RosterTab`, etc. — no changes to TabContainer required.
- **No flip-card mechanics, no ResizeObserver, no transform-based 3D coordination.** The simplest swap is the one with no transition.

The pillars line up: snappy because lazy, lazy because tabs are self-contained, self-contained because each owns its mount lifecycle. Per-component `<Suspense fallback={<Skeleton/>}>` covers cold paths. Hover-preload + query() cache cover warm paths.

Next: DNS cutover when the user gives the green light. Then `@scoracle/ui` extraction when sandbox kicks off — by which point the primitives that move are exactly the shape-pure ones that survived this peel-back.
