# Session retrospective — 2026-04-26 EOD

**Date:** 2026-04-26 (Day 2 of the greenfield build)
**Scope:** From "first browser smoke failed because the API was CORS-blocked" at session start to "production worker live + smoke-tested + ready for DNS cutover" at session end. Six implementation commits + a handoff brief for an independent audit before the cutover.

## Goal

Day 1 (2026-04-25) finished with source-level parity but no real browser test. Day 2 picked up with the user spinning up `npm run dev` and immediately hitting two layered problems: the profile page rendered blank because (a) the Go backend's CORS allowlist didn't include the SolidStart Vite dev port and (b) the resulting unhandled `TypeError: Failed to fetch` collapsed Solid's hydration boundary into a blank page.

That single failure unblocked the rest of the day: fix the immediate bug, port a large outstanding Astro update that surfaced more visual gaps, ship the Phase 4 deployment adapter, deploy to production CF Workers, and land all the launch-quality polish so the surface is cutover-ready.

## What Was Done — 6 implementation commits, 1 backend commit, 1 audit handoff

### Bug surface + ports (commits 1–2)

| Commit | What |
|---|---|
| `4fd7fa1` | **Vite dev proxy + ErrorBoundary around profile cards.** Added `server.proxy` in `vite.config.ts` (`/api/*` → `localhost:8000`, `changeOrigin: true`) plus `.env.development` with `PUBLIC_GO_API_URL=/api/v1`. Browser fetches are now same-origin in dev, so CORS is a non-issue. ErrorBoundary wraps NewsCard + StatsCard with a per-face fallback that shows the failed face name + error message + retry button — a robustness fix independent of CORS that means future backend hiccups in prod surface a per-card retry instead of blanking the app. |
| `c1018eb` (`scoracle-data`) | **Belt-and-suspenders backend CORS update.** Added `:5185` to the Go default `CORSAllowOrigins` list (Vite default is `:5173`, increments when occupied; observed live on `:5185`). Comment-tagged each entry by origin. The Vite dev proxy makes this irrelevant in dev, but it covers any future dev path that talks to `:8000` directly. |
| `0960f13` | **Port `albapepper/Scoracle@0cd4a10` — meta widget + pizza charts + compare tab redesign.** Largest single commit of the day. Added the missing `.card` / `.eyebrow` / `touch-action` utility classes from Astro's `global.css` (Phase 3a missed them — explained the "cards blend into background" symptom). Ported the EntityMeta team-logo fallback (`getTeamMetaSync` lookup when no `photo_url`), `formatDraft` helper, sport-natural `buildPlayerDetails` order, new PlayerMeta type fields. Pizza chart visual pass: drop label truncation, `overflow:visible`, `innerRadius` 22→14, ~50% larger (500×500), drop VS center text, comparison overlay redesign with percentile-tier palette + annulus/dashed-arc/outline secondary. CompareTab full rewrite around new extracted `CompareSearch` component with slide-in animation. api-fetcher 304-without-cache bug fix. fetch-autofill surfaces `meta.college` / `draft_*` / `age` / `experience` and drops team-logo denormalization. Re-ran fetch-data: NBA 30/30, NFL 32/32, Football 96/96 teams have `logo_url`. Deleted obsolete `entity-colors.ts` + `team-colors.ts`. |

### CF Workers deployment (commits 3, 7)

