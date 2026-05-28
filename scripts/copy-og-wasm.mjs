/**
 * Copy the resvg-wasm binary into public/og/ so the Cloudflare ASSETS
 * binding can serve it by a stable literal path (/og/resvg.wasm) at SSR.
 *
 * Why a copy: the package's `index_bg.wasm` lives in node_modules. Importing
 * it via Vite `?url` from server code emits it into dist/server (not
 * dist/client, where ASSETS serves from), and a Worker can't self-origin
 * fetch it (522). Vendoring it into public/ sidesteps both.
 *
 * Wired to `postinstall` so public/og/resvg.wasm always matches the installed
 * @resvg/resvg-wasm version. Defensive — warns rather than failing install.
 */
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "node_modules/@resvg/resvg-wasm/index_bg.wasm");
const dest = resolve(root, "public/og/resvg.wasm");

try {
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(src, dest);
  console.log(`[copy-og-wasm] copied ${src} -> ${dest}`);
} catch (err) {
  console.warn(`[copy-og-wasm] skipped: ${err?.message ?? err}`);
}
