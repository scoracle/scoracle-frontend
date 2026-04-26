/// <reference types="@cloudflare/workers-types" />
/**
 * Cloudflare Workers entry for scoracle-frontend.
 *
 * SolidStart 2.0-alpha.2 ships no Cloudflare adapter — the Vinxi-era
 * `@solidjs/start/cloudflare-module` preset was dropped in the DeVinxi
 * rewrite and the official Nitro v3 integration won't land until 2.0
 * stable. This thin shim wires the SolidStart server bundle into the
 * Workers fetch handler.
 *
 * The SolidStart server entry exports an h3 v2 `H3` app instance as its
 * default. h3 v2 ships a Cloudflare adapter (`h3/cloudflare`) that converts
 * an H3 app into a `(Request) => Response` web handler we can invoke from
 * `fetch()`.
 *
 * Routing: Workers Static Assets (the `assets` binding in wrangler.jsonc)
 * is configured assets-first, so any file in dist/client/ — including
 * root-level /robots.txt, /sitemap.xml, /favicon.svg — is served by CF
 * before the worker is invoked. The worker only sees SSR routes (/,
 * /profile, /terms, /privacy, etc.), which it forwards to SolidStart.
 *
 * Swap to the official adapter when SolidStart 2.0 stable ships its
 * Nitro v3 integration. Keep this file under 50 lines so the swap is cheap.
 */

// @ts-expect-error — built artifact, only present after `vite build`.
import app from "./dist/server/entry-server.js";
import { toWebHandler } from "h3/cloudflare";

const handle = toWebHandler(app);

interface Env {
  ASSETS: Fetcher;
  PUBLIC_GO_API_URL: string;
}

export default {
  async fetch(request: Request): Promise<Response> {
    return handle(request);
  },
} satisfies ExportedHandler<Env>;
