# Cloudflare Workers deployment adapter — hand-rolled h3 shim

**Date:** 2026-04-26
**Scope:** Phase 4 long-pole — get `scoracle-frontend` deployable to Cloudflare Workers despite SolidStart 2.0-alpha shipping no Cloudflare adapter. Uses h3 v2's built-in Cloudflare entry to wrap the SolidStart server bundle in a fetch handler, routes static assets through Workers Static Assets.

## Goal

The legacy Astro flagship deploys to CF Workers via `@astrojs/cloudflare`. SolidStart 2.0-alpha (DeVinxi rewrite) dropped the Vinxi-era `@solidjs/start/cloudflare-module` preset and the Nitro v3 integration that will replace it doesn't land until 2.0 stable. Without a working deploy pipeline, we can't ship the new flagship — so before parity testing or DNS cutover, we need a Workers entry that wraps SolidStart's output.

## Decisions

### Hand-rolled `worker.ts` shim, not `@cloudflare/vite-plugin`

Three options surveyed (research notes in chat transcript 2026-04-26):

1. **Wait for the official adapter.** Roadmap discussion #2119 puts Nitro v3 integration after 2.0 stable. Not on our launch timeline (~6-8 weeks per Launch Plan).
2. **`@cloudflare/vite-plugin`.** Wants to own the build and wrap a single SSR entry. SolidStart's `solidStart()` Vite plugin already drives a dual-output build (client + server, plus its own manifest virtual modules). Stacking them is unproven, no community examples found.
3. **Hand-rolled shim.** `dist/server/entry-server.js` exports an h3 v2 `H3` app instance as default. h3 v2 ships `h3/cloudflare` with `toWebHandler(app)` → `(Request) => Response`. Workers Static Assets covers the client bundle. Total glue: ~30 lines.

Picked #3. Rationale: zero new dependencies (h3 + srvx already transitive via `@solidjs/start`), no novel build-tooling stack to debug, easy to swap when the official adapter ships.

### Routing: worker decides, with `run_worker_first: true`

Static asset prefixes (`/_build/`, `/data/`, `/images/`, `/favicon.`) → `env.ASSETS.fetch(request)`. Everything else → SolidStart SSR via `toWebHandler(app)`. CF's auto-routing modes (`assets-first` etc.) don't fit because SolidStart owns root-level routes (`/`, `/profile`, `/terms`) that look indistinguishable from "static" but are SSR.

### Production API URL via `wrangler.jsonc` `vars`

Mirrors the Astro repo's pattern. `PUBLIC_GO_API_URL` lives in one place, gets inlined into both client and server bundles at build time via Vite's `envPrefix: "PUBLIC_"`. The worker never reads it at runtime. Single source of truth.

## What Was Done

### `worker.ts` (new, repo root)

30-line shim. Imports the SolidStart server entry as default, converts to a web handler via `h3/cloudflare`'s `toWebHandler`, exports an `ExportedHandler<Env>` that routes asset prefixes to `env.ASSETS` and falls through to the handler. The dist import is `// @ts-expect-error`-tagged because the artifact only exists post-build.

### `wrangler.jsonc` (new)

```jsonc
{
  "name": "scoracle-frontend",
  "main": "./worker.ts",
  "compatibility_date": "2026-03-17",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist/client",
    "binding": "ASSETS",
    "run_worker_first": true,
    "not_found_handling": "none"
  },
  "vars": {
    "PUBLIC_GO_API_URL": "https://api.scoracle.com/api/v1"
  },
  "observability": { "enabled": true }
}
```

`nodejs_compat` is required — `entry-server.js` imports `pathe`, `seroval`, `cookie-es`, etc., which expect Node built-ins.

### `tsconfig.json`

Added `worker.ts` to `exclude`. Wrangler bundles it via its own esbuild pipeline (which can resolve the dist import at deploy time); tsc shouldn't try to typecheck it before the build runs.

