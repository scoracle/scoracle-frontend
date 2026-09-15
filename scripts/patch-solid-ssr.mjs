import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../node_modules/@solidjs/web/', import.meta.url);
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
if (pkg.version !== '2.0.0-rc.8') throw new Error('Reassess the Solid SSR patch before changing @solidjs/web versions.');
// The returned race must be observed immediately, even while a parent Loading
// boundary buffers serialization. Its original rejection still reaches the
// serializer/Error boundary; this does not convert failures to successful data.
const before = '    const drop = () => pendingSerialized.delete(id);\n    p.then(drop, drop);\n    return raced;';
const after = before.replace('p.then(drop, drop)', 'raced.then(drop, drop)');
const fragmentBefore = '        const p = new Promise((r, rej) => (resolve = r, reject = rej));\n        registry.set(key, {';
const fragmentAfter = fragmentBefore.replace('\n        registry.set', '\n        p.catch(() => {});\n        registry.set');
for (const file of ['dist/server.js', 'dist/server.dev.js']) {
  const path = new URL(file, root); let source = await readFile(path, 'utf8');
  for (const [original, corrected] of [[before, after], [fragmentBefore, fragmentAfter]]) {
    if (source.includes(corrected)) continue;
    if (source.split(original).length !== 2) throw new Error(`Unexpected Solid SSR source: ${file}`);
    source = source.replace(original, corrected);
  }
  await writeFile(path, source);
}
console.log('Solid RC8 serialized-promise lifecycle correction applied.');
