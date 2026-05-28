/// <reference types="@cloudflare/workers-types" />
/**
 * Cloudflare Workers entry for scoracle-frontend.
 *
 * SolidStart 2.0-alpha.2 ships no Cloudflare adapter, so this file wires
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
// @ts-expect-error — wrangler/esbuild loads .wasm as a WebAssembly.Module.
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm";
import { setResvgModule } from "./src/lib/og/wasm-module";

// Workers disallow instantiating wasm from fetched bytes at runtime ("code
// generation disallowed by embedder"). The OG image renderer (resvg) must
// init from a build-time-compiled WebAssembly.Module instead. Importing it
// here lets wrangler compile it into the worker; we hand it to the SSR code
// (a separate Vite bundle) via the typed accessor in og/wasm-module.
setResvgModule(resvgWasm as WebAssembly.Module);

const server = serve(app, { manual: true });

export default { fetch: server.fetch };
