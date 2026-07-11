import type { FetchTarget } from "../utils/data-sources";
import { getCloudflareEnv } from "../utils/cloudflare-env";

/** Workers-only fetch extensions; ignored under `vite dev` (Node). */
type WorkersRequestInit = RequestInit & { cf?: Record<string, unknown> };

/**
 * Shared fetch for every server-side product read. Two Workers-specific
 * behaviors ride along in production:
 *  - X-Scoracle-Internal-Key (Worker secret) exempts SSR traffic from the Go
 *    API's per-IP rate limit — all Worker fetches egress from shared
 *    Cloudflare IPs, so without it one busy page view can exhaust a bucket.
 *  - `cf.cacheTtl` serves repeat reads of the same product URL from the edge
 *    cache instead of re-hitting the API (api.scoracle.com is a proxied
 *    Cloudflare zone, so fetch-level caching applies).
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
    cf: { cacheTtl: 300, cacheEverything: true },
  };
  const res = await fetch(target.url, init);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${label} ${res.status}`);
  return (await res.json()) as T;
}
