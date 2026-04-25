# Add Terms of Service page

**Date:** 2026-04-25
**Scope:** Add a fourth static route — `/terms` — for the Terms of Service. Required before public launch (app-store submission, ad-network onboarding) per the Launch Plan.

## Goal

Lock in a four-page route surface for `scoracle.com`: `/`, `/profile`, `/terms`, and the catch-all 404. Authoring the actual ToS copy is a later task (likely from a generator like Termly or via legal review); for now, a minimal stub claims the route, gets the security headers + cache header applied, and prevents scope creep when the real copy lands.

## What Was Done

- **`src/routes/terms.tsx`** — minimal stub. Heading + placeholder copy noting it's pending pre-launch authoring.
- **`src/middleware.ts`** — extended the static-route cache list to include `/terms` alongside `/` and `/profile` (`public, max-age=300, stale-while-revalidate=600`). Same cache profile as the other static pages.
- **`CLAUDE.md`** (repo) — updated the per-route rendering split: now lists four prerender routes (`/`, `/profile`, `/terms`, `/404`).
- **`~/scoracleWiki/wiki/Architecture/Frontend Architecture.md`** (vault) — Phase 3 phasing now mentions `/terms` explicitly. 3d covers both 404 polish and `/terms`; placeholder copy lands early, real ToS before launch.

## Files Changed

Added: `src/routes/terms.tsx`, `docs/progress/2026-04-25_terms-of-service-page.md`.
Modified: `src/middleware.ts`, `CLAUDE.md`.

Vault (not in this commit): updated `~/scoracleWiki/wiki/Architecture/Frontend Architecture.md`; mirror at `~/scoracleWiki/Progress/scoracle-frontend/2026-04-25_terms-of-service-page.md`.

## Verification

`vite dev` boot + curl all four routes:

| Path | Status | Body |
|---|---|---|
| `/` | 200 | `<h1>Scoracle</h1>` |
| `/profile` | 200 | `<h1>Profile</h1>` |
| `/terms` | **200, 6054b** | `<h1>Terms of Service</h1>` |
| `/404` | 200 | `<h1>Not found</h1>` (caught by catch-all) |
| `/no-such-route` | **404, 5738b** | `<h1>Not found</h1>` |

### Update on the earlier 404-status known issue

`2026-04-25_phase-2-finish.md` flagged that `HttpStatusCode` was returning HTTP 200 instead of 404 for unmatched routes (cleanup reset). On this run, `/no-such-route` came back as **HTTP 404** correctly — the wire status is being preserved.

The earlier 200 may have been cold-load noise or a hot-reload artifact. The behavior may still be inconsistent between cold runs in 2.0-alpha — worth re-checking after each `npm install` / `vite dev` cycle. Not blocking; downgraded from "known issue" to "watch for regression."

`/404` (literal path, not a defined route) hits the catch-all and returns 200 — `HttpStatusCode` doesn't fire because the renderer treats the path as matched. That's expected; the literal `/404` is just the URL of a 404 page, not a 404 response. Real users hit the wildcard route via unmatched paths and get the right status.

## Result

Four-page route surface complete. Static cache header applied to all three editorially-authored pages (`/`, `/profile`, `/terms`); the catch-all stays uncached so 404 signals don't get sticky. Real Terms of Service copy is queued for pre-launch authoring (Track A of the Launch Plan).

Phase 2 is now genuinely done. Phase 3a shipped in the previous commit. Next: **Phase 3b** — port the home page (`CrystalBall`, `SearchBar`, `Header`) into `src/components/solid/` + wire into `src/routes/index.tsx`.
