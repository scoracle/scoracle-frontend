/// <reference types="@cloudflare/workers-types" />
/**
 * Cloudflare Workers entry for scoracle-frontend.
 *
 * SolidStart 2.0-alpha ships no Cloudflare adapter, so this file wires
 * the built SolidStart server bundle (an h3 v2 `H3` app) into the Workers
 * fetch handler via h3's Cloudflare adapter.
 *
 * We use `serve(app, { manual: true })` (not the bare `toWebHandler`): the
 * adapter's `fetch(request, env, ctx)` attaches the Cloudflare platform
 * context to each request as `request.runtime.cloudflare.env` (see srvx).
 * That makes bindings — `ASSETS`, and any future KV/R2/D1 — first-class and
 * request-scoped for SSR code (read via `getCloudflareEnv()` in
 * `src/lib/utils/cloudflare-env.ts`). `manual: true` keeps the module-worker
 * shape (export default { fetch }) instead of the legacy addEventListener.
 *
 * Routing: Workers Static Assets (assets-first per wrangler.jsonc) serves
 * files in dist/client/ directly; the worker only sees SSR routes.
 */

// @ts-expect-error — built artifact, only present after `vite build`.
import app from "./dist/server/entry-server.js";
import { serve } from "h3/cloudflare";

const server = serve(app, { manual: true });

export default { fetch: server.fetch };
