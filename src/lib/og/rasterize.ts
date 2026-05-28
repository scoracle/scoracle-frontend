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
import { loadFonts } from "./load-fonts";
import { getResvgModule } from "./wasm-module";
import type { AssetFetch } from "../utils/cloudflare-env";

// resvg wasm ships from public/og/ (copied from node_modules by
// scripts/copy-og-wasm.mjs on postinstall) so the ASSETS binding can serve
// it by a stable literal path — avoids the self-origin loopback (522) and
// the Vite `?url`-into-dist/server problem.
const WASM_PATH = "/og/resvg.wasm";

// Use globalThis so HMR doesn't clear the init flag (the WASM module's
// own "already initialized" check persists across JS module reloads in
// the dev server, so we have to too).
declare global {
  var __scoracleResvgInitPromise: Promise<void> | undefined;
}

function initOnce(fetchAsset: AssetFetch): Promise<void> {
  if (!globalThis.__scoracleResvgInitPromise) {
    // Prod (Workers): use the WebAssembly.Module compiled at build time
    // (set by worker.ts) — runtime instantiation from bytes is blocked.
    // Dev (Node): fetch the vendored bytes, which Node is free to compile.
    const input = getResvgModule() ?? fetchAsset(WASM_PATH);
    globalThis.__scoracleResvgInitPromise = initWasm(input).catch((err) => {
      // resvg-wasm throws "Already initialized" when initWasm is called twice
      // (e.g. across HMR reloads in dev). Treat that as success — the module
      // is loaded either way.
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("Already initialized")) throw err;
    });
  }
  return globalThis.__scoracleResvgInitPromise;
}

export async function rasterizeSvg(svg: string, fetchAsset: AssetFetch): Promise<Uint8Array> {
  await initOnce(fetchAsset);
  const fontBuffers = await loadFonts(fetchAsset);

  const resvg = new Resvg(svg, {
    font: {
      fontBuffers,
      defaultFontFamily: "PT Serif",
      loadSystemFonts: false,
    },
  });
  return resvg.render().asPng();
}
