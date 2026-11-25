import { expect, test } from '@playwright/test';
const aaron = '/profile/nba/player/177-aaron-gordon';

test('identity shell hydrates eight eager products once; tabs never refetch', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) calls.push(request.url()); });
  const response = await page.goto(aaron, { waitUntil: 'domcontentloaded' });
  const html = await response!.text();
  expect(html).toContain('Aaron Gordon'); expect(html).not.toContain('scouting-card');
  await expect(page.getByRole('tab', { name: 'Scouting', exact: true })).toBeVisible();
  expect(calls).toHaveLength(8); expect(new Set(calls).size).toBe(8);
  for (const tab of await page.getByRole('tab').all()) {
    await tab.click(); await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.reading-table-pane.active')).toHaveCount(1);
  }
  expect(calls).toHaveLength(8);
});

test('rate, comparison, season and zoom retain their controls', async ({ page }) => {
  // Controls need a rated fixture; public API throttling is covered by the failure tests.
  const breakdown = [{ label: 'Scoring', z: 1, pct: 90, in_comp: true, in_spec: true, sign: 1, facet: 'all', is_specialty: true, value: 30 }];
  await page.route('**/api/stats?*', route => route.fulfill({ json: {
    available_seasons: [2025, 2024], events: [],
    rating: {
      season: Number(new URL(route.request().url()).searchParams.get('season') ?? 2025),
      rating: 5, rating_rank: 90, rating_score: 68, rating_breakdown: breakdown,
      rating_modes: { per_36: { rating: 5, rating_rank: 90, rating_score: 68, breakdown } },
      rating_scoped_ranks: { position: 80 }, position: 'F', team: null,
    },
  } }));
  await page.goto(aaron, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /^Rate:/ }).click();
  await page.getByRole('option', { name: 'Per 36', exact: true }).click();
  await expect(page).toHaveURL(/rate=per_36/);
  await page.getByRole('button', { name: /^Season:/ }).click();
  const seasons = page.getByRole('listbox', { name: 'Season' }).getByRole('option');
  if (await seasons.count() > 1) {
    const year = (await seasons.nth(1).innerText()).trim(); await seasons.nth(1).click();
    await expect(page).toHaveURL(new RegExp(`season=${year}`));
  } else await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^Compare:/ }).click();
  await page.getByPlaceholder('Compare with another player…').fill('Jokic');
  const compare = page.getByRole('button', { name: /^Compare:/ });
  const dialog = page.getByRole('dialog', { name: 'Compare entities' });
  await expect(dialog).toHaveAttribute('id', (await compare.getAttribute('aria-controls'))!);
  await page.getByPlaceholder('Compare with another player…').press('ArrowDown');
  await page.getByPlaceholder('Compare with another player…').press('Enter');
  await expect(compare).toBeFocused();
  await expect(page).toHaveURL(/vs=\d+/);
  await expect(page.getByRole('button', { name: /^Compare:/ })).toContainText('Jok');
  const face = page.locator('.reading-table-pane.active .pane-face');
  await face.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const [product, tab] of [['report', 'Scouting'], ['vibe', 'Vibe'], ['stats', 'Scouting']]) {
  test(`${product} failure retains identity and siblings; retry stays local`, async ({ page }) => {
    let fail = true; let reads = 0;
    await page.route(`**/api/${product}?*`, route => { reads++; return fail
      ? route.fulfill({ status: 503, json: { error: 'Unavailable' } }) : route.continue(); });
    const response = await page.goto(aaron); expect(response?.status()).toBe(200);
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await expect(page.locator('.meta-widget')).toContainText('Aaron Gordon');
    await expect(page.locator('.reading-table-pane.active [role=alert]')).toBeVisible();
    expect(reads).toBe(1); fail = false;
    await page.getByRole('button', { name: `Retry ${tab}`, exact: true }).click();
    await expect(page.locator('.reading-table-pane.active [role=alert]')).toHaveCount(0);
    expect(reads).toBe(2);
  });
}

test('retired reporting fields normalize without archive requests', async ({ page }) => {
  const paths: string[] = [];
  page.on('request', r => { if (r.url().includes('/api/')) paths.push(r.url()); });
  await page.goto(aaron + '?week=2025-47&year=2025&newsScope=last_week&date=2025-11-20', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('tab', { name: 'Narratives', exact: true })).toBeVisible();
  await expect.poll(() => paths.length).toBe(8);
  expect(paths.some(p => /[?&](year|week|date)=/.test(p))).toBe(false);
  await expect(page).not.toHaveURL(/[?&](week|year|newsScope|date)=/);
});

test('mobile deck preserves the active face bounds', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(aaron, { waitUntil: 'domcontentloaded' });
  await page.getByRole('tab', { name: 'Sigil', exact: true }).click();
  await expect.poll(() => page.locator('.reading-table-pane.active .pane-face').evaluate(el => {
    const rect = el.getBoundingClientRect(); return rect.left >= -1 && rect.right <= innerWidth + 1;
  })).toBe(true);
});

for (const width of [1440, 390]) {
  test(`pending products reserve layout at ${width}px`, async ({ page }) => {
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/*?*', async route => {
      await pending;
      await route.fulfill({ status: 503, json: { error: 'Unavailable' } });
    });
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(aaron, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('article', { name: 'Reading loading' })).toBeVisible();
    const geometry = () => page.evaluate(() => {
      const rect = (selector: string) => {
        const { x, y, width, height } = document.querySelector(selector)!.getBoundingClientRect();
        return { x, y, width, height };
      };
      return { card: rect('.reading-table-deck .card'), footer: rect('.site-footer') };
    });
    const before = await geometry();
    release();
    await expect(page.getByRole('tab', { name: 'Scouting', exact: true })).toBeVisible();
    const after = await geometry();
    for (const part of ['card', 'footer'] as const) {
      for (const dimension of ['x', 'y', 'width', 'height'] as const) {
        expect(Math.abs(before[part][dimension] - after[part][dimension])).toBeLessThan(1);
      }
    }
  });
}


test('render-error retry reloads only the affected card and recovers', async ({ page }) => {
  const calls: string[] = [];
  let fixed = false;
  await page.route('**/api/*', route => {
    const key = new URL(route.request().url()).pathname;
    calls.push(key);
    return route.fulfill({ json: key === '/api/vibe' ? {
      current: { heat: 50, headline: 'Fixture', body: fixed ? 'Recovered reading' : 17, generated_at: '2026-11-14T00:00:00Z' }, snapshots: [],
    } : null });
  });
  await page.goto(aaron + '?tab=vibe');
  const retry = page.getByRole('button', { name: 'Retry Vibe', exact: true });
  await expect(retry).toBeVisible();
  expect(calls).toHaveLength(8);
  fixed = true;
  await retry.click();
  await expect(page.locator('.reading-table-pane.active')).toContainText('Recovered reading');
  expect(calls).toHaveLength(9);
  expect(calls.at(-1)).toBe('/api/vibe');
});
