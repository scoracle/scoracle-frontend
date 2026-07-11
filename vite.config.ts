import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";
import { solidStart } from "@solidjs/start/config";

/**
 * Cache-busting version for the bundled entity data (public/data/*.json),
 * baked into the client's fetch URLs as `?v=`. A content hash — not a build
 * timestamp — so a deploy with unchanged data keeps the same URLs and the
 * edge/browser caches stay warm.
 */
function dataVersion(): string {
  const dir = join(process.cwd(), "public", "data");
  const hash = createHash("sha256");
  for (const name of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    hash.update(name);
    hash.update(readFileSync(join(dir, name)));
  }
  return hash.digest("hex").slice(0, 12);
}

export default defineConfig({
  envPrefix: "PUBLIC_",
  plugins: [
    solidStart({
      ssr: true,
      middleware: "src/middleware.ts",
    }),
  ],
  define: {
    __DATA_VERSION__: JSON.stringify(dataVersion()),
  },
  resolve: {
    alias: {
      "@lib": "/src/lib",
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
