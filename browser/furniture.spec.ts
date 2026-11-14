import { expect, test } from '@playwright/test';

test('Astro identity details survive hydration while team and image behavior stay live', async ({ page }) => {
  await page.route('**/api/*', route => {
    const key = new URL(route.request().url()).pathname;
    return route.fulfill({ json: key === '/api/stats' ? {
      rating: { team: { id: 8, name: 'Season team' } }, available_seasons: [], events: [],
    } : null });
  });
  await page.goto('/profile/nba/player/177-aaron-gordon');
  await expect(page.locator('.pw-subtitle-link')).toHaveText('Season team');
  expect(await page.locator('.meta-widget').evaluate(el => getComputedStyle(el).translate)).toBe('-2px 2px');
  const details = page.locator('astro-slot[name=details]');
  await expect(details.locator('.pw-detail-item').first()).toBeVisible();
  expect(await details.evaluate(el => getComputedStyle(el).display)).toBe('contents');
  expect(await page.locator('.profile-deck').evaluate(el => el.closest('astro-island'))).toBeNull();
  await expect(details.locator('[data-hk]')).toHaveCount(0);
  const image = page.locator('.pw-ring-crest img');
  if (await image.count()) await image.dispatchEvent('error');
  await expect(page.locator('.pw-crest-mono')).toHaveText('A');
});

test('Astro Home artwork shares the discovery layout with live movers and independent search', async ({ page }) => {
  await page.route('**/api/home-movers', route => route.fulfill({ json: [
    { id: 177, name: 'Fixed mover', sport: 'nba', entity_type: 'player', metric: 'rating', delta: 4 },
  ] }));
  await page.goto('/');
  await expect(page.locator('.mover-name')).toHaveText('Fixed mover');
  await expect(page.locator('.home-search input')).toBeEnabled();
  const art = page.locator('astro-slot[name=artwork]');
  expect(await art.evaluate(el => getComputedStyle(el).display)).toBe('contents');
  await expect(art.locator('.crystal-mist')).toHaveCount(3);
  await expect(art.locator('.crystal-logo')).toHaveAttribute('fetchpriority', 'high');
  await expect(art.locator('[data-hk]')).toHaveCount(0);
});
