# Tier 1: streaming SSR via `query` + `createAsync` + `"use server"`

**Date:** 2026-04-27
**Scope:** The headline architectural piece from the optimization roadmap. Replaces the hand-rolled SWR cache + the data nanostores + the entire client-only fetch posture with SolidStart's framework-native data layer. The profile page now ships content-laden HTML on the first response, not skeletons.

## Goal

Before this commit: every profile page-view did `server-render shell → ship HTML → hydrate JS → fire 4-5 client fetches in parallel against api.scoracle.com → resolve → paint`. ~600–1200 ms of skeleton on cold cache.

After: the SSR pass calls the server fns directly (in-process), `query()` caches the results per-key, and SolidStart streams them inline alongside the shell. The client never re-fetches on the initial response — `createAsync` picks up the streamed data and hydrates it into the same `query()` cache. Result: real news titles, stat values, and vibe scores in the first byte of HTML.

## What Was Done

### `src/lib/data/*.server.ts` — five server-fn files

Each domain's API fetcher is now a `"use server"` function wrapped in `query(fn, name)` from `@solidjs/router`:

- `news.server.ts` — `getNews(sport, type, id)`
- `stats.server.ts` — `getStats(sport, type, id)` + the `StatsResponse` type
- `vibe.server.ts` — `getVibe(sport, type, id)` + the `VibeRow` type
- `twitter.server.ts` — `getTwitterStatus()` + `getTwitterFeed(sport, type, id, limit)` + the `Tweet` type (which migrated here from `src/stores/tweets.ts`)

The directive lives at function-level (`async function fetchXImpl(...) { "use server"; ... }`), not module-level. Module-level got ignored by the TanStack server-functions plugin in SolidStart 2.0-alpha.2 — verified via the build warning `"Module level directives ... was ignored"` and confirmed by inspecting the bundled output: with module-level the impl ended up in the client bundle; with function-level it's a 5-instance `createServerReference("<id>")` proxy on the client and the impl on the server.

The TanStack server-functions plugin is already wired by SolidStart's Vite preset — no `vite.config.ts` change needed.

### `src/components/solid/*Tab.tsx` — `createResource` → `createAsync`

Every tab's data resource now uses `createAsync(() => getXxx(...))` instead of `createResource(() => !isServer, fetcher)`. The `<Show when={data() !== undefined}>` loading-gate replaces the old `<Show when={!data.loading}>` because `createAsync` returns `T | undefined`, with `undefined` during the initial pending state.

`StatsTab` + `CompareTab` + `TraitsTab` all call `getStats(sport, type, id)` with the same arguments, so `query()`'s per-key cache means the request fires once per profile page-view and the result is shared across the three consumers. CoMentionsTab calls `getNews` and `getTwitterFeed` for the same reason — the cache is the only seam between consumers; no separate publish/subscribe layer.

### `src/stores/news.ts`, `src/stores/stats.ts`, `src/stores/tweets.ts` — deleted

The data nanostores are gone. Their consumers (`TraitsTab`, `CoMentionsTab`) read directly from the shared `query()` cache via `createAsync`. `$entityInfo` (derived state for `document.title`, position-group resolution) and `$currentSport` (cross-route concern) survive — both carry shape that isn't a raw fetch result.

### `src/lib/utils/api-fetcher.ts` — deleted

130 lines of hand-rolled SWR cache + ETag + dedup logic gone. `query()` provides the cache + dedup; the framework owns the SWR semantics now.

### `src/routes/profile.tsx` — `preload` export

Exports a `preload({ location })` function that calls each `query()`-wrapped fetcher for the URL params. SolidStart fires it on hover/focus of any `<A href="/profile?...">` link. By the time the user clicks, the cache is warm — fetches return immediately during the route render. (Tier 2 wires the `<A>` consumers in SearchBar.)

### `src/lib/utils/data-sources.ts` — server-side base URL resolver

