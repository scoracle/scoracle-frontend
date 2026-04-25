# Initial SolidStart 2.0-alpha scaffold

**Date:** 2026-04-25
**Scope:** Phase 0 (org bootstrap) + Phase 2 (SolidStart scaffold + dev-boot verification) of the greenfield rebuild plan.

## Goal

Stand up a fresh `scoracle-frontend` repo on the `scoracle` GitHub org with a working SolidStart 2.0-alpha + Solid 1.9.11 + Vite 7 scaffold. Cloudflare Workers is the deployment target (adapter TBD). This repo replaces `albapepper/Scoracle` (Astro 6) at DNS cutover; the Astro repo stays live as port-source during the build.

Canonical plan: `~/scoracleWiki/raw/frontend-migration-plan-2026-04-25-refinement.md`. Curated wiki context: `~/scoracleWiki/wiki/Architecture/Frontend Architecture.md`.

## What Was Done

### Phase 0 — Bootstrap
- User created the empty `scoracle/scoracle-frontend` repo on GitHub.
- Cloned to `~/scoracle-frontend` via `git clone git@github.com:scoracle/scoracle-frontend.git`.
- Confirmed `~/scoracle-tokens` was already set up by the user (v0.1.0 published, in production via the Astro repo since 2026-04-21). No tokens-package work needed for this scaffold.

### Phase 2 — Scaffold
- `package.json` pinning **`@solidjs/start@2.0.0-alpha.2`** exactly + **`solid-js@1.9.11`** exact + supporting deps (`@solidjs/router 0.16.1`, `solid-transition-group 0.3.0`, `nanostores`, `@nanostores/solid`, `wrangler`).
- `tsconfig.json` strict mode + path aliases mirroring the Astro repo (`@/*`, `@components/*`, `@layouts/*`, `@lib/*`, `@pages/*`). `@pages` maps to `src/routes` per SolidStart convention.
- `vite.config.ts` consuming the `solidStart()` plugin from `@solidjs/start/config`.
- `.npmrc` (project) declares the `@scoracle` registry only — auth lives in user-level `~/.npmrc` (no env-var plumbing).
- `src/app.tsx` — `Router` + `FileRoutes` + `Suspense` root.
- `src/entry-server.tsx` — `createHandler` + `StartServer` SSR shell with `<title>Scoracle</title>` and viewport/charset meta.
- `src/entry-client.tsx` — `mount(StartClient)`.
- `src/global.css` — `@import "@scoracle/tokens/tokens.css"` + base styles ported from the Astro repo's `global.css` (box-sizing, body background/font, h1–h6 display-font rules).
- `src/routes/index.tsx` — home stub (`<h1>Scoracle</h1>` + placeholder copy).
- `CLAUDE.md` — repo orientation including the multi-dir session pattern, design principles, port caveats, path aliases, and per-commit progress-doc requirement.
- `README.md`, `.gitignore`.
- `.claude/settings.json` setting `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` so future sessions automatically fold in CLAUDE.md from `--add-dir ~/scoracleWiki` and `--add-dir ~/Scoracle`.

### Deviations from the plan refinement

The plan refinement (2026-04-25) was written against published SolidStart 1.x docs and the announced 2.0-alpha intent. Two API differences surfaced once 2.0-alpha.2 was actually installed:

1. **No `app.config.ts` + `defineConfig`.** The 2.0-alpha rewrite is pure Vite. Configuration lives in `vite.config.ts` consuming the `solidStart()` plugin function, which returns Vite plugin options. The `defineConfig` export from `@solidjs/start/config` (per the package README) is not present in the actual 2.0-alpha.2 module — README is from 1.x.
2. **No `cloudflare_module` Nitro preset.** Vinxi/Nitro is gone in 2.0-alpha. Cloudflare Workers deployment will need a Vite-based approach (likely `@cloudflare/vite-plugin` or a manual build target). Deferred to Phase 3+ when parity routes are built.

Three plan items deferred until the next commit:
- `solid-transition-group` smoke test route — to validate the alpha works with the transition library before any porting depends on it.
- `src/middleware.ts` for CSP headers — port from Astro's `src/middleware.ts`.
- `src/routes/profile.tsx` and `src/routes/[...404].tsx` route stubs.

## Files Changed

Added (14 files, all initial creation):
- `.claude/settings.json`
- `.gitignore`
- `.npmrc`
- `CLAUDE.md`
- `README.md`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vite.config.ts`
- `src/app.tsx`
- `src/entry-client.tsx`
- `src/entry-server.tsx`
- `src/global.css`
- `src/routes/index.tsx`
- `docs/progress/2026-04-25_initial-scaffold.md` (this file)

## Verification

- `npm whoami --registry=https://npm.pkg.github.com` → `albapepper` (auth via `~/.npmrc`)
- `npm install` → 217 packages, one ERESOLVE peer-dep override warning (alpha-typical; no errors)
- `npm run typecheck` (`tsc --noEmit`) → clean
- `vite dev` → boots in **~280 ms** on `http://localhost:5173/`
- `curl http://localhost:5173/` → **HTTP 200**, 5934 bytes; SSR'd HTML containing `<h1>Scoracle</h1>` + `<p>Greenfield SolidStart build — coming soon.</p>`; `@scoracle/tokens` CSS inlined into the page's `<style>` block (`--bg: #f0ece4`, `--text: #1a1a1a`, comparison palette, etc.)
- Astro baseline captured: `~/Scoracle/dist/client/_astro/` = **444 KB** → frontend bundle-size budget for Phase 3+ porting is **≤ 511 KB** (15% over baseline).

## Result

`scoracle-frontend` boots end-to-end on **SolidStart 2.0-alpha.2 + Solid 1.9.11 + Vite 7 + `@scoracle/tokens@0.1.0`**. The greenfield stack is alive: SSR works, design tokens flow through, dev server is fast (sub-300 ms boot). Two API deviations from the plan are now known and documented.

Next commit: finish the Phase 2 scaffold by adding the `solid-transition-group` smoke test, CSP middleware, profile/404 route stubs, and any auxiliary files needed before Phase 3a (shared plumbing port from `~/Scoracle`).