| Commit | What |
|---|---|
| `343a224` | **Cloudflare Workers adapter — hand-rolled h3 shim.** Phase 4 long pole. Researched options via dispatched `general-purpose` agent: official adapter doesn't exist (Nitro v3 integration lands after 2.0 stable per discussion #2119), `@cloudflare/vite-plugin` doesn't fit cleanly (wants to own the build). Picked option C: 30-line `worker.ts` that imports the SolidStart server bundle as default (it's an h3 v2 `H3` app), converts via `h3/cloudflare`'s `toWebHandler`, exports an `ExportedHandler<Env>`. Zero new runtime deps (h3 + srvx already transitive via `@solidjs/start`). `wrangler.jsonc` wires `dist/client/` as a Workers Static Assets binding; `PUBLIC_GO_API_URL` lives in `vars` as the single prod source of truth. `cf:deploy` chains `vite build && wrangler deploy`. **First real prod deploy succeeded** at `https://scoracle-frontend.albapepper.workers.dev`: 47 assets uploaded, 405 KiB / 93 KiB gzip worker, 9 ms cold start. |
| `e3fc16d` | **Routing fix — assets-first.** Caught during browser smoke: `/sitemap.xml` returned 404 + `/robots.txt` returned 200 with the SSR'd "Not found" HTML body (catch-all coincidence). The original prefix-based router only forwarded `/_build/`, `/data/`, `/images/`, `/favicon.` to ASSETS, so root-level files fell through to SolidStart. Flipped `run_worker_first` off (default behavior); CF Workers Static Assets now serves any matching file in `dist/client/` first, falling through to the worker only for SSR routes. Worker.ts simplified — no prefix routing, just always invoke `handle(request)`. |

### Pre-cutover polish (commits 4–6)

| Commit | What |
|---|---|
| `8fe8886` | **Image optimization + dark-mode pre-paint.** `public/images/` from 6.5 MB → 196 KB (97% reduction, ~6.3 MB removed from the home-page payload). Sport logos were 1024×1536 PNGs (~2 MB each) displayed at 143×143; ran a one-shot `sharp` script with PNG palette quantization to resize and recompress. Crystal ball 353 KB → 167 KB. Dropped unused `logo.png` (337 KB). Stayed PNG to avoid touching consumers — no `<picture>` dance. Sharp added as direct devDep. Inline pre-paint `<script>` in `entry-server.tsx` `<head>` reads the `'scoracle-theme'` localStorage key and applies `.dark` to `<html>` synchronously before paint — kills FOUC for dark-theme users on cold navigation. CSP allows `'unsafe-inline'` so no nonce needed. |
| `d46c252` | **Pre-cutover polish — cache headers, social meta, legal pages.** Ported `_headers` from Astro adapted for SolidStart paths (`/_build/*` immutable, `/data/*` 1d+SWR, `/images/*` 1w, `/favicon.svg` immutable). OG + Twitter Card meta tags in `entry-server.tsx` head with `og:image` pointing to the optimized 167 KB crystal ball. `robots.txt` + `sitemap.xml` covering the four-page surface. `/terms` replaced 12-line placeholder with a 10-section structured ToS scaffold. New `/privacy` route with 11-section policy reflecting current product state (no accounts, no tracking cookies, only `localStorage` for prefs + Cloudflare server logs + aggregate analytics). Both DRAFT-marked, designed to receive generator output. Shared `legal.css`. Header hamburger menu now links Terms + Privacy alongside Home (hard requirement for ad-network onboarding). |

### Backend operational change (no commit, journal-tracked)

Updated `~/scoracle-data/.env.local` `CORS_PRODUCTION_ORIGINS` to fix a typo: `scoracle.albapepper.workers.dev` → `scoracle-frontend.albapepper.workers.dev` (one missing word, one CORS rejection). `systemctl --user restart scoracle-api` to reload. Verified the production allowlist via `curl -I` with `Origin:` header — `access-control-allow-origin` now correctly returned for the workers.dev URL.

This was a `.env.local` edit, not source code, so it doesn't get a commit. The mental-model walkthrough of how `scoracle-api.service` (user-level systemd, loads `.env` then `.env.local`) is documented in the chat transcript for the next time the user touches it.

## Patterns codified during the build

### Three things that bit us

1. **Hydration-boundary collapse on unhandled fetch errors.** Solid's default behavior when a `clientOnly` child throws an unhandled rejection is to collapse the parent's hydration boundary — visible to the user as a blank page (header included). `ErrorBoundary` wrapping is *not* optional for fetch-touching client-only components. Applied to NewsCard + StatsCard in `routes/profile.tsx`; should be revisited if Solid's default behavior changes.

2. **Workers Static Assets routing has a sharp edge.** The CF docs default to `assets-first` (worker only sees unmatched paths). The first session's research recommended `run_worker_first: true` with explicit prefix routing — which works for known prefixes but silently misroutes anything at root (`/robots.txt`, `/sitemap.xml`, `/favicon.svg` if it's in `public/` rather than handled by SolidStart). Flipped to default behavior; worker is now a single-line `handle(request)` forwarder. **Check body content, not just status code, when smoke-testing routes.** A 200 with the wrong body is worse than a 404.

