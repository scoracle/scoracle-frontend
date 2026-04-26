/// <reference types="@cloudflare/workers-types" />
/**
 * Cloudflare Workers entry for scoracle-frontend.
 *
 * SolidStart 2.0-alpha.2 ships no Cloudflare adapter — the Vinxi-era
 * `@solidjs/start/cloudflare-module` preset was dropped in the DeVinxi
 * rewrite and the official Nitro v3 integration won't land until the 2.0
 * stable. This thin shim wires the SolidStart server bundle into the
 * Workers fetch handler.
 *
 * The SolidStart server entry exports an h3 v2 `H3` app instance as its
 * default. h3 v2 ships a Cloudflare adapter (`h3/cloudflare`) that converts
 * an H3 app into a `(Request) => Response` web handler we can invoke from
 * inside `fetch()`.
 *
 * Static assets ship via Workers Static Assets (the `assets` binding in
 * wrangler.jsonc). With `run_worker_first: true`, every request hits this
 * worker first and we route well-known asset prefixes to `env.ASSETS.fetch`
 * before falling through to the SolidStart handler for SSR.
 *
 * Swap to the official adapter when SolidStart 2.0 stable ships its
 * Nitro v3 integration. Keep this file under 50 lines so the swap is cheap.
 */

// @ts-expect-error — built artifact, only present after `vite build`.
import app from "./dist/server/entry-server.js";
import { toWebHandler } from "h3/cloudflare";

const handle = toWebHandler(app);

// Paths owned by Vite's output + our bundled static assets. Anything under
// these prefixes is served straight from the ASSETS binding; everything
// else (`/`, `/profile`, `/terms`, etc.) flows through SolidStart's SSR.
const ASSET_PREFIXES = ["/_build/", "/data/", "/images/", "/favicon."] as const;

interface Env {
  ASSETS: Fetcher;
  PUBLIC_GO_API_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (ASSET_PREFIXES.some((p) => path.startsWith(p))) {
      return env.ASSETS.fetch(request);
    }
    return handle(request);
  },
} satisfies ExportedHandler<Env>;
