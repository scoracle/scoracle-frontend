import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const targets = [
  "node_modules/@solidjs/start/src/shared/ErrorBoundary.tsx",
  "node_modules/@solidjs/start/dist/shared/ErrorBoundary.jsx",
].map((file) => join(process.cwd(), file));

const before = ': "Error | Uncaught Client Exception";';
const after = ': "Scoracle";';

let patched = 0;

for (const target of targets) {
  if (!existsSync(target)) continue;

  const source = readFileSync(target, "utf8");

  if (source.includes(after)) {
    continue;
  }

  if (!source.includes(before)) {
    throw new Error(`SolidStart ErrorBoundary fallback shape changed in ${target}; patch needs review`);
  }

  writeFileSync(target, source.replace(before, after));
  patched += 1;
}

console.log(
  patched > 0
    ? `patch-solidstart-error-boundary: patched ${patched} SolidStart fallback file(s)`
    : "patch-solidstart-error-boundary: already patched",
);
