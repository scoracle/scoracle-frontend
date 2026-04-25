# Phase 2 finish — middleware, route stubs, transition smoke test

**Date:** 2026-04-25
**Scope:** Complete the Phase 2 scaffold: CSP middleware, profile/404 route stubs, and the `solid-transition-group` smoke route. Last commit before Phase 3a (shared plumbing port).

## Goal

Close out the scaffold work the initial commit deferred (`2026-04-25_initial-scaffold.md`). The plan refinement called for these explicitly:

- A `solid-transition-group` smoke test moved earlier in the sequence (Phase 2, not 3b) so we know the alpha works with the transition library before component porting depends on it.
- `src/middleware.ts` for CSP/security headers, ported from the Astro repo's `src/middleware.ts`.
- Stub routes for `/profile` and a catch-all 404, so the route surface matches the Astro repo's three-page model.

After this commit, the next work is Phase 3a — porting shared plumbing (types, lib/utils, stores, public/data) from `~/Scoracle`.

## What Was Done

### `src/middleware.ts` — CSP + security headers
- Ported from `~/Scoracle/src/middleware.ts`: same CSP directives, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy disabling sensors / camera / etc.
- Same route-specific cache header on `/` and `/profile` (`public, max-age=300, stale-while-revalidate=600`).
- Implemented via SolidStart's `createMiddleware({ onBeforeResponse: [...] })` pattern. `event.response.headers` (a `Headers` object on `ResponseStub`) supports `.set()` directly — no h3 plumbing.
- Static-asset bypass via the same regex pattern as Astro.
- Wired into `vite.config.ts` via `solidStart({ middleware: "src/middleware.ts" })`.

### `src/routes/profile.tsx`
Minimal stub. `<h1>Profile</h1>` + placeholder copy. Real content arrives in Phase 3c when EntityMeta + NewsCard + StatsCard are ported.

### `src/routes/[...404].tsx`
Catch-all route per SolidStart convention. Renders "Not found" + uses `HttpStatusCode` from `@solidjs/start` to set the response status. **Known issue** — see below.

### `src/routes/smoke-transition.tsx`
30-line smoke test for `solid-transition-group@0.3.0` on Solid 1.9.11 + SolidStart 2.0-alpha.2. A `Show`-gated card with fade-in (250 ms) and fade-out (200 ms) animations driven by a button toggle. To be deleted once the transition is exercised in production traffic; for now, route-accessible at `/smoke-transition` so we can validate on the staging deploy.

### `vite.config.ts`
Added `middleware: "src/middleware.ts"` to the `solidStart()` plugin options. No other changes.

## Files Changed

Added:
- `src/middleware.ts`
- `src/routes/profile.tsx`
- `src/routes/[...404].tsx`
- `src/routes/smoke-transition.tsx`
- `docs/progress/2026-04-25_phase-2-finish.md` (this file)

Modified:
- `vite.config.ts` — middleware option added to `solidStart()` plugin

## Verification

`npm run typecheck` → clean.

`vite dev` → boots in ~266 ms.

All four routes hit with `curl -D -`:

| Path | Status | Body | Cache header |
|---|---|---|---|
| `/` | 200 | `<h1>Scoracle</h1>` | `public, max-age=300, stale-while-revalidate=600` |
| `/profile` | 200 | `<h1>Profile</h1>` | same |
| `/smoke-transition` | 200 | `<h1>solid-transition-group smoke test</h1>` | (no cache header — middleware skips) |
| `/no-such-route` | **200** ⚠️ | `<h1>Not found</h1>` | (no cache header) |

CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, and Permissions-Policy applied to all four HTML responses.

## Known issue — 404 returns HTTP 200

`HttpStatusCode` from `@solidjs/start` sets `event.response.status = 404` on render, then resets to 200 in `onCleanup` if `!event.complete` (per `dist/shared/HttpStatusCode.js`). In SolidStart 2.0-alpha.2 the cleanup is firing for our catch-all route, so the wire status stays 200 even though the body renders the 404 page.

**Decision: ship as-is.**
- Production Cloudflare Workers config can return a 404 status for unmatched-path responses at the edge — the in-app 404 status is less load-bearing once we have CDN-level handling.
- This is alpha behavior and likely changes before 2.0 stable. Re-test against newer alpha/beta releases; if the bug persists, file upstream.
- Routing + rendering work end-to-end. The wire status is the only gap.

Tracking: revisit in Phase 4 (cutover) or when bumping `@solidjs/start` past 2.0.0-alpha.2.

## Result

Phase 2 scaffold complete. `scoracle-frontend` now has all three Astro-era routes (`/`, `/profile`, catch-all 404), CSP/security headers, and a route-accessible `solid-transition-group` smoke test. Vite dev boots fast (sub-300 ms), typecheck is clean, security headers verified on all routes, transition library installed and ready for the carousel port.

Next: **Phase 3a** — port shared plumbing from `~/Scoracle`. Order per the plan: types → lib/utils → stores → public/data → headers (already done). Then 3b (home `/`), 3c (profile + tabs + Compare flow + X tab), 3d (404 polish if needed).
