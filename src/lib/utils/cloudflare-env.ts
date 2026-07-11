/**
 * Cloudflare runtime access for SSR.
 *
 * The Worker entry (`worker.ts`) uses h3's Cloudflare adapter, which (via
 * srvx) attaches the platform context to each request as
 * `request.runtime.cloudflare.env`. h3 surfaces that on the event
 * (`H3Event.runtime` → `req.runtime`), and SolidStart exposes the h3 event
 * as `getRequestEvent().nativeEvent`. So bindings are first-class and
 * request-scoped — no globals, no AsyncLocalStorage.
 *
 * Under `vite dev` the server runs on Node with no Cloudflare bindings, so
 * `getCloudflareEnv()` returns undefined and asset reads fall back to the
 * local `public/` dir (mirrors the dev/prod split in `data-sources.ts`).
 */

import { isServer, getRequestEvent } from "solid-js/web";

interface AssetsFetcher {
  fetch: (input: Request | string | URL) => Promise<Response>;
}

export interface CloudflareEnv {
  ASSETS?: AssetsFetcher;
  PUBLIC_GO_API_URL?: string;
  /** Worker secret (`wrangler secret put SCORACLE_INTERNAL_KEY`) — exempts SSR
   *  fetches from the Go API's IP rate limit. Absent in dev. */
  SCORACLE_INTERNAL_KEY?: string;
}

/** Cloudflare bindings for the in-flight request, or undefined under `vite dev`. */
export function getCloudflareEnv(): CloudflareEnv | undefined {
  return readEnvFromH3(getRequestEvent()?.nativeEvent);
}

/**
 * Read Cloudflare bindings from an h3 event directly, where the
 * component-tree `getRequestEvent()` may not be in scope. h3's
 * `H3Event.runtime` getter returns `req.runtime`, which srvx populates
 * with `.cloudflare.env`.
 */
export function readEnvFromH3(h3Event: unknown): CloudflareEnv | undefined {
  const runtime = (h3Event as { runtime?: { cloudflare?: { env?: CloudflareEnv } } })?.runtime;
  return runtime?.cloudflare?.env;
}

/**
 * Read a static asset (path like "/data/football-meta.json") server-side.
 * Prod (Workers): via the ASSETS binding — a binding call, NOT a self-origin
 * HTTP subrequest (which would 522). Dev (Node): from ./public on disk.
 * Returns null when unavailable.
 */
export async function readServerAssetText(path: string): Promise<string | null> {
  const env = getCloudflareEnv();
  if (env?.ASSETS) {
    const res = await env.ASSETS.fetch(new URL(path, "http://assets.local"));
    return res.ok ? await res.text() : null;
  }
  // Dev-server (Node) fallback. Guarded so the prod Worker bundle and the
  // client bundle both tree-shake out the node:fs import.
  if (isServer && import.meta.env.DEV) {
    try {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      return await readFile(
        join(process.cwd(), "public", path.replace(/^\//, "")),
        "utf8",
      );
    } catch {
      return null;
    }
  }
  return null;
}
