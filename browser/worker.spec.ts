import { expect, test } from '@playwright/test';

test('shell metadata and policy survive product failure; APIs remain uncached', async ({ request }) => {
  const response = await request.get('/profile/nba/player/177-aaron-gordon');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('Aaron Gordon'); expect(html).not.toContain('SCORACLE_INTERNAL_KEY');
  expect(html.match(/<title(?:\s|>)/g)).toHaveLength(1);
  expect(response.headers()['content-security-policy']).toContain("object-src 'none'");
  const invalid = await request.get('/api/vibe?sport=nba&type=player&id=177&url=evil');
  expect(invalid.status()).toBe(400); expect(invalid.headers()['cache-control']).toBe('no-store');
  const missing = await request.get('/profile/nba/player/999999999-nope');
  expect(missing.status()).toBe(404); expect(missing.headers()['cache-control']).toBe('no-store');
});

test('hashed island scripts and delivery artwork are immutable', async ({ page, request }) => {
  await page.goto('/');
  const assets = await page.evaluate(() => [document.querySelector('astro-island')!.getAttribute('component-url')!, document.querySelector<HTMLImageElement>('.crystal-logo')!.getAttribute('src')!]);
  for (const path of assets) {
    const asset = await request.get(path); expect(asset.status()).toBe(200);
    expect(asset.headers()['cache-control']).toContain('max-age=31536000');
    expect(asset.headers()['cache-control']).toContain('immutable');
  }
});
