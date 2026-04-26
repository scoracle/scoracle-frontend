/**
 * API Fetcher with SWR (Stale-While-Revalidate) pattern.
 *
 * Features:
 * - Request deduplication (concurrent requests for the same URL share one fetch)
 * - SWR caching (serves stale data instantly, revalidates in background)
 * - ETag support (conditional requests for entity endpoints)
 * - TTL-based cache expiration
 *
 * Client-only by design — the module-singleton `cache` and `inFlight`
 * Maps live in browser memory and would leak across requests if pulled
 * into a server-side loader on Cloudflare Workers (where module scope
 * persists across requests within an isolate). Don't import from server
 * entry points or per-request loaders.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  etag?: string;
}

/** Error thrown on non-2xx responses. `.status` is the HTTP code; `.message` is `error.message` from the backend envelope when present. */
export interface ApiError extends Error {
  status?: number;
}

interface FetcherOptions {
  /** Time in ms before data is considered stale (default: 60000 = 1 min) */
  staleTime?: number;
  /** Time in ms before cache entry is removed (default: 300000 = 5 min) */
  cacheTime?: number;
  /** Skip cache and force fresh fetch */
  forceRefresh?: boolean;
  /** Enable ETag-based conditional requests (default: true for widget endpoints) */
  useEtag?: boolean;
  /** Extra headers to include in the request */
  headers?: Record<string, string>;
}

// In-memory cache store
const cache = new Map<string, CacheEntry<unknown>>();

// In-flight request tracking for deduplication
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Default cache times aligned with backend TTLs:
 * - Widget info: 24 hours on backend -> 30 min stale locally
 * - Stats: 1 hour on backend -> 5 min stale locally
 * - News: 10 min on backend -> 2 min stale locally
 */
const DEFAULT_STALE_TIME = 60 * 1000; // 1 minute
const DEFAULT_CACHE_TIME = 30 * 60 * 1000; // 30 minutes

// Preset cache configurations aligned with backend
export const CACHE_PRESETS = {
  /** Widget/profile info - backend caches 24h */
  widget: { staleTime: 30 * 60 * 1000, cacheTime: 60 * 60 * 1000 }, // 30min stale, 1h cache
  /** Stats data - backend caches 1h */
  stats: { staleTime: 5 * 60 * 1000, cacheTime: 30 * 60 * 1000 }, // 5min stale, 30min cache
  /** News articles - backend caches 10min */
  news: { staleTime: 2 * 60 * 1000, cacheTime: 10 * 60 * 1000 }, // 2min stale, 10min cache
  /** Twitter - backend caches 1hr */
  twitter: { staleTime: 60 * 1000, cacheTime: 5 * 60 * 1000 }, // 1min stale, 5min cache
  /** ML predictions - moderate caching */
  ml: { staleTime: 10 * 60 * 1000, cacheTime: 30 * 60 * 1000 }, // 10min stale, 30min cache
} as const;

/**
 * Fetch with SWR pattern.
 * - Returns cached data immediately if available (even if stale)
 * - Revalidates in background if data is stale
 * - Deduplicates concurrent requests for the same URL
 * - Supports ETag-based conditional requests
 */
export async function swrFetch<T>(
  url: string,
  options: FetcherOptions = {}
): Promise<{ data: T; isStale: boolean; fromCache: boolean }> {
  const {
    staleTime = DEFAULT_STALE_TIME,
    cacheTime = DEFAULT_CACHE_TIME,
    forceRefresh = false,
    useEtag = /\/api\/v1\/(nba|nfl|football)\/(player|team)\//i.test(url),
    headers: extraHeaders = {},
  } = options;

  const now = Date.now();
  const cacheKey = url;

  const cached = cache.get(cacheKey) as CacheEntry<T> | undefined;

  if (cached && !forceRefresh) {
    const isExpired = now > cached.expiresAt;
    const isStale = now > cached.timestamp + staleTime;

    if (!isExpired) {
      if (isStale) {
        revalidate<T>(url, cacheTime, useEtag, cached.etag, extraHeaders);
      }
      return { data: cached.data, isStale, fromCache: true };
    }
  }

  const data = await dedupedFetch<T>(url, cacheTime, useEtag, cached?.etag, extraHeaders);
  return { data, isStale: false, fromCache: false };
}

/**
 * Fetch that deduplicates concurrent requests and supports ETags.
 */
async function dedupedFetch<T>(
  url: string,
  cacheTime: number,
  useEtag: boolean = false,
  existingEtag?: string,
  extraHeaders: Record<string, string> = {}
): Promise<T> {
  const existing = inFlight.get(url);
  if (existing) {
    return existing as Promise<T>;
  }

  const fetchPromise = (async () => {
    try {
      // Only send If-None-Match when we have an in-memory cached body to fall
      // back on. ETags without their corresponding payload are useless: a 304
      // response has no body, and we'd have nothing to return.
      const headers: Record<string, string> = { ...extraHeaders };
      if (useEtag && existingEtag) {
        headers['If-None-Match'] = existingEtag;
      }

      let response = await fetch(url, { headers });

      // 304 with no in-memory cache shouldn't happen given the guard above,
      // but defend against it: drop the conditional header and re-fetch fresh.
      if (response.status === 304) {
        const cached = cache.get(url) as CacheEntry<T> | undefined;
        if (cached) {
          const now = Date.now();
          cache.set(url, {
            ...cached,
            timestamp: now,
            expiresAt: now + cacheTime,
          });
          return cached.data;
        }
        delete headers['If-None-Match'];
        response = await fetch(url, { headers });
      }

      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const body = await response.json();
          if (body?.error?.message) message = body.error.message;
        } catch {
          // body wasn't JSON — keep the HTTP status message
        }
        const err = new Error(message) as ApiError;
        err.status = response.status;
        throw err;
      }

      const data = await response.json();

      const etag = response.headers.get('ETag');
      const now = Date.now();
      cache.set(url, {
        data,
        timestamp: now,
        expiresAt: now + cacheTime,
        etag: etag || undefined,
      });

      return data as T;
    } finally {
      inFlight.delete(url);
    }
  })();

  inFlight.set(url, fetchPromise);

  return fetchPromise;
}

/**
 * Background revalidation (fire and forget).
 */
function revalidate<T>(
  url: string,
  cacheTime: number,
  useEtag: boolean = false,
  existingEtag?: string,
  extraHeaders: Record<string, string> = {}
): void {
  if (inFlight.has(url)) return;

  dedupedFetch<T>(url, cacheTime, useEtag, existingEtag, extraHeaders).catch(() => {
    // Silently fail background revalidation
  });
}