`.env.development` ships `PUBLIC_GO_API_URL=/api/v1` (relative — works only via Vite's dev proxy on the browser). Server-side `fetch()` can't resolve relative URLs, so a small `resolveApiBase()` checks `isServer` + relative-shape and prepends `http://localhost:8000` in dev. Production already ships an absolute URL via `wrangler.jsonc` → no-op.

### Per-tab consequence touch-ups

- `VibesTab` re-introduced its `metaReady` ladder. The blurb-templating reads entity + team names from the local meta DB (bundled JSON, client-only); `createAsync` resolves on the server so the server-side run can't await the meta load. The metaReady signal flips client-side once `entityDataStore.loadMeta` resolves; the names memo re-derives and the blurb picks up the proper subject.
- `CompareTab` lost `mutateCompare` (createAsync has no `mutate`). The compare resource now reads `compared()` inside its fetcher; clearing the comparison via `setCompared(null)` resolves the resource to `null`, which is good enough — the chart overlay drops without a sync flush.
- `CoMentionsTab` keeps its `loadEntitiesForSport` as a `createResource` (bundled JSON, no API call → no benefit from server-fn migration). News + tweets come from `createAsync(() => getNews(...))` and `createAsync(() => getTwitterFeed(...))` — same query() cache as NewsTab + XTab.
- `StatsCard`'s docstring reference to `$statsData` retired; replaced with the cache-sharing description.

## Files Changed

**Added**
- `src/lib/data/news.server.ts`
- `src/lib/data/stats.server.ts`
- `src/lib/data/vibe.server.ts`
- `src/lib/data/twitter.server.ts`
- `docs/progress/2026-04-27_tier1-streaming-ssr.md`

**Deleted**
- `src/lib/utils/api-fetcher.ts`
- `src/stores/news.ts`
- `src/stores/stats.ts`
- `src/stores/tweets.ts`

**Modified**
- `src/lib/utils/data-sources.ts` — `resolveApiBase()` for server-side dev base URL
- `src/routes/profile.tsx` — `preload` route export
- `src/components/solid/NewsTab.tsx` — `createAsync(() => getNews(...))`
- `src/components/solid/StatsTab.tsx` — `createAsync(() => getStats(...))`; drop publish-effect
- `src/components/solid/XTab.tsx` — `createAsync(() => getTwitterFeed(...))`; drop publish-effect
- `src/components/solid/VibesTab.tsx` — `createAsync(() => getVibe(...))`; metaReady ladder reintroduced
- `src/components/solid/CoMentionsTab.tsx` — `createAsync` for news + twitter; entities stays as `createResource`
- `src/components/solid/CompareTab.tsx` — `createAsync(() => getStats(...))` for primary + comparison
- `src/components/solid/TraitsTab.tsx` — `createAsync(() => getStats(...))` (same cache as StatsTab)
- `src/components/solid/StatsCard.tsx` — docstring update

## Verification

- `npm run typecheck` — green.
- `npm run build` — green. **Build warnings about ignored module-level `"use server"` directives are gone** after the function-level migration. Bundle inspection: `dist/client/_build/assets/profile-*.js` contains zero `fetchNewsImpl` / `fetchStatsImpl` / `fetchVibeImpl` / `fetchTwitter*Impl` references; instead, 5 instances of `createServerReference("<sha-id>")` proxies. `dist/server/_build/assets/profile-*.js` contains all five impls.
- `npm test` — 67/67 passing.
- **Dev SSR end-to-end test:** `curl http://[::1]:5173/profile?sport=NBA&type=player&id=177` (Aaron Gordon) returns:
  - HTTP 200, 140 KB body (vs ~60 KB on the old skeleton-only SSR).
  - `Transfer-Encoding: chunked` — confirms streaming.
  - Real news titles + URLs inline: `<h3 class="news-title"><a href="https://news.google.com/rss/articles/...">`.
  - Real stat values inline: `<span class="stat-value">16.2</span>` (PPG), `5.9` (RPG), etc.
  - Two `<template>` streaming chunks for the resource hydration markers.
  - Zero `<div class="card-error">` blocks — no SSR fetch failures.
- **Production deploy gated on Cloudflare WAF triage.** The user's parallel task on the api.scoracle.com zone is to identify which managed WAF rule blocks origin-less worker fetches and exempt it. Without that, `cf:deploy`'d worker SSR fetches will 403 on the deployed surface; ErrorBoundary catches and shows "Couldn't load the News card. HTTP 403" with Try Again, which retries client-side and works (same recovery path as the previous regression). Once the WAF rule is exempted, the production SSR path streams the same content that dev does today.

## Result

The platform's data layer is now framework-native and platform-portable:

- **Streaming SSR works.** Real content in the first byte of HTML on a warm SSR. Skeletons collapse to a brief flash if the user arrives faster than the network.
- **`api-fetcher.ts` is gone.** 130 LOC of bespoke cache plumbing replaced by `query()` from the framework. The next site (`scoracle-sandbox`, `scoracle-fantasy`, etc.) copies the `*.server.ts` shape verbatim — no platform-shared cache to maintain.
- **The data nanostores are gone.** Cross-tab data flow is via the per-key `query()` cache. No separate publish/subscribe layer, no race between tab activation and store population, no nanostore-to-resource conversion logic.
- **`preload` route export is in place.** Tier 2's `<A>` + `useNavigate` will trigger it on hover; warm-cache profile→profile transitions will be instant.

## Next

- **Tier 2 (next):** wire `<A>` and `useNavigate` into `SearchBar.tsx` so the route's `preload` actually fires on hover. SearchBar suggestions become `<A href={profileUrl}>`; the existing `window.location.href` swap retires.
- **Cloudflare WAF triage (parallel, your task):** dashboard-side fix to allow worker→api.scoracle.com fetches. Until then, production SSR fetches 403 and the client falls back. Dev SSR is unaffected and verifies the migration end-to-end.
