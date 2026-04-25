# Home page port — SearchBar + CrystalBall + index wire-up

**Date:** 2026-04-25
**Scope:** Phase 3b, Commit A. Port the home-page islands (`SearchBar`, `CrystalBall`) and wire them into `src/routes/index.tsx`. Move sport logos to `public/images/`. Header port + multi-route Header integration is the follow-up commit.

## Goal

Get the flagship home page rendering against the same content/visual contract as the Astro repo, on the new SolidStart 2.0-alpha stack — first commit that exercises the Phase 3a shared plumbing (`entityDataStore`, `$currentSport`, `getSportDisplay`, etc.).

## What Was Done

### Asset migration
- Copied `~/Scoracle/src/assets/images/*.png` → `~/scoracle-frontend/public/images/`. Five files: `scoracle_crystal_ball.png`, `nba-logo.png`, `nfl-logo.png`, `fifa-logo.png`, `logo.png`.
- Total: **~6.6 MB**. The Astro `<Image>` component scaled and webp-converted these at build time; without that, raw PNGs ship. **Follow-up flagged**: pre-launch optimization (sharp/squoosh, or `vite-imagetools` if a real photo pipeline appears) — not blocking now, but the bundle-size budget watches `dist/client/_astro/` (444 KB → ≤ 511 KB). The logos live in `public/`, so they're served directly and don't count toward the JS-bundle budget — but they still affect first-paint over the wire.

### Components ported

`src/components/solid/SearchBar.tsx` + `.css`
- Verbatim CSS port. TSX is a near-verbatim port with one SSR-safety change.
- **SSR fix:** original initialized `synonymIndex` via `Math.random()` at component setup. That would render different values on server vs. client → hydration mismatch. Fixed by initializing the signal to `0` and randomizing inside `onMount`. Behaviorally identical after first paint; server and client render the same HTML.
- Imports resolve cleanly against Phase 3a plumbing: `entityDataStore`, `getSportDisplay`, `$currentSport`, `normalizeForSearch`, `AutocompleteEntity`. No code changes needed in those files.

`src/components/solid/CrystalBall.tsx` + `.css`
- Verbatim port. CrystalBall has the same `Math.random()`-at-setup pattern (sport carousel start index), but rather than fix it the same way as SearchBar, the route consumes it via `clientOnly` so SSR is skipped entirely — preserving the original "different every page load" intent without flicker. The Astro version achieved this via `client:only="solid-js"`; SolidStart's equivalent is `clientOnly` from `@solidjs/start`.

### Route wired

`src/routes/index.tsx`
- Replaces the `<h1>Scoracle — coming soon</h1>` stub with the real home-page composition: SCORACLE editorial headline + central card containing the CrystalBall.
- Imports `CrystalBall` via `clientOnly(() => import(...))` — equivalent to Astro's `client:only="solid-js"`. Server renders only the shell + headline; CrystalBall hydrates on the client.
- Sport logos passed as props (`sportLogos: { nba, nfl, football }`) using `/images/*.png` paths from `public/`.
- `sports` derived from the SSOT `SPORTS` array in `lib/types/index.ts` (`map(s => ({ id: s.idLower, display: s.display }))`).
- Network-aware idle-time preload of all sport entity JSONs ported from `src/pages/index.astro`'s inline `<script>`. Lives in route's `onMount`. Skips on Save-Data / slow-2g / 2g connections; uses `requestIdleCallback` with a 2s timeout, falling back to `setTimeout`.

`src/routes/index.css`
- Ported from `index.astro`'s `<style scoped>` block. Same selectors (`.home-main`, `.home-headline`, `.home-headline-title`, `.central-card`), same media queries, same `:global(.dark)` dark-mode override (so the dark-theme variables already in `@scoracle/tokens` activate when a `.dark` class is applied to the root). Imported by the route — Vite handles scoping via the import boundary.

## Files Changed

Added (10 files):
- `public/images/scoracle_crystal_ball.png`, `nba-logo.png`, `nfl-logo.png`, `fifa-logo.png`, `logo.png`
- `src/components/solid/CrystalBall.tsx`, `CrystalBall.css`
- `src/components/solid/SearchBar.tsx`, `SearchBar.css`
- `src/routes/index.css`
- `docs/progress/2026-04-25_home-page-port.md` (this file)

Modified:
- `src/routes/index.tsx` — replaced the stub with the real composition.

## Verification

- `npm run typecheck` → clean.
- `vite dev` → boots in ~250 ms.
- All four routes still serve:

| Path | Status | Bytes |
|---|---|---|
| `/` | 200 | 7168 (was 5934 — adds layout chrome) |
| `/profile` | 200 | 5943 |
| `/terms` | 200 | 6054 |
| `/no-such-route` | 200 | 5949 |

- No warnings or errors in dev log.
- Server-rendered HTML for `/` includes the headline (`<h1 class="home-headline-title">SCORACLE</h1>`) and layout classes (`.home-main`, `.home-headline`). CrystalBall is absent from SSR HTML by design (`clientOnly`); it hydrates client-side.

### Caveat — browser smoke not done in this session

Verifying the carousel actually animates, the search input autocompletes, and `/profile?...` navigation works end-to-end requires a browser. This commit confirms the server pipeline (typecheck, SSR shell, route integrity); the visual side will be exercised the first time the dev server is opened in a browser. If anything breaks at hydration, a follow-up will land here.

### Caveat — `/no-such-route` returned 200 again

Inconsistent alpha behavior tracked in `2026-04-25_phase-2-finish.md`. Cloudflare Workers will normalize at the edge; not blocking.

## Result

The home page is wired and rendering its SSR shell on the new stack. The Phase 3a shared plumbing (`entityDataStore`, `$currentSport`, type config) is now exercised by real consumer components for the first time — and it compiles + serves clean.

Next commit (Phase 3b, Commit B): port `Header.tsx` + `.css`, integrate it into the routes that need it (`/profile`, `/terms`, catch-all 404), and decide between app-level layout vs. per-route header import. Then end-of-phase audit for any legacy Astro residue.