### `package.json`

- `cf:deploy`: `vite build && wrangler deploy` (was just `wrangler deploy`)
- `cf:deploy:dry`: `vite build && wrangler deploy --dry-run` (new)
- `cf:dev`: `vite build && wrangler dev` (new — local workerd runtime, distinct from `npm run dev`'s vite dev server)
- Added `@cloudflare/workers-types` devDep for the `Env`, `Fetcher`, `ExportedHandler` types in `worker.ts`.

## Files Changed

**Added**
- `worker.ts`
- `wrangler.jsonc`
- `docs/progress/2026-04-26_cloudflare-workers-adapter.md`

**Modified**
- `tsconfig.json` — exclude `worker.ts`
- `package.json` — `cf:deploy` chains build, new `cf:deploy:dry` and `cf:dev`, `@cloudflare/workers-types` devDep
- `package-lock.json` — `@cloudflare/workers-types` install

## Verification

- `npm run typecheck` — green (worker.ts excluded, doesn't pollute the main typecheck).
- `npm run cf:deploy:dry` — green. Output:
  - `vite build`: 122 client modules + 104 server modules transformed in ~2.5 s.
  - `wrangler deploy --dry-run`: 47 static assets read from `dist/client`. Worker bundle **405 KiB / 93 KiB gzip** (well under CF's 10 MiB script limit).
  - Bindings resolved: `env.ASSETS` (Assets), `env.PUBLIC_GO_API_URL` ("https://api.scoracle.com/api/v1").
- esbuild emitted three `Ignoring this import because ... was marked as having no side effects` warnings (h3, solid-js/web/storage, cookie-es). These are tree-shake hygiene warnings — Vite preserved side-effect-only imports that the package.json `sideEffects: false` declarations contradict. Functionally harmless.

## Result

`scoracle-frontend` has a working CF Workers deployment pipeline. `npm run cf:deploy` now builds + ships in one command. Phase 4 is no longer blocked on tooling — what's left is staging deploy → bundle/perf measurement → parity testing against the live Astro Worker on pinned entities → DNS cutover.

Bundle context:
- Worker upload: 405 KiB / 93 KiB gzip (CF limit: 10 MiB).
- Client JS total: ~142.5 KiB (≤511 KiB budget per [[Frontend Architecture]] — **~28% of budget**, big headroom).

## Gotchas to remember

- **No prerender.** SolidStart 2.0-alpha has no static-prerender story without Nitro. The Frontend Architecture doc's "static prerender of `/`, `/profile`, `/terms`, `/404`" plan won't work until Nitro v3 lands. CF Workers Static Assets edge-caches them implicitly on first hit, which is most of the perf benefit anyway. Re-evaluate once SolidStart 2.0 stable ships.
- **`worker.ts` imports a built artifact.** `npm run cf:deploy` chains `vite build` first; `wrangler deploy` alone will fail with a missing-module error if dist isn't fresh.
- **Swap when official adapter ships.** Keep this shim under 50 lines so the swap is cheap. Track SolidStart 2.0 stable release for the trigger.

## Next

1. **First real deploy** — `wrangler login` (user-interactive), then `npm run cf:deploy`. Will land at `scoracle-frontend.<account>.workers.dev` until DNS cutover.
2. **Browser-side smoke against the deployed worker** — confirm SSR + asset routing + API hits land correctly under workerd, not just vite dev.
3. **Parity testing on pinned entities** — pick 1 player + 1 team per sport (NBA / NFL / Football), compare visual output against the live Astro flagship.
4. **DNS cutover** — point `scoracle.com` at the new Worker, leave Astro as 72 h hot standby per the Launch Plan.
5. **Smaller follow-ups** — dark-mode pre-paint script (FOUC fix from Phase 3b audit) and image optimization on `~6.6 MB` of sport logos (Lighthouse 90+ is launch-blocking).
