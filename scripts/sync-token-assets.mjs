import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

function firstExisting(paths) {
  return paths.find((candidate) => fs.existsSync(candidate));
}

const tokensRoot = firstExisting([
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
  ["chrome/weathered-tarot-border.svg", "public/chrome/weathered-tarot-border.svg"],
];

const vibeArtDir = path.join(sourceRoot, "vibe-art");
if (fs.existsSync(vibeArtDir)) {
  for (const file of fs.readdirSync(vibeArtDir).sort()) {
    if (file.endsWith(".svg")) {
      files.push([`vibe-art/${file}`, `public/vibe-art/${file}`]);
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
