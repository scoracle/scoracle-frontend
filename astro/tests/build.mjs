import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const client = new URL('../dist/client/', import.meta.url);
const files = await readdir(new URL('_astro/', client));
const scripts = files.filter(file => file.endsWith('.js'));
const source = await Promise.all(scripts.map(file => readFile(new URL(`_astro/${file}`, client), 'utf8')));
for (const code of source) {
  assert.doesNotMatch(code, /SCORACLE_INTERNAL_KEY|X-Scoracle-Internal-Key|api\.scoracle\.com|cloudflare:workers|@solidjs\/router|@solidjs\/web|createServerReference/);
}
for (const route of ['index.html', 'about/index.html']) {
  const html = await readFile(new URL(route, client), 'utf8');
  assert.doesNotMatch(html, /ProfileExperience|LeaderboardExplorer/);
  assert.equal((html.match(/<astro-island /g) ?? []).length, route === 'index.html' ? 2 : 1);
}
for (const name of ['AppTray', 'HomeExplorer', 'LeaderboardExplorer', 'ProfileExperience']) {
  const code = source[scripts.findIndex(file => file.startsWith(`${name}.`))];
  assert.ok(code, `missing ${name} entry`);
  for (const other of ['HomeExplorer', 'LeaderboardExplorer', 'ProfileExperience'].filter(other => other !== name)) assert.ok(!code.includes(other), `${name} imports ${other}`);
}
const config = JSON.parse(await readFile(new URL('../dist/server/wrangler.json', import.meta.url), 'utf8'));
assert.equal(config.kv_namespaces.length, 0, 'no session infrastructure needed');
console.log('Route island boundaries, server-only transport and session-free Worker verified.');
