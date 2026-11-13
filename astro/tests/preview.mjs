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
