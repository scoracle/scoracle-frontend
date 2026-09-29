import { readdir, readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
const assets = await readdir('dist/client/assets');
const js = (await Promise.all(assets.filter(file => file.endsWith('.js')).map(file => readFile(`dist/client/assets/${file}`, 'utf8')))).join('\n');
for (const marker of ['SCORACLE_API_ORIGIN', 'SCORACLE_TRACE_API', '[scoracle:api]', 'X-Scoracle-Internal-Key', 'SCORACLE_INTERNAL_KEY', 'node:fs/promises', 'Invalid asset path']) {
  if (js.includes(marker)) throw new Error(`Server implementation leaked into the browser: ${marker}`);
}
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
if (lock.packages['node_modules/vite'].version !== '8.3.0') throw new Error('Unexpected Vite version');
console.log('Client/server boundary and Vite pin verified.');
for (const file of ['server.js', 'server.dev.js']) {
  const runtime = await readFile(`node_modules/@solidjs/web/dist/${file}`, 'utf8');
  if (!runtime.includes('const drop = () => pendingSerialized.delete(id);\n    raced.then(drop, drop);')) {
    throw new Error(`Solid RC8 serialized-promise correction is missing: ${file}`);
  }
  if (!runtime.includes('const p = new Promise((r, rej) => (resolve = r, reject = rej));\n        p.catch(() => {});')) {
    throw new Error(`Solid RC8 buffered-fragment correction is missing: ${file}`);
  }
}
console.log('Pinned SSR correction verified.');

// ─── Payload ceilings ───────────────────────────────────────────────────────
// Scoracle's philosophy is "eager load everything": one blocking entry chunk,
// every route and card in it, no code splitting. That is a deliberate trade —
// it buys a complete crawler view and instant ?tab= navigation. The cost is
// that nothing structurally stops the entry chunk from creeping upward, and
// eager means every byte is on the critical path of every pageview.
//
// So hold the line explicitly. These are ceilings, not targets: they sit just
// above today's measured sizes so ordinary edits pass and only real regressions
// fail the build. Bump a ceiling deliberately in the same commit that earns it.
//
// Measured baseline: entry JS 288.06 kB raw / 94.40 kB gzip, CSS 76.71 kB /
// 15.51 kB gzip.
const GIB = 1024;
const PAYLOAD_CEILINGS = [
  { label: 'entry JS (raw)',        bytes: 320 * 1024,   matches: /^entry-client-.*\.js$/ },
  { label: 'entry JS (gzip)',       bytes: 105 * 1024,   matches: /^entry-client-.*\.js$/, gzip: true },
  { label: 'entry CSS (raw)',       bytes: 88 * 1024,    matches: /^entry-client-.*\.css$/ },
  { label: 'entry CSS (gzip)',      bytes: 17 * 1024,    matches: /^entry-client-.*\.css$/, gzip: true },
];

const { gzipSync } = await import('node:zlib');

for (const ceiling of PAYLOAD_CEILINGS) {
  const files = assets.filter(file => ceiling.matches.test(file));
  if (files.length !== 1) {
    throw new Error(`Expected exactly one ${ceiling.label} file, found ${files.length}: ${files.join(', ') || 'none'}`);
  }
  const raw = await readFile(`dist/client/assets/${files[0]}`);
  const size = ceiling.gzip ? gzipSync(raw).length : raw.byteLength;
  if (size > ceiling.bytes) {
    throw new Error(
      `Payload ceiling exceeded — ${ceiling.label} is ${(size / 1024).toFixed(1)} kB ` +
      `(ceiling ${(ceiling.bytes / 1024).toFixed(0)} kB, file ${files[0]}). ` +
      `Eager loading puts every byte on every pageview's critical path. ` +
      `Shrink it, or raise the ceiling in scripts/verify-build.mjs on purpose.`
    );
  }
  console.log(`  ${ceiling.label.padEnd(20)} ${(size / 1024).toFixed(1)} kB / ${(ceiling.bytes / 1024).toFixed(0)} kB`);
}

// Dynamic chunks are allowed for framework internals the Vite plugin injects
// (decode, serverForms); application routes must stay in the entry chunk, since
// splitting them would quietly make the app lazy — the one outcome this
// philosophy rules out. The ceilings above would still pass if that happened,
// so name the chunks to make an unexpected one obvious.
const dynamicChunks = assets.filter(f => f.endsWith('.js') && !/^entry-client-.*\.js$/.test(f));
const knownDynamic = new Set(['decode', 'serverForms']);
const unexpected = dynamicChunks
  .map(f => f.replace(/-[A-Za-z0-9_-]{8}\.js$/, ''))
  .filter(name => !knownDynamic.has(name));
if (unexpected.length)
  throw new Error(
    `Unexpected dynamic chunk(s): ${unexpected.join(', ')}. ` +
    `Application code belongs in the entry chunk under eager loading — only ` +
    `[${[...knownDynamic].join(', ')}] may be split.`
  );
console.log(`  ${'dynamic JS chunks'.padEnd(20)} ${dynamicChunks.length} (framework only: ${[...knownDynamic].join(', ')})`);

// Fonts: every shipped woff2 must be reachable from a @font-face rule. A font
// nothing references is pure CDN weight on an eager-everything site — this is
// the guard that would have caught the 506 kB of orphaned fraunces subsets.
const fontFiles = (await readdir('public/fonts')).filter(f => f.endsWith('.woff2'));
const cssSources = execSync("find src -name '*.css'", { encoding: 'utf8' }).trim().split('\n');
const css = (await Promise.all(cssSources.map(f => readFile(f, 'utf8')))).join('\n');
const orphanedFonts = fontFiles.filter(font => !css.includes(font));
if (orphanedFonts.length)
  throw new Error(
    `Unreferenced font files in public/fonts: ${orphanedFonts.join(', ')}. ` +
    `Nothing can request them, so they are dead CDN weight.`
  );
console.log(`  ${'fonts referenced'.padEnd(20)} ${fontFiles.length} / ${fontFiles.length}`);
