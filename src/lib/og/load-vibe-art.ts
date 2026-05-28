/**
 * Fetch a vibe-art archetype illustration SVG on first use (per-Worker
 * instance), cache the raw text in module scope so subsequent renders
 * are zero-fetch.
 *
 * Assets live in `public/vibe-art/<slug>.svg`, served as-is by the
 * ASSETS binding (assets-first routing). Same fetch pattern as the
 * font + WASM loaders — same-origin URL relative to the request URL.
 *
 * Returns the raw SVG file contents. The caller is responsible for
 * embedding (typically via a base64 data URI inside an `<image>` tag
 * so we don't have to parse + re-emit the file body).
 */
import type { AssetFetch } from "../utils/cloudflare-env";

const cache = new Map<string, string>();

export async function loadVibeArt(slug: string, fetchAsset: AssetFetch): Promise<string> {
  if (cache.has(slug)) return cache.get(slug)!;
  const res = await fetchAsset(`/vibe-art/${slug}.svg`);
  if (!res.ok) throw new Error(`vibe-art ${slug} ${res.status}`);
  const svg = await res.text();
  cache.set(slug, svg);
  return svg;
}

/**
 * Convert raw SVG text into a base64-encoded data URI suitable for use
 * inside an `<image href="...">` reference. Adds the `image/svg+xml`
 * mime so resvg-wasm parses it as inline SVG (not a raster image).
 *
 * Uses `btoa` on the byte-encoded string. SVG text is ASCII-safe in
 * our generated files, so this is straightforward.
 */
export function svgToDataUri(svg: string): string {
  const base64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}
