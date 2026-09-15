import { expect, test } from '@playwright/test';
const diagnostics: string[] = [];
let expectedError: string | undefined;
test.beforeEach(async ({ page, request }) => {
  // Third-party ad delivery is outside the application regression contract.
  await page.route('https://**.googlesyndication.com/**', route => route.abort());
  diagnostics.length = 0; expectedError = undefined;
  page.on('pageerror', e => diagnostics.push(e.message));
  await request.post('http://127.0.0.1:18001/__test', { data: {} });
});
test.afterEach(() => expect(diagnostics.filter(e => e !== expectedError)).toEqual([]));
const log = async (request: any) => (await (await request.get('http://127.0.0.1:18001/__test')).json()).requests;

test('home search accepts input while its directory loads, then navigates in place', async ({ page }) => {
  await page.route('**/data/entities.json*', async route => {
    await new Promise(resolve => setTimeout(resolve, 1800)); await route.continue();
  });
  const response = await page.goto('/'); expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'SCORACLE', exact: true })).toBeVisible();
  const input = page.locator('.home-search input'); await input.fill('Gordon');
  await expect(input).toHaveValue('Gordon'); await expect(page.getByRole('status')).toHaveText('Searching…');
  await page.locator('.search-suggestion-item').filter({ hasText: 'Aaron Gordon' }).click();
  await expect(page).toHaveTitle('Aaron Gordon - Scoracle');
  await expect(page.getByRole('tab', { name: 'Profile', exact: true })).toBeVisible();
});

test('directory failures show a retry and recover without a reload', async ({ page }) => {
  expectedError = 'Failed to fetch /data/entities.json: 503';
  await page.route('**/data/entities.json*', route => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.goto('/'); await page.locator('.home-search input').fill('Jokic');
  await expect(page.getByRole('alert')).toContainText('Search unavailable');
  await page.unroute('**/data/entities.json*'); await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('.search-suggestion-item').first()).toContainText('Joki');
});

test('leaderboard tabs, scopes, and story detail use real SSR data', async ({ page, request }) => {
  const response = await page.goto('/leaderboard?sport=NBA', { waitUntil: 'networkidle' });
  expect(response?.status()).toBe(200); expect(await response!.text()).toContain('board-register');
  await expect(page.locator('.board-row').first()).toBeVisible();
  await page.getByRole('button', { name: 'Players or teams', exact: true }).click();
  await page.getByRole('option', { name: 'Teams', exact: true }).click();
  await expect(page).toHaveURL(/type=team/); await expect(page.locator('.board-row').first()).toBeVisible();
  for (const name of ['Narratives', 'Vibe', 'Momentum', 'Sigil', 'Stories']) {
    const tab = page.getByRole('tab', { name, exact: true }); await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('h1')).toHaveText(name);
    await page.waitForLoadState('networkidle');
  }
  const story = page.locator('.story-cell').first(); await expect(story).toBeVisible();
  const href = await story.getAttribute('href'); expect(href).toMatch(/^\/story\/nba\//);
  await story.click(); await expect(page.locator('.story-main h1')).not.toBeEmpty();
  await expect(page.locator('.story-main .story-section').first()).toBeVisible();
  const detail = await request.get(href!); expect(detail.status()).toBe(200);
  expect(await detail.text()).toContain('story-main');
  await page.screenshot({ path: 'artifacts/story-verified.png', fullPage: true });
});

test('leaderboard errors recover through native query revalidation', async ({ page, request }) => {
  expectedError = 'leaderboard 503';
  await request.post('http://127.0.0.1:18001/__test', { data: { match: '/nba/leaderboard', status: 503 } });
  const response = await page.goto('/leaderboard?sport=NBA'); expect(response?.status()).toBe(503);
  await expect(page.getByRole('alert')).toContainText('leaderboard 503');
  await request.post('http://127.0.0.1:18001/__test', { data: {} });
  await page.getByRole('button', { name: /try again/i }).click();
  await expect(page.locator('.board-row').first()).toBeVisible();
  expect((await log(request)).some((r: any) => r.path.includes('/nba/leaderboard'))).toBe(true);
});