3. **Env vars are inlined at Vite server start, not hot-reloaded.** Adding a new env value to `.env.development` requires a dev server restart even though `vite.config.ts` hot-reloads. The user hit this when first applying the dev proxy. Worth documenting in the README's "Quick reference" section if anyone re-hits it.

### Codified deploy flow

`npm run cf:deploy` is the one-shot deploy command (chains `vite build` + `wrangler deploy`). `npm run cf:deploy:dry` for staging validation without actual upload. `npm run cf:dev` runs the full workerd runtime locally (slower than `npm run dev`'s vite dev, but the only way to test asset routing + worker bundling end-to-end without deploying).

### Two lessons on commit boundaries

- **Bundle related changes per logical concern, not per file.** Today's commit 6 (`d46c252`) bundled cache headers + social meta + robots/sitemap + terms/privacy + Header menu — five files, one concern ("pre-cutover polish"). Cleaner than five trivial commits with five trivial progress docs.
- **Always commit a fix immediately after catching a regression.** Commit 7 (`e3fc16d`) fixed the routing bug from commit 3. Going to ship would have masked the original deploy commit's quality.

## Pickup points — for the audit session

The user's call at end-of-day: pause for a fresh-session audit before the DNS cutover. The handoff brief is at:

- `docs/progress/2026-04-26_pre-cutover-audit-brief.md` (in-repo)
- `~/scoracleWiki/Progress/scoracle-frontend/2026-04-26_pre-cutover-audit-brief.md` (vault mirror)

Self-contained. The fresh session pastes it as a first prompt and produces the audit findings doc; no further coordination needed.

After the audit + any cutover-blocking fixes:
1. Final smoke at the workers.dev URL
2. Lighthouse run on the deployed worker
3. CF dashboard route flip — `scoracle.com/*` from legacy Astro Worker → `scoracle-frontend`
4. 72 h hot-standby window per Launch Plan
5. Phase 3 work begins (Capacitor wrapper, weeks 8-11 of the unified Launch Plan)

## Tracked follow-ups (not blocking cutover)

- **Per-page OG meta overrides** (e.g., player names in `og:title`). Needs `@solidjs/meta` provider. Deferred until after Capacitor.
- **GDPR/CCPA consent banner.** Only needed once tracking cookies / advertising actually ship.
- **Cloudflare Web Analytics snippet.** Privacy policy already references it but it's not wired yet.
- **Real legal content.** Terms/Privacy are DRAFT scaffolds; final text comes from a generator per Launch Plan Track A.
- **`hello@scoracle.com` mailbox.** Referenced in legal pages; existence/forwarding TBD.
- **Sport-store hydration micro-flicker.** Tracked from Phase 3b; only fix if user-visible.

## Bundle-size budget — current

- Client JS total: **142.5 KB / 511 KB budget** (28%) — massive headroom
- Worker upload: **405 KiB / 93 KiB gzip** (CF limit: 10 MiB compressed)
- Public assets: **196 KB** (down from 6.5 MB pre-image-opt)

## Files Changed

This is a doc-only commit summarizing the day. No code changes.

Added:
- `docs/progress/2026-04-26_pre-cutover-audit-brief.md`
- `docs/progress/2026-04-26_session-retrospective.md` (this file)
- (Both mirrored to `~/scoracleWiki/Progress/scoracle-frontend/`)

## Result

`scoracle-frontend` is **deployment-ready, audit-pending**. From "first browser smoke failed" to "production worker live and verified" in a single day. Real users one CF dashboard click away. Six logical commits + a backend env fix + a self-handoff for an independent audit. Day 2 closed at the same productive cadence as Day 1 (which built the entire app from an empty repo).

20 progress docs in `docs/progress/` after this commit. 21 commits on `scoracle-frontend@main`. Production worker at `https://scoracle-frontend.albapepper.workers.dev`. Cutover blocked only by the audit + the user's CF dashboard flip — not by any code work.

Great day two.
