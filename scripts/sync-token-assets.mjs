import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

function firstExisting(paths) {
  return paths.find((candidate) => fs.existsSync(candidate));
}

const tokensRoot = firstExisting([
  ...(process.env.SCORACLE_TOKENS_ROOT ? [path.resolve(process.env.SCORACLE_TOKENS_ROOT)] : []),
  path.resolve(root, "../scoracle-tokens"),
  path.resolve(root, "node_modules/@scoracle/tokens"),
]);

if (!tokensRoot) {
  console.error("Unable to find scoracle-tokens next to this repo or in node_modules.");
  process.exit(1);
}

const sourceRoot = fs.existsSync(path.join(tokensRoot, "assets"))
  ? path.join(tokensRoot, "assets")
  : path.join(tokensRoot, "dist");

const files = [
  ["brand/scoracle-crystal-ball.png", "public/images/scoracle_crystal_ball.png"],
  ["brand/scoracle-crystal-ball-no-hands.png", "public/images/scoracle_crystal_ball_no_hands.png"],
  ["brand/scoracle-crystal-ball-mark.png", "public/images/scoracle_crystal_ball_mark.png"],
  ["chrome/weathered-frame.svg", "public/chrome/weathered-frame.svg"],
];

// Approved shared identity, including the library license and provenance.
const iconsDir = path.join(sourceRoot, "icons");
if (!fs.existsSync(iconsDir)) throw new Error("Build/update scoracle-tokens: shared icons are missing.");
for (const file of fs.readdirSync(iconsDir).sort()) {
  files.push([`icons/${file}`, `public/icons/${file}`]);
}

// The same generated geometry feeds inline UI SVGs (and image capture).
const modulePath = path.join(tokensRoot, "dist/icons/index.mjs");
if (!fs.existsSync(modulePath)) throw new Error("Run npm run build in scoracle-tokens before syncing icons.");
const iconModule = fs.readFileSync(modulePath, "utf8").replace(/};\s*$/, "} as const;\n")
  + "export type IconName = keyof typeof icons;\n";
const generatedPath = path.join(root, "src/lib/icons.generated.ts");
if (!fs.existsSync(generatedPath) || fs.readFileSync(generatedPath, "utf8") !== iconModule) {
  if (checkOnly) { console.error("Asset drift: src/lib/icons.generated.ts"); process.exitCode = 1; }
  else fs.writeFileSync(generatedPath, iconModule);
}

// A stable, versioned URL refreshes cached favicons. Ink adapts to browser theme.
const favicon = fs.readFileSync(path.join(iconsDir, "brand-small.svg"), "utf8")
  .replace(/(<svg\b[^>]*>)/, '$1<style>svg{color:#2e2a24}@media(prefers-color-scheme:dark){svg{color:#f8f3e6}}</style>');
for (const file of ["favicon.svg", "favicon-5.svg"]) {
  const target = path.join(root, "public", file);
  if (!fs.existsSync(target) || fs.readFileSync(target, "utf8") !== favicon) {
    if (checkOnly) { console.error(`Asset drift: public/${file}`); process.exitCode = 1; }
    else fs.writeFileSync(target, favicon);
  }
}

// The approved orb masks, mist and drapery are shared with native Apple clients.
// Web keeps the original WebP bytes; the token build generates native PNGs.
const atmosphereDir = path.join(sourceRoot, "atmosphere");
if (fs.existsSync(atmosphereDir)) {
  for (const file of fs.readdirSync(atmosphereDir).sort()) {
    if (/\.(png|webp)$/.test(file)) {
      files.push([`atmosphere/${file}`, `public/images/${file}`]);
    }
  }
}

const vibeArtDir = path.join(sourceRoot, "vibe-art");
if (fs.existsSync(vibeArtDir)) {
  for (const file of fs.readdirSync(vibeArtDir).sort()) {
    if (file.endsWith(".svg")) {
      files.push([`vibe-art/${file}`, `public/vibe-art/${file}`]);
    }
  }
}

// Deck art — one line-drawing motif per character deck (Swords set,
// 2026-08-04). Rendered inside each card's wash layer (Card.tsx).
const deckArtDir = path.join(sourceRoot, "deck-art");
if (fs.existsSync(deckArtDir)) {
  for (const file of fs.readdirSync(deckArtDir).sort()) {
    if (file.endsWith(".svg")) {
      files.push([`deck-art/${file}`, `public/deck-art/${file}`]);
    }
  }
}

let changed = false;

for (const [sourceRel, targetRel] of files) {
  const source = path.join(sourceRoot, sourceRel);
  const target = path.join(root, targetRel);
  if (!fs.existsSync(source)) {
    console.error(`Missing token asset: ${source}`);
    process.exitCode = 1;
    continue;
  }

  const sourceBytes = fs.readFileSync(source);
  const targetBytes = fs.existsSync(target) ? fs.readFileSync(target) : null;
  const matches = targetBytes != null && sourceBytes.equals(targetBytes);

  if (matches) continue;

  changed = true;
  if (checkOnly) {
    console.error(`Asset drift: ${targetRel}`);
    process.exitCode = 1;
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    console.log(`synced ${targetRel}`);
  }
}

if (checkOnly && !changed) {
  console.log("Token assets are in sync.");
}
