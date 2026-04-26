# Vite dev proxy + ErrorBoundary around profile cards

**Date:** 2026-04-26
**Scope:** Make the profile page survive its first browser smoke test. Backend was reachable from the dev server but blocked by CORS, and the resulting unhandled fetch rejection collapsed the route's hydration boundary into a blank screen.

## Goal

First browser test of `/profile?sport=NFL&type=team&id=19` rendered a blank page. SSR shell came back at HTTP 200 with header + main + flip-card scaffolding intact, so the failure was on hydration. Console showed two errors: CORS-blocked fetches at `localhost:8000` (Go API) and an unhandled `TypeError: Failed to fetch` thrown out of NewsTab. The blank page meant Solid's hydration boundary was collapsing on the unhandled rejection — fix both layers so dev works today and prod hiccups don't blank the app tomorrow.

## What Was Done

### Vite dev proxy (`vite.config.ts`)

Added a `server.proxy` block: `/api/*` → `http://localhost:8000`, `changeOrigin: true`. Browser fetches are now same-origin (`localhost:5185`) and forwarded server-to-server to the Go backend. CORS becomes a non-issue in dev.

### Dev env (`.env.development`)

New file. `PUBLIC_GO_API_URL=/api/v1` — relative URL so `import.meta.env.PUBLIC_GO_API_URL` is inlined as the relative path that hits the proxy. Production deploys still use the absolute Cloudflare API URL via `wrangler.jsonc` (Phase 4).

`.gitignore` already excludes `.env`, `.env.local`, `.env.*.local` but not `.env.development`, so the file is checked in as the shared dev default. Machine-specific overrides go in `.env.development.local`.

### ErrorBoundary around the cards (`src/routes/profile.tsx`)

Wrapped `<NewsCard />` and `<StatsCard />` in Solid's `ErrorBoundary` with a per-face fallback. The fallback renders the failed face name, the error message (truncated by CSS `word-break`), and a "Try again" button wired to the `reset` callback. EntityMeta is intentionally not wrapped — it hydrates from the local meta store, doesn't hit the failing API, and a failure there means the whole page is broken anyway (different fallback class).

### Error fallback styles (`src/routes/profile.css`)

`.card-error` family — modest border, padded, monospace error message, hover-styled retry button. Tokenized against `--bg-card` / `--border` / `--text` etc. so it inherits dark-mode automatically.

## Files Changed

**Modified**
- `vite.config.ts` — added `server.proxy` block
- `src/routes/profile.tsx` — `ErrorBoundary` import + `CardError` component + boundary wrappers
- `src/routes/profile.css` — `.card-error*` styles

**Added**
- `.env.development` — `PUBLIC_GO_API_URL=/api/v1`
- `docs/progress/2026-04-26_dev-proxy-and-error-boundary.md` (this file)

## Verification

- `npm run typecheck` — green.
- `curl http://localhost:5185/api/v1/news/team/19?sport=NFL` → HTTP 200, 6.5 KB (proxy forwards to backend; real payload returned).
- `curl http://localhost:5185/api/v1/nfl/team/19` → HTTP 200, 34 KB.
- `curl http://localhost:5185/profile?sport=NFL&type=team&id=19` → HTTP 200, 18 KB shell with header + `profile-main` + `card-flip-container` intact.
- Browser-side: profile page renders fully after dev server restart (env vars are inlined at server start, not hot-reloaded).

## Result

Profile page renders in the browser. The dev proxy means CORS is one-and-done for local development — every future subdomain dev server can rely on the same pattern. The `ErrorBoundary` wrappers are a robustness fix independent of CORS: if the backend hiccups in prod, users see a per-card retry instead of a blank app.

A complementary backend change (adding `:5185` to the Go default CORS allowlist) is in a separate `scoracle-data` commit as belt-and-suspenders for any future dev path that bypasses the proxy.
