import type { FetchTarget } from "../utils/data-sources";
import { getCloudflareEnv } from "../utils/cloudflare-env";
import { getRequestEvent } from "solid-js/web";

/** Workers-only fetch extensions; ignored under `vite dev` (Node). */
type WorkersRequestInit = RequestInit & { cf?: Record<string, unknown> };

/**
 * Shared fetch for every server-side product read. Two Workers-specific
 * behaviors ride along in production:
 *  - X-Scoracle-Internal-Key (Worker secret) exempts SSR traffic from the Go
 *    API's per-IP rate limit — all Worker fetches egress from shared
 *    Cloudflare IPs, so without it one busy page view can exhaust a bucket.
 *  - Successful product responses are cached at the edge. Rate limits and
 *    other API failures must never become shared cached responses.
 */
export async function fetchJsonOrNull<T>(
  target: FetchTarget,
  label: string,
): Promise<T | null> {
  const headers: Record<string, string> = { ...target.headers };
  const internalKey = getCloudflareEnv()?.SCORACLE_INTERNAL_KEY;
  if (internalKey) headers["X-Scoracle-Internal-Key"] = internalKey;

  const init: WorkersRequestInit = {
    headers,
    cf: { cacheTtlByStatus: { "200-299": 300, "300-599": -1 }, cacheEverything: true },
  };
  let res = await fetch(target.url, init);
  // Old deployments could cache failures. Recheck only an explicitly cached
  // error once; a live origin rate limit must not cause a retry loop.
  if (!res.ok && res.status !== 404 && ["HIT", "STALE", "UPDATING"].includes(res.headers.get("CF-Cache-Status") ?? "")) {
    await res.body?.cancel();
    res = await fetch(target.url, { headers, cache: "no-store" });
  }
  if (res.status === 404) return null;
  if (!res.ok) {
    // A caught product error can still render a partial document. Keep that
    // response out of both browser and Worker document caches.
    const event = getRequestEvent();
    if (event) {
      event.response.status = res.status === 429 || res.status >= 500 ? 503 : 502;
      event.response.headers.set("Cache-Control", "no-store");
    }
    console.error("[scoracle:api-error]", {
      product: label,
      status: res.status,
      cacheStatus: res.headers.get("CF-Cache-Status"),
      contentType: res.headers.get("Content-Type"),
      internalKeyConfigured: !!internalKey,
    });
    throw new Error(`${label} ${res.status}`);
  }
  return (await res.json()) as T;
}
