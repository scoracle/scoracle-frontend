import { readdir, readFile } from 'node:fs/promises';
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
