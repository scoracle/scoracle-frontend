import { expect, test } from '@playwright/test';
const aaron = '/profile/nba/player/177-aaron-gordon';
const nuggets = '/profile/nba/team/8-denver-nuggets';
const errors: string[] = [];
let expectedError: string | undefined;
test.beforeEach(async ({ page, request }) => {
  // Third-party ad delivery is outside the application regression contract.
  await page.route('https://**.googlesyndication.com/**', route => route.abort());
  expectedError = undefined; errors.length = 0; page.on('pageerror', e => errors.push(e.message));
  await request.post('http://127.0.0.1:18001/__test', { data: {} });
});
test.afterEach(() => expect(errors.filter(error => error !== expectedError)).toEqual([]));
const apiLog = async (request: any) => (await (await request.get('http://127.0.0.1:18001/__test')).json()).requests;

test('real SSR data hydrates once and every dealt card is eager', async ({ page, request }) => {
  const rpc: string[] = [];
  page.on('request', r => { if (r.url().includes('/_server')) rpc.push(r.url()); });
  const response = await page.goto(aaron, { waitUntil: 'networkidle' });
  expect(response?.status()).toBe(200);
  const html = await response!.text(); expect(html).toContain('Aaron Gordon'); expect(html).toContain('scouting-card');
  const calls = await apiLog(request);
  const products = calls.filter((r: any) => r.path.includes('/177/'));
  expect(new Set(products.map((r: any) => r.path)).size).toBe(products.length);
  expect(products.some((r: any) => r.path.endsWith('/rating'))).toBe(true);
  const count = calls.length;
  const tabs = page.getByRole('tab'); expect(await tabs.count()).toBeGreaterThanOrEqual(5);
  for (const tab of await tabs.all()) {
    await tab.click(); await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.reading-table-pane.active')).toHaveCount(1);
  }
  expect((await apiLog(request)).length).toBe(count);
  expect(rpc).toEqual([]);
  await page.screenshot({ path: 'artifacts/profile-verified.png', fullPage: true });
});

