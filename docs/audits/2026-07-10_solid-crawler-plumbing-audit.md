# 2026-07-10 - Solid + Crawler Plumbing Audit

## Context

AdSense review exposed a real architecture problem: a restricted Google preview iframe could trip SolidStart's client fallback and replace useful server HTML with `Error | Uncaught Client Exception`.

The emergency production fix is in place:

- Keep SolidStart `StartClient` for normal top-level users.
- Allow AdSense/Google preview framing through CSP.
- Skip hydration in cross-origin frames so AdSense keeps SSR HTML.
- Patch SolidStart's generic fallback string during build as a temporary guard.

Top-level production smoke after deploy `3ced94bf-c592-40b4-9f6a-f386d8c9c90f` passed: home rendered, the crystal ball logo populated, Rating navigation worked, search suggestions worked, and no page errors were captured.

## North Star

Crawler-friendly first, eager user experience second.

That does not mean lazy-loading the product. Eager load everything remains a critical Scoracle UX rule. The distinction is dependency order:

1. Serve complete, boring, useful SSR HTML for crawlers, ad reviewers, link unfurlers, and restricted preview frames.
2. Hydrate top-level browsers through SolidStart.
3. Eagerly mount/warm the rest of the product surfaces after the route/entity is known, so tabs and controls remain instant for real users.

Modern crawler compatibility means server HTML must not be a skeleton-only shell, a framework fallback, or a page that requires `localStorage`, iframe permissions, or client routing to explain itself.

## Findings

### 1. Runtime is async SSR, but docs still said streaming

`src/entry-server.tsx` deliberately uses `mode: "async"` because streamed Suspense markers previously caused hydration races and blank direct links. Several docs/comments still described streaming SSR. That mismatch makes future fixes dangerous because the written model no longer matches production.

Action taken in this audit pass: README, architecture notes, middleware comments, and root Suspense comments now describe async full-document SSR.

### 2. Bypassing `StartClient` is not acceptable

The direct-hydration experiment made AdSense happier for a moment, but it broke normal SolidStart behavior: buttons stopped navigating, the crystal ball logo did not populate, and search/autofill stopped working. SolidStart owns router hydration, event wiring, and route data adoption.

Decision: keep `StartClient` for top-level browsers. Any crawler/review hardening must work around restricted preview frames without breaking the framework's normal client contract.

### 3. The cross-origin iframe guard is a pragmatic shield, not the final architecture

`entry-client.tsx` currently skips hydration when the app is embedded in a cross-origin frame. This is correct for AdSense preview/review because the server-rendered page is what Google needs, and restricted iframe browser APIs should not be allowed to destroy it.

Long-term, this should become a verified crawler contract:

- top-level browser: hydrate and eager load
- same-origin frame: hydrate if needed
- cross-origin review frame: preserve SSR, no client takeover required

### 4. The SolidStart error-boundary patch is temporary debt

`scripts/patch-solidstart-error-boundary.mjs` modifies SolidStart's packaged fallback text before build. It keeps production from showing a generic framework error, but it is still a `node_modules` patch.

Exit criteria:

- upgrade SolidStart when a supported fallback/custom error path exists, or
- replace the patch with a documented app-level hook if the framework exposes one, and
- keep a smoke check that the production bundle does not contain `Uncaught Client Exception`.

### 5. Eager loading is right; the plumbing should make eagerness explicit

Current profile flow has two overlapping eager mechanisms:

- `profile.tsx` calls `firePreloads()` to warm every card query.
- `ContentShell` mounts every card pane eagerly, and each card reads its own product via `createAsync`.

The behavior matches the UX goal, but the responsibility is muddy. The cleaner Solid model is:

- route owns crawler-critical data and metadata
- a named eager warm pass owns "load everything else"
- cards own their product rendering and can rely on the warmed query cache

This keeps the critical HTML path understandable while preserving instant tab changes.

### 6. Define crawler-critical data per route

The current app can accidentally make hidden interactive products part of the first HTML dependency chain because async SSR waits on Suspense. We should make the contract explicit:

- `/`: brand, primary navigation/search affordance, crystal ball launcher content
- `/profile`: entity identity, title/description/OG/canonical, active/default card summary, stable card navigation
- `/leaderboard`: selected board title, controls, and initial ranked rows
- static/legal pages: complete content without JavaScript
- `/og/...`: image generation remains server-only

Everything outside that contract can still eager load for users, but should not be required for AdSense to understand the page.

### 7. Browser-only enhancements need hard boundaries

Storage, search indexes, recent entities, and bundled entity directories are fine as client enhancements. They must not be able to throw during app boot or erase SSR content in privacy/iframe contexts.

`AppRail` now guards `localStorage.setItem`. Continue this pattern anywhere browser APIs are touched.

### 8. Verification should include crawler-like modes

Vitest caught utilities, but not the AdSense failure. The recurring checks should include:

- production or local headless top-level smoke: render home, click Rating, search LeBron
- SSR HTML smoke with JavaScript disabled or not executed
- synthetic cross-origin iframe smoke that confirms the page does not hydrate over SSR
- header smoke for CSP `frame-ancestors` and absence of `X-Frame-Options: DENY`
- bundle smoke for absence of `Uncaught Client Exception`

## Refactor Plan

### Phase 1 - Lock the current contract

- Keep `StartClient`.
- Keep the cross-origin iframe guard.
- Keep eager product loading.
- Add automated browser smoke scripts for top-level and crawler-like modes.
- Keep docs aligned with async SSR.

### Phase 2 - Separate SSR critical data from eager product warmup

- Introduce a clearly named profile warm function, e.g. `warmProfileProducts(sport, type, id, season)`.
- Let route SSR own entity metadata and whichever card/content is part of the crawler contract.
- Run the full product warm pass after top-level hydration and on entity changes.
- Avoid duplicate "preload all" plus "mount all reads" unless both are explicitly justified.

### Phase 3 - Make card mounting Solid-native and crawler-safe

- Preserve instant tabs by keeping panes mounted or warming their queries immediately after hydration.
- Keep card-level Suspense/ErrorBoundary inside `ContentShell`.
- Ensure hidden/non-critical panes cannot blank the route or replace useful SSR.

### Phase 4 - Retire framework patching

- Test a SolidStart upgrade path.
- Remove the `node_modules` error-boundary patch when supported framework behavior exists.
- Keep production bundle and AdSense preview smoke checks.

## Non-Goals

- Do not return to Astro-style `clientOnly` islands for profile.
- Do not make the product lazy in a way that reintroduces first-click waits.
- Do not serve skeleton-only HTML to crawlers.
- Do not bypass SolidStart's client runtime for normal users.
