import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const data = resolve(import.meta.dirname, "public/data");
const hash = createHash("sha256");
for (const name of readdirSync(data).filter(n => n.endsWith(".json")).sort()) {
  hash.update(name).update(readFileSync(resolve(data, name)));
}
export default defineConfig({
  envPrefix: "PUBLIC_",
  plugins: [solid({ start: { devtools: false, middleware: "./src/middleware.ts" }, ssr: true, serverFunctions: true })],
  define: { __DATA_VERSION__: JSON.stringify(hash.digest("hex").slice(0, 12)) },
});
