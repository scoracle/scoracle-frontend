import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { readFile, readdir } from 'node:fs/promises';
const client = new URL('../../dist/client/', import.meta.url);
const files = await readdir(new URL('_astro/', client));
const scripts = files.filter(file => file.endsWith('.js'));
const source = await Promise.all(scripts.map(file => readFile(new URL(`_astro/${file}`, client), 'utf8')));
for (const code of source) {
  assert.doesNotMatch(code, /SCORACLE_INTERNAL_KEY|X-Scoracle-Internal-Key|api\.scoracle\.com|cloudflare:workers|@solidjs\/router|@solidjs\/web|createServerReference/);
}
for (const route of ['index.html', 'about/index.html']) {
  const html = await readFile(new URL(route, client), 'utf8');
  assert.doesNotMatch(html, /ProfileExperience|LeaderboardExplorer/);
  assert.equal((html.match(/<astro-island /g) ?? []).length, route === 'index.html' ? 1 : 0);
  assert.match(html, /<scoracle-tray /);
}
for (const name of ['HomeExplorer', 'LeaderboardExplorer', 'ProfileExperience']) {
  const code = source[scripts.findIndex(file => file.startsWith(`${name}.`))];
  assert.ok(code, `missing ${name} entry`);
  for (const other of ['HomeExplorer', 'LeaderboardExplorer', 'ProfileExperience'].filter(other => other !== name)) assert.ok(!code.includes(other), `${name} imports ${other}`);
}
const config = JSON.parse(await readFile(new URL('../../dist/server/wrangler.json', import.meta.url), 'utf8'));
assert.equal(config.assets.html_handling, 'drop-trailing-slash');
assert.equal(config.kv_namespaces.length, 0, 'no session infrastructure needed');
console.log('Route island boundaries, server-only transport and session-free Worker verified.');

const home = await readFile(new URL('index.html', client), 'utf8');
assert.match(home, /class="crystal-logo"/);
assert.match(home, /class="crystal-mist crystal-mist-1"/);
assert.match(home, /disabled/);
assert.match(home, /<noscript>/);
assert.doesNotMatch(home, /class="mover-card"/);
assert.doesNotMatch(home, /_searchIndex|search_tokens/);
const about = await readFile(new URL('about/index.html', client), 'utf8');
for (const section of ['about', 'contact', 'privacy', 'terms']) assert.ok(about.includes(`id="${section}"`));
const policy = await readFile(new URL('../../src/lib/response-policy.ts', import.meta.url), 'utf8');
const staticHeaders = await readFile(new URL('_headers', client), 'utf8');
const csp = [...policy.split('].join')[0].matchAll(/^  "(.*)",$/gm)].map(match => match[1]).join('; ');
assert.ok(staticHeaders.includes(`Content-Security-Policy: ${csp}`), 'static and dynamic CSP must agree');
for (const name of ['X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) assert.ok(staticHeaders.includes(name));
console.log('Static home composition, independent initial search, full About and static security headers verified.');

const themeScript = home.match(/<script[^>]*>((?:(?!<\/script>)[\s\S])*scoracle-theme(?:(?!<\/script>)[\s\S])*)<\/script>/)?.[1];
assert.ok(themeScript, 'pre-paint theme script');
for (const [pref, systemDark, expected] of [['dark', false, true], ['light', true, false], [null, true, true], ['blocked', true, true]]) {
  let dark = false;
  runInNewContext(themeScript, {
    localStorage: { getItem() { if (pref === 'blocked') throw new Error('Blocked storage'); return pref; } },
    matchMedia: () => ({ matches: systemDark }),
    document: { documentElement: { classList: { add() { dark = true; } } } },
  });
  assert.equal(dark, expected, `pre-paint theme: ${pref}`);
}
console.log('Pre-paint theme works with stored preferences and unavailable storage.');

const root = new URL('../../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
assert.equal(manifest.dependencies['solid-js'], '1.9.19');
for (const name of ['@solidjs/web', '@solidjs/router', '@solidjs/meta', '@solidjs/vite-plugin']) {
  assert.ok(!manifest.dependencies[name] && !manifest.devDependencies[name], `retired dependency ${name}`);
}
for (const path of ['astro/package.json', 'worker.ts', 'src/app.tsx', 'src/Document.tsx', 'src/entry-client.tsx', 'src/entry-server.tsx', 'scripts/patch-solid-ssr.mjs']) {
  await assert.rejects(readFile(new URL(path, root)), { code: 'ENOENT' });
}
assert.equal(config.name, 'scoracle-frontend');
console.log('Single root runtime, retired application entries and production Worker identity verified.');

// Static Astro slots must remove their markup from the hydrated render functions.
const entry = name => source[scripts.findIndex(file => file.startsWith(`${name}.`))];
assert.doesNotMatch(entry('HomeExplorer'), /crystal-logo|crystal-mist-1/);
assert.doesNotMatch(entry('ProfileExperience'), /pw-detail-item|pw-detail-label/);
assert.match(home, /<astro-slot name="artwork">/);
console.log('Static Home artwork and identity details stay out of product render functions.');
