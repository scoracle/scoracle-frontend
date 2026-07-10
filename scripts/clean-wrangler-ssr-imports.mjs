import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const serverAssetsDir = join(process.cwd(), "dist", "server", "_build", "assets");

const deadBareImports = new Set([
  "cookie-es",
  "h3",
  "nanostores",
  "pathe",
  "radix3",
  "solid-js",
  "solid-js/web",
  "solid-js/web/storage",
]);

const importRE = /^import\s+["']([^"']+)["'];\r?\n?/gm;

let removed = 0;
let touched = 0;

for (const entry of await readdir(serverAssetsDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".js")) continue;

  const file = join(serverAssetsDir, entry.name);
  const before = await readFile(file, "utf8");
  let fileRemoved = 0;
  const after = before.replace(importRE, (line, specifier) => {
    if (!deadBareImports.has(specifier)) return line;
    fileRemoved += 1;
    return "";
  });

  if (fileRemoved === 0) continue;
  await writeFile(file, after);
  removed += fileRemoved;
  touched += 1;
}

console.log(`clean-wrangler-ssr-imports: removed ${removed} dead bare imports from ${touched} server chunks`);
