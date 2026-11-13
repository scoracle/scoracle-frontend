import assert from 'node:assert/strict';
const origin = process.argv[2] ?? 'http://127.0.0.1:4322';
const results = [];
for (const [path, status, location] of [
  ['/', 200], ['/about', 200], ['/about/', 307, '/about'],
  ['/contact', 301, '/about#contact'], ['/privacy', 301, '/about#privacy'], ['/terms', 301, '/about#terms'],
  ['/profile', 302, '/leaderboard'], ['/profile?sport=nba&type=player&id=177&tab=vibe', 301, '/profile/nba/player/177?tab=vibe'],
  ['/missing', 404], ['/profile/nba/player/999999999-nope', 404], ['/api/home-movers?url=bad', 400],
]) {
  const response = await fetch(new URL(path, origin), { redirect: 'manual' });
  assert.equal(response.status, status, path);
  if (location) assert.equal(new URL(response.headers.get('location'), origin).pathname + new URL(response.headers.get('location'), origin).search + new URL(response.headers.get('location'), origin).hash, location, path);
  if ([200, 400, 404].includes(status)) {
    assert.ok(response.headers.has('content-security-policy'), path);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path);
  }
  if (path === '/' || path === '/about') assert.equal(response.headers.get('cache-control'), 'public, max-age=300, stale-while-revalidate=600');
  if (path.startsWith('/api/') || path.includes('999999999')) assert.equal(response.headers.get('cache-control'), 'no-store');
  results.push({ path, status, location: response.headers.get('location'), cache: response.headers.get('cache-control') });
  await response.body?.cancel();
}
console.log(JSON.stringify(results, null, 2));

for (const [path, name, tab] of [
  ['/profile/nba/player/177-stale?tab=vibe&season=2025', 'Aaron Gordon', 'vibe'],
  ['/profile/nba/team/8?tab=profile', 'Denver Nuggets', null],
  ['/profile/nba/player/177?tab=news&newsView=vibe', 'Aaron Gordon', 'vibe'],
  ['/profile/nba/player/177?tab=invalid', 'Aaron Gordon', null],
]) {
  const response = await fetch(`${origin}${path}`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes(`${name} - Scoracle`));
  assert.match(html, /class="card meta-widget\s*"/);
  assert.match(html, /Reading loading/);
  assert.match(html, /Live readings require JavaScript/);
  assert.doesNotMatch(html, /vibe-feed-card|The room&#39;s felt read/);
  assert.equal((html.match(/<astro-island /g) ?? []).length, 2);
  const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1];
  assert.ok(canonical?.includes(name === 'Aaron Gordon' ? '177-aaron-gordon' : '8-denver-nuggets'));
  assert.equal(new URL(canonical).search, tab ? `?tab=${tab}` : '');
  const crawler = await fetch(`${origin}${path}`, { headers: { 'User-Agent': 'Googlebot' } });
  assert.equal(crawler.status, 200);
  const crawlerHtml = await crawler.text();
  assert.match(crawlerHtml, /class="card meta-widget\s*"/);
  assert.ok(crawlerHtml.includes(`href="${canonical}"`));
  assert.match(crawlerHtml, /Reading loading/);
}
for (const path of ['/profile/chess/player/177', '/profile/nba/person/177', '/profile/nba/player/no-id']) {
  assert.equal((await fetch(`${origin}${path}`)).status, 404);
}
console.log('Profile initial identity, product-free shell, canonical aliases, malformed routes and crawler contract verified.');
