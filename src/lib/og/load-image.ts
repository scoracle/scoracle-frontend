/**
 * Fetch a remote image (entity photo / team logo) on first use, encode
 * the bytes as a `data:image/...;base64,...` URI suitable for an SVG
 * `<image href>` reference. resvg-wasm renders the inline image without
 * a network call, so the OG render stays self-contained.
 *
 * Cache is per-Worker-instance. Returns `null` on any fetch failure —
 * callers should fall back to a neutral placeholder.
 *
 * Uses Node's `Buffer.from(...).toString("base64")` (Workers have it
 * under the `nodejs_compat` compatibility flag, set in wrangler.jsonc)
 * instead of chunked `String.fromCharCode(...bytes)` so big images
 * (logo PNGs up to a few hundred KB) don't blow the call stack.
 */
const cache = new Map<string, string>();

export async function loadImageAsDataUri(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;
  if (cache.has(imageUrl)) return cache.get(imageUrl)!;
  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/png";
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUri = `data:${contentType};base64,${base64}`;
    cache.set(imageUrl, dataUri);
    return dataUri;
  } catch {
    return null;
  }
}
