# Pre-launch polish — image optimization + dark-mode pre-paint

**Date:** 2026-04-26
**Scope:** Two of the five additive follow-ups from yesterday's session retrospective. Image optimization shrinks `public/images/` from 6.5 MB to 196 KB (97% reduction); dark-mode pre-paint script kills the FOUC for dark-theme users on first navigation.

## Goal

Per [[Launch Plan]], Lighthouse 90+ is launch-blocking (Track B revenue plumbing depends on Core Web Vitals targets). Two small, in-repo, parallelizable wins from the Phase 3b/3c audit follow-up list:

1. **Image optimization** — sport logos shipped as raw 1024×1536 / 1536×1024 PNGs (~2 MB each), displayed at 143×143 in the home carousel. Crystal ball at 1378×1309 / 353 KB, displayed at max 589 px wide. Massive over-spec.
2. **Dark-mode pre-paint script** — inline `<script>` in Astro's `Layout.astro` that read `localStorage` and applied `.dark` to `<html>` before paint. Phase 3b audit noted it as "still missing — port from Astro." Without it, dark-theme users see a flash of light theme on every cold navigation.

## What Was Done

### Image optimization (one-shot sharp pass)

Installed `sharp@0.34.5` as direct devDep (was already transitive via `wrangler → miniflare`). Ran a one-shot Node script via `node -e` that:

- Resized each PNG to a sane max dimension (300 px for sport logos, 1200 px for the crystal ball) using `fit: inside, withoutEnlargement: true` (preserves aspect ratio, never up-scales).
- Re-encoded with PNG palette mode (`palette: true, compressionLevel: 9, effort: 10, quality: 90`) — quantizes to a smaller color table, ideal for flat-color logos.
- Wrote in place. No path changes → zero consumer updates.

Also deleted `public/images/logo.png` (337 KB) — `grep -rn "logo\.png"` showed no consumers; it was dead from a port that never landed.

| File | Before | After | Reduction |
|---|---:|---:|---:|
| `nba-logo.png` | 1995 KB | 7 KB | 99.6% |
| `nfl-logo.png` | 1921 KB | 11 KB | 99.4% |
| `fifa-logo.png` | 1932 KB | 3 KB | 99.8% |
| `scoracle_crystal_ball.png` | 353 KB | 167 KB | 52.6% |
| `logo.png` (deleted) | 337 KB | — | 100% |
| **Total `public/images/`** | **~6.5 MB** | **196 KB** | **97%** |

Resized dimensions are still display-adequate at 2× retina (sport logos at 200×300 cover a 143×143 contained display at 286×286 retina; crystal ball at 1200×1140 covers a 589×… contained display at ~1178 retina).

Decision: stayed with PNG (no consumer changes, no `<picture>` element complexity). Modern WebP would shave maybe another 20–30% but at the cost of touching every consumer and a fallback story. Not worth it given 196 KB is already in the noise.

### Dark-mode pre-paint script

Added a single inline `<script>` to `entry-server.tsx`'s `<head>`, between `<title>` and `{assets}`:

```jsx
<script
  innerHTML={`(function(){try{if(localStorage.getItem('scoracle-theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`}
/>
```

Reads the same `'scoracle-theme'` storage key the Header port already uses (verified — `src/components/solid/Header.tsx:25` declares the constant). Synchronous IIFE in `<head>` blocks paint long enough to apply the class. Wrapped in try/catch in case storage is unavailable (private browsing, etc.).

CSP allows `'unsafe-inline'` for `script-src` (per `src/middleware.ts:5`) so no nonce dance needed.

`innerHTML={...}` rather than `<script>{...}</script>` because the latter form gets HTML-escaped by Solid's JSX transform in some cases.

## Files Changed

**Modified**
- `public/images/nba-logo.png` (1995 KB → 7 KB)
- `public/images/nfl-logo.png` (1921 KB → 11 KB)
- `public/images/fifa-logo.png` (1932 KB → 3 KB)
- `public/images/scoracle_crystal_ball.png` (353 KB → 167 KB)
- `src/entry-server.tsx` — pre-paint `<script>` in `<head>`
- `package.json` + `package-lock.json` — `sharp` as direct devDep

**Deleted**
- `public/images/logo.png` (unused, 337 KB)

**Added**
- `docs/progress/2026-04-26_image-opt-and-dark-mode-prepaint.md` (this file)

## Verification

- `npm run typecheck` — green.
- `npm run build` — green (~2.5 s total, both bundles).
- `curl http://localhost:5185/images/nba-logo.png` → HTTP 200, 7448 bytes (dev server serves the optimized file).
- `curl http://localhost:5185/` | grep — confirmed `scoracle-theme')==='dark')...` inline script lands in the SSR HTML output.
- Image dimensions verified via `file public/images/*.png`: sport logos 200×300 / 300×200, crystal ball 1200×1140 — all retina-adequate.

## Result

**Page weight** drops by ~6.3 MB on the home page (where the crystal ball + sport logos load). For first-time visitors on a slow connection, that's the difference between Lighthouse 90+ and a long-tail Core Web Vitals miss. **Worker bundle** is unchanged (assets ship via the ASSETS binding, not bundled into the worker script).

**Dark-mode users** no longer see the FOUC on cold navigation — the inline script applies `.dark` to `<html>` before paint, so the first frame matches their saved preference.

Both changes are zero-risk to the rest of the surface: no API changes, no consumer changes, no DOM structure changes. Ready to redeploy via `npm run cf:deploy`.

## Next

Per the recommended plan: **parity testing** against the live Astro flagship on pinned entities (1 player + 1 team per sport), then **DNS cutover** with Astro as 72 h hot standby per the Launch Plan.
