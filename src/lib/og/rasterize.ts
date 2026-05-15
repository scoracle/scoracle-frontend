/**
 * Rasterize an SVG string to a PNG byte buffer using resvg-wasm.
 *
 * `initWasm` runs once per Worker instance (memoized via the
 * `wasmInitPromise` module-scope variable). On subsequent requests the
 * WASM is already loaded — only the SVG → PNG render runs per call.
 *
 * Fonts are passed as font buffers per render — resvg's internal font
 * db maps `font-family` strings in the SVG against the registered fonts.
 * `defaultFontFamily: "PT Serif"` means any unspecified text picks up
 * the brand serif. `loadSystemFonts: false` matters on Workers (no
 * system fonts to load anyway) — keeps the render deterministic.
 */
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import wasmUrl from "@resvg/resvg-wasm/index_bg.wasm?url";
import { loadFonts } from "./load-fonts";

// Use globalThis so HMR doesn't clear the init flag (the WASM module's
// own "already initialized" check persists across JS module reloads in
// the dev server, so we have to too).
declare global {
  var __scoracleResvgInitPromise: Promise<void> | undefined;
}

function initOnce(baseUrl: URL): Promise<void> {
  if (!globalThis.__scoracleResvgInitPromise) {
    globalThis.__scoracleResvgInitPromise = initWasm(fetch(new URL(wasmUrl, baseUrl))).catch((err) => {
      // resvg-wasm throws "Already initialized" when initWasm is called twice
      // (e.g. across HMR reloads in dev). Treat that as success — the module
      // is loaded either way.
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("Already initialized")) throw err;
    });
  }
  return globalThis.__scoracleResvgInitPromise;
}

export async function rasterizeSvg(svg: string, baseUrl: URL): Promise<Uint8Array> {
  await initOnce(baseUrl);
  const fontBuffers = await loadFonts(baseUrl);

  const resvg = new Resvg(svg, {
    font: {
      fontBuffers,
      defaultFontFamily: "PT Serif",
      loadSystemFonts: false,
    },
  });
  return resvg.render().asPng();
}
