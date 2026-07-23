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
 *
 * Edge cache: the SSR'd document routes serve the same HTML to every
 * requester (the rendering contract), so they're cached in the colo cache
 * (caches.default) under a deploy-version-keyed synthetic URL. A new deploy
 * mints a new version id, so the new build can never serve the old build's
 * documents — purge-on-deploy without purge calls; orphaned entries age out
 * on their own max-age (300s, set by src/middleware.ts). A cache hit costs
 * ~1ms CPU where a profile render costs tens to hundreds, so the ambient
 * profile crawl and hot pages stop drawing down the Worker CPU budget.
 * `x-edge-cache: hit|miss` tells probes which path served the response.
 */

// @ts-expect-error — built artifact, only present after `vite build`.
import app from "./dist/server/entry-server.js";
import { serve } from "h3/cloudflare";

interface Env {
  ASSETS: Fetcher;
  /** wrangler.jsonc `version_metadata` binding — absent under old configs. */
  CF_VERSION_METADATA?: { id?: string };
}

const server = serve(app, { manual: true });

/** Mirrors isCacheableDocumentPath in src/middleware.ts — the document routes
 *  that carry `Cache-Control: public` (same HTML for every requester). */
function isCacheableDocumentPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/leaderboard" ||
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname === "/terms" ||
    pathname === "/privacy"
  );
}

// Params that never change the rendered document — dropped so campaign links
// don't fragment the cache. Everything else (tab, board, season, legacy
// sport/type/id, …) stays in the key: it selects what SSR renders.
const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
];

function cacheKeyUrl(url: URL, version: string): string {
  const params = new URLSearchParams(url.search);
  for (const name of TRACKING_PARAMS) params.delete(name);
  params.sort(); // param order never renders; one key per document
  const qs = params.toString();
  return `https://edge-cache.scoracle.com/${version}${url.pathname}${qs ? `?${qs}` : ""}`;
}

/** Responses out of cache.match (and streamed SSR responses) carry immutable
 *  headers; rewrap to stamp the probe header. */
function withEdgeCacheHeader(response: Response, value: "hit" | "miss"): Response {
  const out = new Response(response.body, response);
  out.headers.set("x-edge-cache", value);
  return out;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== "GET" || !isCacheableDocumentPath(url.pathname)) {
      return server.fetch(request, env, ctx);
    }

    const key = cacheKeyUrl(url, env.CF_VERSION_METADATA?.id || "dev");
    const cached = await caches.default.match(key);
    if (cached) return withEdgeCacheHeader(cached, "hit");

    const response: Response = await server.fetch(request, env, ctx);
    // Only full documents enter the cache: redirects (legacy /profile?sport=
    // links) and error pages must stay origin-rendered.
    if (
      response.status === 200 &&
      (response.headers.get("Content-Type") ?? "").includes("text/html")
    ) {
      ctx.waitUntil(caches.default.put(key, response.clone()));
    }
    return withEdgeCacheHeader(response, "miss");
  },
};
