/**
 * Load the OG image fonts on first use, then cache the bytes in module
 * scope so subsequent renders are zero-fetch.
 *
 * PT Serif fills the role of the live site's Georgia serif fallback —
 * resvg-wasm running on the Worker has no system fonts, so we ship our
 * own. Pairs Regular + Italic (the score is italic in VibeCard's design;
 * name + subtext use regular). Add bold if a future Card needs it.
 *
 * Fonts ship from `public/og/fonts/` (→ `dist/client/og/fonts/`) so the
 * ASSETS binding serves them by a stable literal path. They're read via the
 * binding (see makeAssetFetch) — a binding call, NOT a self-origin fetch,
 * which loops back through the edge inside a Worker and times out (522).
 */
import type { AssetFetch } from "../utils/cloudflare-env";

const REGULAR = "/og/fonts/pt-serif-regular.woff2";
const ITALIC = "/og/fonts/pt-serif-italic.woff2";

let cachedFonts: Uint8Array[] | null = null;

export async function loadFonts(fetchAsset: AssetFetch): Promise<Uint8Array[]> {
  if (cachedFonts) return cachedFonts;
  const [regular, italic] = await Promise.all([
    fetchAsset(REGULAR).then((r) => r.arrayBuffer()),
    fetchAsset(ITALIC).then((r) => r.arrayBuffer()),
  ]);
  cachedFonts = [new Uint8Array(regular), new Uint8Array(italic)];
  return cachedFonts;
}
