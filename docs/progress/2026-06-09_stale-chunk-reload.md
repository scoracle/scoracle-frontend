# 2026-06-09 — Self-heal stale route chunks after deploy (frontend-only)

## Goal
Stop "Failed to fetch dynamically imported module" errors after a deploy. A browser
holding a stale module graph (open tab / cached index from an earlier deploy) 404s on the
old hashed route chunk (e.g. `leaderboard-B58MvjH-.js`) once a later deploy purges it,
landing the user on the root error boundary ("Something went sideways…").

## Diagnosis
Confirmed it's a stale-client artifact, not a broken deploy: the errored hash 404s, but
the live `/leaderboard` HTML references the current hash (`leaderboard-BwUoXX8r.js`) and
every current chunk returns 200. Rapid back-to-back deploys (4 in this session) widened
the window for stale tabs.

## What Was Done
- `src/lib/utils/chunk-reload.ts` (new) — `isChunkLoadError(err)` (matches the
  Chrome/Firefox/generic dynamic-import failure messages) + `reloadForStaleChunk()` (one
  full reload to pick up the fresh index, guarded by a 10 s sessionStorage window so a
  genuinely-missing chunk shows the error instead of reload-looping; SSR/no-storage safe).
- `src/entry-client.tsx` — `window.addEventListener("vite:preloadError", …)` → reload
  (catches a failed modulepreload before the import() rejects).
- `src/app.tsx` — the root `RouteError` boundary detects a chunk-load error and reloads
  once (shows a blank busy pane meanwhile) instead of the error page.

## Files Changed
- `src/lib/utils/chunk-reload.ts` (+ `.test.ts`), `src/entry-client.tsx`, `src/app.tsx`

## Verification
- `npm run typecheck` clean; `npm test` 119 passed (+2 isChunkLoadError). Deployed
  (Worker `b6695653`); the live entry-client chunk carries both the `vite:preloadError`
  listener and the `scoracle:chunk-reload` guard; `/leaderboard` 200.

## Note
Existing stale tabs (which predate this deploy) don't have the self-heal yet — they need
one hard refresh. From here on, a stale chunk after any deploy auto-reloads once.
