# Fix production SSR by adding `.env.production`

**Date:** 2026-05-02
**Scope:** One-file fix for the production-SSR-fetch failure that we mistook for a Cloudflare WAF block.

## Goal

Get streaming SSR (Tier 1) actually working on the deployed `scoracle-frontend` worker. Pre-fix, every server-side fetch returned 403 with body `error code: 1003`, surfacing in the rendered SSR HTML as `card-error` blocks.

## What Went Wrong

The diagnosis we settled on yesterday was "Cloudflare WAF on `api.scoracle.com` blocks worker-originated traffic." That was wrong. The real issue:

1. `src/lib/utils/data-sources.ts` resolves `import.meta.env.PUBLIC_GO_API_URL` at build time via Vite's env-inlining.
2. Only `.env.development` existed in the repo. `.env.production` and `.env` did not.
3. `vite build` (mode=production, used by `npm run cf:deploy`) reads `.env` + `.env.production`. Neither defines the var. So `import.meta.env.PUBLIC_GO_API_URL` was `undefined` at build time.
4. The fallback `'http://localhost:8000/api/v1'` got baked into the deployed worker bundle.
5. The deployed worker then ran server-side fetches against `http://localhost:8000/...`. From inside Cloudflare's worker network, "localhost" doesn't resolve to anything sensible — Cloudflare's edge intercepted the request and returned **error code 1003** ("Direct IP access not allowed: Direct IP access requires a Host header").
6. We saw `status=403 server=cloudflare` in the response, assumed it was a CF WAF block on `api.scoracle.com`, and went down a multi-hour rabbit hole through Bot Fight Mode, Browser Integrity Check, Security → Analytics, sampled logs, etc.

`wrangler.jsonc` does have `vars: { PUBLIC_GO_API_URL: "https://api.scoracle.com/api/v1" }` — but that's a **runtime** binding (accessed via `env.PUBLIC_GO_API_URL` in worker code). Vite's `import.meta.env.X` is a **build-time** inlined value from .env files. The wrangler.jsonc binding never reached the consuming code.

## How We Found It

Added a one-line `console.log` to the news server-fn that captured response status + headers + body when not OK. Redeployed. Triggered a request. `wrangler tail` showed:

```
[news fetch] url=http://localhost:8000/api/v1/news/player/177?sport=NBA
              status=403 server=cloudflare cf-ray=…
              ct=text/plain; charset=UTF-8 body=error code: 1003
```

The `url=http://localhost:8000/...` was the smoking gun. The "WAF block" diagnosis was always wrong.

Lesson: when debugging a "blocked" request, log the URL the worker actually called *before* assuming it's the URL you intended. `wrangler tail` with a temporary debug-log on the failing fetcher would have caught this in 5 minutes instead of a few hours.

## What Was Done

**Added** `.env.production`:

```
PUBLIC_GO_API_URL=https://api.scoracle.com/api/v1
```

That's the entire fix.

**Cleanup**: removed the temporary debug log from `src/lib/data/news.server.ts`. Updated a stale TODO comment in `src/components/solid/Header.tsx` (the pre-paint script it referenced has been in `entry-server.tsx` since the 2026-04-26 polish commit).

## Files Changed

**Added**
- `.env.production` — production API base URL
- `docs/progress/2026-05-02_env-production-ssr-fix.md`

**Modified**
- `src/lib/data/news.server.ts` — removed temporary debug logging
- `src/components/solid/Header.tsx` — refreshed stale comment about pre-paint script

## Verification

- `npm run typecheck` — green.
- `npm run build` — green.
- `npm test` — 67/67 passing.
- After `npm run cf:deploy`:
  - `curl https://scoracle-frontend.albapepper.workers.dev/profile?sport=NBA&type=player&id=177` returns **82 KB** body in 222 ms (vs 9 KB shell-only before).
  - **0** `card-error` blocks in the SSR HTML.
  - **3** real news article titles + URLs rendered server-side.
  - **5+** real stat values inline (`16.2`, `5.9`, `2.7`, etc. — Aaron Gordon's stat line).
  - `wrangler tail` shows the inbound request as OK with no `[news fetch]` failure logs.

## Result

Streaming SSR works in production. The full Tier 1 architecture — server-fns via `"use server"`, `query()` cache, `createAsync` consumers, `preload` route export, `<A>` hover prefetch — delivers content in the first byte of HTML on a real production fetch from `api.scoracle.com`.

The Cloudflare WAF was never the problem. There was nothing to triage in the dashboard. We can roll forward to the DNS cutover.

## Architectural note for next time

Vite `import.meta.env` ≠ wrangler runtime vars. They're two separate mechanisms:

- `.env`, `.env.[mode]`, `.env.local`, `.env.[mode].local` → inlined at `vite build` time → accessible as `import.meta.env.X`. **This is what our app code reads.**
- `wrangler.jsonc` `vars: { ... }` → injected at worker runtime → accessible as `env.X` inside the fetch handler. **The deployed worker bundle doesn't see these via `import.meta.env`.**

If a config value needs to reach `import.meta.env`, it has to live in a `.env*` file at build time. The wrangler.jsonc binding is useful for runtime-only values (database connection strings, secrets) that the fetch handler reads directly, not for app-code constants.

The repo's CLAUDE.md should pick up this distinction in the deployment section so the next maintainer doesn't land in the same trap.
