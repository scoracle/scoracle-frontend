/**
 * Load the OG image fonts on first use, then cache the bytes in module
 * scope so subsequent renders are zero-fetch.
 *
 * PT Serif fills the role of the live site's Georgia serif fallback —
 * resvg-wasm running on the Worker has no system fonts, so we ship our
 * own. Pairs Regular + Italic (the score is italic in VibeCard's design;
 * name + subtext use regular). Add bold if a future Card needs it.
 *
 * Fonts live alongside this module (`./fonts/*.woff2`), imported via
 * Vite's `?url` so the build copies them into `dist/client/assets/` with
 * a hashed name. At request time the Worker fetches them through the
 * same-origin URL, which routes through the ASSETS binding per
 * wrangler.jsonc's assets-first config.
 */
import regularUrl from "./fonts/pt-serif-regular.woff2?url";
import italicUrl from "./fonts/pt-serif-italic.woff2?url";

let cachedFonts: Uint8Array[] | null = null;

export async function loadFonts(baseUrl: URL): Promise<Uint8Array[]> {
  if (cachedFonts) return cachedFonts;
  const [regular, italic] = await Promise.all([
    fetch(new URL(regularUrl, baseUrl)).then((r) => r.arrayBuffer()),
    fetch(new URL(italicUrl, baseUrl)).then((r) => r.arrayBuffer()),
  ]);
  cachedFonts = [new Uint8Array(regular), new Uint8Array(italic)];
  return cachedFonts;
}
