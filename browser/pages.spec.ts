import { expect, test } from '@playwright/test';

test('search is independent of movers and directory errors retry locally', async ({ page }) => {
  await page.route('**/api/home-movers', route => route.fulfill({ json: [] }));
  await page.route('**/data/entities.json*', route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Search unavailable');
  await expect(page.locator('.home-search input')).toBeDisabled();
  await page.unroute('**/data/entities.json*');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  const input = page.locator('.home-search input');
  await expect(input).toBeEnabled(); await input.fill('Gordon');
  await page.locator('.search-suggestion-item').filter({ hasText: 'Aaron Gordon' }).click();
  await expect(page).toHaveTitle('Aaron Gordon - Scoracle');
});

test('board error leaves the shell usable and retries only the failed owner', async ({ page }) => {
  let fail = true;
  await page.route('**/api/board?*', route => fail && new URL(route.request().url()).searchParams.get('board') === 'rating'
    ? route.fulfill({ status: 503, json: { error: 'Unavailable' } }) : route.continue());
  const response = await page.goto('/leaderboard?sport=NBA'); expect(response?.status()).toBe(200);
  await expect(page.getByRole('alert').first()).toBeVisible(); fail = false;
  await page.getByRole('button', { name: /try again/i }).first().click();
  await expect(page.locator('.board-row').first()).toBeVisible();
  for (const name of ['Narratives', 'Vibe', 'Momentum', 'Sigil']) {
    const tab = page.getByRole('tab', { name, exact: true }); await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('h1')).toHaveText(name);
  }
});

test('static drapes stay decorative and profile palette keeps the split tint filter', async ({ page }) => {
  await page.goto('/');
  const wash = page.locator('.page-atmosphere');
  await expect(wash).toHaveAttribute('aria-hidden', 'true');
  await expect(wash.locator('img')).toHaveCount(2);
  await expect(wash.locator('source, filter')).toHaveCount(0);
  await expect(wash.locator('img').first()).toHaveAttribute('alt', '');
  await page.goto('/profile/nba/team/8-denver-nuggets');
  // Palette is optional metadata; if unavailable the default neutral drapes are correct.
  if (await wash.locator('filter').count()) {
    await expect(wash.locator('[result="neutral"]')).toHaveAttribute('values', '0');
    await expect(wash.locator('[result="primary"]')).toHaveAttribute('width', '50%');
    await expect(wash.locator('[result="secondary"]')).toHaveAttribute('x', '50%');
    await expect(wash.locator('[result="tintedTexture"]')).toHaveAttribute('mode', 'multiply');
    await expect(wash.locator('feComposite')).toHaveAttribute('operator', 'in');
  }
});
