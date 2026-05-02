# Component strategy breakthrough — Skeleton primitive + uniform data layer

**Date:** 2026-05-02
**Scope:** A philosophical pivot crystallized into code. Three concrete artifacts: a global Footer, a `<Skeleton />` platform primitive, and full alignment of every async data load on the site to `createAsync` + `query()`. Plus several SPA-feel polish items along the way (sticky-footer layout, card-flip overflow clip, Suspense-free navigation, NavProgress deletion).

The full philosophical write-up lives in `~/scoracleWiki/wiki/Architecture/Component Strategy.md`. This doc is the per-commit changelog mirror.

## Goal

Stop building one-off CSS skeletons + ad-hoc data fetchers per component, start composing platform-portable primitives. Every reusable piece in `scoracle-frontend` today is a piece that moves to `@scoracle/ui` when `scoracle-sandbox` lands. If we build it right, that move is `git mv`, not rewrite.

## What Was Done

### Global footer + sticky-footer flex layout

- `src/components/solid/Footer.tsx` + `.css` — single global trademark/logo disclaimer ported verbatim from the Astro flagship's `Layout.astro`. Renders under every route.
- `src/global.css` — `body` + `#app` + `#app > main` flex column so the footer pins to viewport bottom on short pages and flows naturally on long ones.
- `src/routes/profile.css`, `src/routes/index.css` — removed the `min-height: calc(100vh - 3.5rem)` rules that were forcing a viewport-size scroll wasteland. The new flex layout handles this.
- `src/routes/profile.css` — `.card-flip-container` gets `overflow: hidden` so the absolutely-positioned `.card-flip-back` (which carries the stats card's tall intrinsic height) doesn't extend the page's scrollHeight past the visible content. Was a real bug on player profiles where Stats had more content than News.

### `<Skeleton />` — the platform primitive

`src/components/solid/Skeleton.tsx` + `.css`. Three intent-based shapes (`line`, `circle`, `block`) with optional `width` / `height` props. One pulse keyframe drives every animation; one `prefers-reduced-motion` rule pauses them all.

Replaces:
- 3 separate pulse keyframes (`tab-pulse`, `pw-pulse`, `stats-pulse`)
- 6+ skeleton-specific CSS classes (`skeleton-line`, `skeleton-circle`, `tab-skeleton-item`, `chart-skeleton-circle`, `skeleton-row-header`, `skeleton-cell`, `skeleton-header`, `.short`)
- 4 redundant reduced-motion guards

Migrated 7 consumer sites (EntityMeta, NewsTab, XTab, CoMentionsTab, VibesTab, TraitsTab, StatsTab, CompareTab). Visual output is byte-identical; the primitive is now the single source.

The component takes no flagship-specific imports — it's ready to `git mv` to `@scoracle/ui` when the second product needs it.

### NavProgress deleted; root `<Suspense>` removed

The router's transition was waiting for the new route's resources to resolve before swapping content (the "click → silence → page appears" problem). Removing the root `<Suspense>` from `src/app.tsx` lets the new route render immediately with each consumer's `<Show fallback={<Skeleton />}>` handling its own loading state — the **skeleton is the navigation feedback**.

That made `NavProgress.tsx` redundant; deleted (the spinner was solving the absence-of-skeletons problem).

Streaming SSR for cold loads still works — the streaming boundaries are per-resource inside `createAsync`, not at the root.

### Data-layer alignment — `createAsync` + `query()` everywhere

Three migrations to bring the last hold-outs in line with the rest of the codebase:

- **`EntityMeta`**: `createResource` → `createAsync`. New `getEntityMeta` query wraps the sync-or-async fetch (sync from `entityDataStore` if preloaded, async fallback via `loadMeta`). The component's render simplifies to `<Show when={entity() !== undefined} fallback={<Skeleton ... />}>`.
- **`CoMentionsTab`**: was the last component mixing `createResource` (entity directory) with `createAsync` (news + tweets). Wrapped `loadEntitiesForSport` in a new `getEntities` query, switched to `createAsync`. Component now reads uniformly.
- **`VibesTab`**: dropped the `metaReady` signal + the `setMetaReady(true)` callback from a `Promise.then`. Replaced with `createAsync(() => getSportMeta(sport))`. Names memo now gates on `meta() !== undefined`. Drops one signal + one imperative branch.

After this: **one primitive (`createAsync`), one cache (`query()`), one mental model — used identically everywhere.** Server-fns (`*.server.ts` with `"use server"`) for API data; plain queries (`*.ts`) gated on `!isServer` for bundled-JSON / client-only data. Same shape, different sources.

## Files Changed

**Added**
- `src/components/solid/Footer.tsx`, `.css`
- `src/components/solid/Skeleton.tsx`, `.css`
- `docs/progress/2026-05-02_component-strategy-breakthrough.md`
- `~/scoracleWiki/wiki/Architecture/Component Strategy.md` (vault — philosophical write-up)

**Deleted**
- `src/components/solid/NavProgress.tsx`, `.css`

**Modified — layout / structural**
- `src/app.tsx` — Footer wired in, NavProgress + Suspense removed
- `src/global.css` — sticky-footer flex on `body` + `#app` + `#app > main`
- `src/routes/profile.css` — removed `min-height: calc(100vh - 3.5rem)`; added `overflow: hidden` on `.card-flip-container`
- `src/routes/index.css` — removed `min-height: calc(100vh - 3.5rem)`

**Modified — Skeleton migration**
- `src/components/solid/{EntityMeta,NewsTab,StatsTab,XTab,VibesTab,CoMentionsTab,TraitsTab,CompareTab}.tsx`
- `src/components/solid/{EntityMeta,StatsTab,TraitsTab,content-tabs}.css` — removed dead skeleton-specific rules

**Modified — data-layer alignment**
- `src/components/solid/EntityMeta.tsx` — `createResource` → `createAsync`, `getEntityMeta` query
- `src/components/solid/CoMentionsTab.tsx` — entities now `createAsync` via `getEntities` query
- `src/components/solid/VibesTab.tsx` — `metaReady` signal replaced with `createAsync(getSportMeta)`

**Vault**
- `~/scoracleWiki/wiki/Architecture/Component Strategy.md` — new note with the principle
- `~/scoracleWiki/wiki/Architecture/Frontend Architecture.md` — added 5th pillar reference + skeleton-first nav amendment to pillar 3
- `~/scoracleWiki/wiki/Architecture/Platform Architecture.md` — `@scoracle/ui` extraction posture updated

## Verification

- `npm run typecheck` — green.
- `npm run build` — green. Server `profile-*.js` unchanged at ~120 KB; client bundle smaller (~8 KB CSS reduction from skeleton consolidation).
- `npm test` — 67/67 passing.
- Manual (dev server + production deploy):
  - SPA navigation between profiles: shell + skeletons appear instantly on click; data fills in as it arrives.
  - Skeleton-first works on cold loads too (skeleton briefly visible, then content streams in).
  - Footer sits at viewport bottom on short profiles; flows below content on long profiles.
  - Card-flip between News and Stats shows no scroll wasteland regardless of which face is taller.
  - Reduced-motion preference still honored (single keyframe, single override).

## Result

The data-fetching layer and the visual loading-state layer are both **single-primitive** now. The next tab someone adds is a copy-paste of any existing one. The next site that joins the platform extracts its base components from `scoracle-frontend` mechanically — no rewrite. The "snappy + simple" pillars hold; "platform-portable primitives" gets added as the fifth pillar in [[Frontend Architecture]] and the canonical principle in [[Component Strategy]].

This was the philosophical pivot the user named in the May 2026 session: *creating reusable components that we can use across websites, while sticking with core concepts like snappiness*. Captured in code, captured in the vault, ready to extract when the second product lands.