test('profile directory, static pages, legacy redirects and missing stories render locally', async ({ request }) => {
  const directory = await request.get('/profile'); expect(directory.status()).toBe(200);
  const html = await directory.text(); expect(html).toContain('Browse profiles'); expect(html).toContain('profile-dir-row');
  // The full search directory must remain a browser asset rather than SSR data.
  expect(html.length).toBeLessThan(250000);
  for (const path of ['/about', '/contact', '/privacy', '/terms']) expect((await request.get(path)).status()).toBe(200);
  expect((await request.get('/missing-page')).status()).toBe(404);
  expect((await request.get('/story/nope/123')).status()).toBe(404);
  for (const [from, to] of [
    ['/stories?sport=nfl&status=resolved', '/leaderboard?board=stories&sport=NFL&status=resolved'],
    ['/profile?sport=nba&type=player&id=177&tab=vibe', '/profile/nba/player/177?tab=vibe'],
  ]) {
    const response = await request.get(from, { maxRedirects: 0 }); expect(response.status()).toBe(301);
    expect(response.headers().location).toBe(to);
  }
});

test('leaderboard intent preload uses the destination season, rate and team filter', async ({ page, request }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const link = page.getByRole('link', { name: 'Leaderboard', exact: true });
  await link.evaluate((a: HTMLAnchorElement) => { a.href = '/leaderboard?sport=NBA&season=2024&rate=per_36&teamId=8'; });
  await request.post('http://127.0.0.1:18001/__test', { data: {} });
  await link.hover();
  await expect.poll(async () => (await log(request)).filter((r: any) => r.path.includes('/nba/leaderboard')).length).toBe(1);
  await page.waitForLoadState('networkidle');
  const paths = (await log(request)).filter((r: any) => r.path.includes('/nba/leaderboard')).map((r: any) => r.path);
  const query = new URL(paths[0], 'http://local').searchParams;
  expect(query.get('season')).toBe('2024'); expect(query.get('rate')).toBe('per_36'); expect(query.get('team_id')).toBe('8');
  await link.click(); await expect(page).toHaveTitle('NBA Scouting Leaderboard · Scoracle');
  await page.waitForLoadState('networkidle');
  expect((await log(request)).filter((r: any) => r.path.includes('/nba/leaderboard')).map((r: any) => r.path)).toEqual(paths);
});

test('a failed story detail recovers without navigation or reload', async ({ page, request }) => {
  await page.goto('/leaderboard?sport=NBA&board=stories', { waitUntil: 'networkidle' });
  const href = await page.locator('.story-cell').first().getAttribute('href');
  expectedError = 'story 503';
  await request.post('http://127.0.0.1:18001/__test', { data: { match: '/nba/story/', status: 503 } });
  const response = await page.goto(href!); expect(response?.status()).toBe(503);
  await expect(page.getByRole('alert')).toContainText('story 503');
  await request.post('http://127.0.0.1:18001/__test', { data: {} });
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.story-main h1')).not.toBeEmpty();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a slow new route immediately replaces the departing page with its skeleton', async ({ page, request }) => {
  await page.goto('/profile/nba/player/177-aaron-gordon', { waitUntil: 'networkidle' });
  await request.post('http://127.0.0.1:18001/__test', { data: { match: '/nba/leaderboard', delay: 1800 } });
  // Click without hovering, so this proves cold navigation rather than a warm cache.
  await page.getByRole('link', { name: 'Leaderboard', exact: true }).evaluate((a: HTMLAnchorElement) => a.click());
  await expect(page).toHaveURL(/\/leaderboard/, { timeout: 800 });
  await expect(page.locator('.profile-deck')).toBeHidden({ timeout: 800 });
  await expect(page.getByRole('status').first()).toBeVisible({ timeout: 800 });
  expect((await log(request)).some((r: any) => r.path.includes('/nba/leaderboard') && !r.end)).toBe(true);
  await expect(page.locator('.lb-main h1')).toHaveText('Scouting');
  await expect(page.locator('.lb-name-cell').first()).toBeVisible();
});
