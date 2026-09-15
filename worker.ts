/** Cloudflare host adapter for Solid 2. Bindings stay request-local; document
 * caches are keyed by deployment version and never store partial failures. */
import { handleRequest } from "./dist/server/server.js";
const server = {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handleRequest(request, { event: { locals: { cloudflare: { env, ctx } } } });
  },
};

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
    if (request.method !== "GET" || request.headers.has("Authorization") || request.headers.has("Cookie") || !isCacheableDocumentPath(url.pathname)) {
      return server.fetch(request, env, ctx);
    }

    const key = cacheKeyUrl(url, env.CF_VERSION_METADATA?.id || "dev");
    const cached = await (caches as CacheStorage & { default: Cache }).default.match(key);
    if (cached) return withEdgeCacheHeader(cached, "hit");

    const response: Response = await server.fetch(request, env, ctx);
    // Only full documents enter the cache: redirects (legacy /profile?sport=
    // links) and error pages must stay origin-rendered.
    if (
      response.status === 200 &&
      !response.headers.has("Set-Cookie") &&
      (response.headers.get("Cache-Control") ?? "").startsWith("public,") &&
      (response.headers.get("Content-Type") ?? "").includes("text/html")
    ) {
      ctx.waitUntil((caches as CacheStorage & { default: Cache }).default.put(key, response.clone()));
    }
    return withEdgeCacheHeader(response, "miss");
  },
};