test('rate, season, comparison and zoom remain interactive', async ({ page }) => {
  await page.goto(aaron, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Rate', exact: true }).click();
  await page.getByRole('option', { name: 'Per 36', exact: true }).click();
  await expect(page).toHaveURL(/rate=per_36/);
  await page.getByRole('button', { name: 'Season', exact: true }).click();
  const seasons = page.getByRole('listbox', { name: 'Season' }).getByRole('option');
  if (await seasons.count() > 1) {
    const year = (await seasons.nth(1).innerText()).trim(); await seasons.nth(1).click();
    await expect(page).toHaveURL(new RegExp(`season=${year}`));
  } else await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await page.getByPlaceholder('Compare with another player…').fill('Jokic');
  await page.locator('.search-suggestion-item').first().click();
  await expect(page).toHaveURL(/vs=\d+/);
  await expect(page.getByRole('button', { name: 'Compare', exact: true })).toContainText('Jok');
  const face = page.locator('.reading-table-pane.active .pane-face');
  await face.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('cold recent navigation shows incoming identity while slow products are pending', async ({ page, request }) => {
  await page.goto(nuggets, { waitUntil: 'networkidle' });
  await page.goto(aaron, { waitUntil: 'networkidle' });
  await request.post('http://127.0.0.1:18001/__test', { data: { match: '/team/8/momentum', delay: 1800 } });
  await page.getByRole('button', { name: 'Expand menu', exact: true }).click();
  const shell = await page.locator('.profile-main').elementHandle();
  await page.getByRole('link', { name: 'Open Denver Nuggets', exact: true }).evaluate((a: HTMLAnchorElement) => a.click());
  await expect(page).toHaveTitle('Denver Nuggets - Scoracle', { timeout: 1200 });
  await expect(page.locator('.reading-table [aria-label="Reading loading"]')).toBeVisible({ timeout: 1200 });
  await expect(page.getByRole('tab', { name: 'Profile', exact: true })).toBeVisible();
  expect(await shell!.evaluate(node => node.isConnected)).toBe(true);
  const calls = await apiLog(request);
  expect(calls.some((r: any) => r.path.includes('/team/8/rating'))).toBe(true);
});

test('backend deadline yields a card error while sibling cards survive', async ({ page, request }) => {
  expectedError = 'rating timed out after 2500ms';
  await request.post('http://127.0.0.1:18001/__test', { data: { match: '/177/rating', delay: 4000 } });
  const response = await page.goto(aaron);
  expect(response?.status()).toBe(503);
  await page.getByRole('tab', { name: 'Scouting', exact: true }).click();
  await expect(page.locator('.reading-table-pane.active')).toContainText('timed out after 2500ms');
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await expect(page.locator('.reading-table-pane.active .profile-chart-card')).toBeVisible();
  await request.post('http://127.0.0.1:18001/__test', { data: {} });
  await page.getByRole('tab', { name: 'Scouting', exact: true }).click();
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.reading-table-pane.active .card-error')).toHaveCount(0);
  await expect(page.locator('.reading-table-pane.active .scouting-card')).toBeVisible();
});

test('week archive reads archive without eagerly fetching unrelated live products', async ({ page, request }) => {
  await page.goto(aaron + '?week=2025-47', { waitUntil: 'networkidle' });
  const paths = (await apiLog(request)).map((r: any) => r.path);
  expect(paths.some((p: string) => p.includes('/headlines?year=2025&week=47'))).toBe(true);
  expect(paths.some((p: string) => /\/(news|transfers|vibe|momentum|rating)(\?|$)/.test(p))).toBe(false);
});

test('NFL, football, teams and malformed routes serve real SSR pages', async ({ request }) => {
  for (const [path, title] of [[nuggets, 'Denver Nuggets'], ['/profile/nfl/player/34-patrick-mahomes', 'Patrick Mahomes'], ['/profile/football/player/154421-erling-haaland', 'Erling Haaland']]) {
    const response = await request.get(path); expect(response.status()).toBe(200);
    const html = await response.text(); expect(html.match(/<title[^>]*>(.*?)<\/title>/)?.[1]).toBe(`${title} - Scoracle`);
    expect(html).not.toContain('Local profile error');
  }
  expect((await request.get('/profile/nope/player/abc')).status()).toBe(404);
});

test('hover preloads scoped products with the same keys used by navigation', async ({ page, request }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  // Exercise a real router link with a scoped deep-link target.
  const link = page.getByRole('link', { name: 'Home', exact: true });
  await link.evaluate((a: HTMLAnchorElement) => { a.href = '/profile/nba/player/177-aaron-gordon?season=2024&newsScope=last_week'; });
  await request.post('http://127.0.0.1:18001/__test', { data: {} });
  await link.hover();
  await expect.poll(async () => (await apiLog(request)).length).toBeGreaterThanOrEqual(9);
  await page.waitForLoadState('networkidle');
  const before = await apiLog(request);
  const paths = before.map((r: any) => r.path);
  expect(paths).toContain('/api/v1/nba/player/177/rating?season=2024');
  expect(paths).toContain('/api/v1/nba/player/177/stats?season=2024');
  expect(paths).toContain('/api/v1/nba/player/177/news?scope=last_week');
  expect(paths).not.toContain('/api/v1/nba/player/177/stats');
  await link.click(); await expect(page).toHaveTitle('Aaron Gordon - Scoracle');
  await page.waitForLoadState('networkidle');
  expect((await apiLog(request)).length).toBe(before.length);
});

test('late results from an abandoned entity do not replace the current profile', async ({ page, request }) => {
  await page.goto(nuggets, { waitUntil: 'networkidle' });
  await page.goto(aaron, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Expand menu', exact: true }).click();
  await request.post('http://127.0.0.1:18001/__test', { data: { match: '/team/8/momentum', delay: 1800 } });
  await page.getByRole('link', { name: 'Open Denver Nuggets', exact: true }).evaluate((a: HTMLAnchorElement) => a.click());
  await expect(page.locator('.reading-table [aria-label="Reading loading"]')).toBeVisible({ timeout: 1200 });
  await page.getByRole('link', { name: 'Open Aaron Gordon', exact: true }).evaluate((a: HTMLAnchorElement) => a.click());
  await expect(page).toHaveTitle('Aaron Gordon - Scoracle');
  await page.waitForLoadState('networkidle');
  await expect.poll(async () => (await apiLog(request)).filter((r: any) => r.path.includes('/team/8/momentum')).every((r: any) => r.end)).toBe(true);
  await expect(page).toHaveTitle('Aaron Gordon - Scoracle');
  await expect(page).toHaveURL(/177-aaron-gordon/);
  await expect(page.getByRole('tab', { name: 'Profile', exact: true })).toBeVisible();
});


test('mobile deck supports tab navigation and keeps the active card within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(aaron, { waitUntil: 'networkidle' });
  const tab = page.getByRole('tab', { name: 'Sigil', exact: true });
  await tab.click(); await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => page.locator('.reading-table-pane.active .pane-face').evaluate(el => {
    const rect = el.getBoundingClientRect(); return rect.left >= -1 && rect.right <= innerWidth + 1;
  })).toBe(true);
  await page.screenshot({ path: 'artifacts/profile-mobile.png', fullPage: true });
});

test('a failed shared score product stays isolated and retries through its card boundary', async ({ page, request }) => {
  expectedError = 'vibe 503';
  // Warm the proxy so fast sibling reads exercise batched SSR fragments even
  // when this regression runs alone, independently of test order.
  expect((await request.get(aaron)).status()).toBe(200);
  await request.post('http://127.0.0.1:18001/__test', { data: { match: '/177/vibe', status: 503 } });
  const response = await page.goto(aaron); expect(response?.status()).toBe(503);
  await page.getByRole('tab', { name: 'Vibe', exact: true }).click();
  await expect(page.locator('.reading-table-pane.active .card-error')).toContainText('vibe 503');
  await expect(page.locator('.meta-widget')).toContainText('Aaron Gordon');
  await expect(page.locator('.pw-ring-slot[data-deck="scouting"]')).toBeVisible();
  // Geometry follows only the rendered scores, without an aggregate async read.
  expect(await page.locator('.pw-ring').evaluate(ring => {
    const bounds = ring.getBoundingClientRect();
    const slots = Array.from(ring.querySelectorAll('.pw-ring-slot'));
    return slots.every((slot, index) => {
      const rect = slot.getBoundingClientRect(); const angle = -Math.PI / 2 + index * 2 * Math.PI / slots.length;
      return Math.abs((rect.x + rect.width / 2 - bounds.x) / bounds.width - (0.5 + 0.35 * Math.cos(angle))) < 0.01 &&
        Math.abs((rect.y + rect.height / 2 - bounds.y) / bounds.height - (0.5 + 0.35 * Math.sin(angle))) < 0.01;
    });
  })).toBe(true);
  await request.post('http://127.0.0.1:18001/__test', { data: {} });
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.reading-table-pane.active .card-error')).toHaveCount(0);
  await expect(page.locator('.reading-table-pane.active .vibe-feed-card')).toBeVisible();
  await expect(page.locator('.pw-ring-slot[data-deck="vibe"]')).toBeVisible();
});


test('a stats outage retains identity and sibling cards, then restores controls on retry', async ({ page, request }) => {
  expectedError = 'stats 503';
  await request.get(aaron);
  await request.post('http://127.0.0.1:18001/__test', { data: { match: '/177/stats', status: 503 } });
  const response = await page.goto(aaron); expect(response?.status()).toBe(503);
  await expect(page.locator('.meta-widget')).toContainText('Aaron Gordon');
  await expect(page.locator('.pw-meta-head')).toHaveAttribute('aria-label', 'Rating not yet read');
  await expect(page.locator('.reading-table-pane.active .card-error')).toContainText('stats 503');
  await expect(page.locator('.pw-ring-slot[data-deck="vibe"]')).toBeVisible();
  await request.post('http://127.0.0.1:18001/__test', { data: {} });
  await page.locator('.reading-table-pane.active').getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.reading-table-pane.active .card-error')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Rate', exact: true })).toBeVisible();
  await expect(page.locator('.pw-meta-head')).toHaveAttribute('aria-label', /^Rating \d/);
});
