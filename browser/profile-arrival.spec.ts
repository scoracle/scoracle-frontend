import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const probe = readFileSync(new URL('../tests/runtime/profile-arrival.js', import.meta.url), 'utf8');
const products = {
  stats: { available_seasons: [2025], events: [], rating: {
    season: 2025, rating: 5, rating_rank: 90, rating_score: 68,
    rating_breakdown: ['Scoring', 'Rebounding', 'Passing'].map(label => ({ label, z: 1, pct: 90, in_comp: true, in_spec: true, sign: 1, facet: 'all', value: 30 })),
  } },
  report: null, news: { card_score: 30, narratives: [] }, transfers: null,
  vibe: { current: { heat: 0, headline: 'Fixed zero reading', body: 'A deterministic arrival fixture.', generated_at: '2026-11-13T12:00:00Z' }, snapshots: [] },
  momentum: null, summary: { summary: { card_score: 47, card_score_source: 'estimated' }, scores: null },
  sigil: { current: { heat: 70, body: 'A deterministic final reading.' }, history: [] },
};

for (const colorScheme of ['light', 'dark'] as const) {
  test(`Astro supplies the ${colorScheme} loading graphic before any island JavaScript`, async ({ page }) => {
    await page.route('**/_astro/*.js', route => route.abort());
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme });
    const response = await page.goto('/profile/nba/player/177-aaron-gordon', { waitUntil: 'domcontentloaded' });
    expect(await response!.text()).toContain('<astro-slot name="loading">');
    await expect(page.getByRole('article', { name: 'Reading loading' })).toBeVisible();
    await expect(page.locator('.deck-back-loading-art svg')).toBeVisible();
    expect(await page.locator('.deck-back-loading-art').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    expect(await page.locator('.deck-back-loading-art svg').evaluate(el => {
      const expected = document.createElement('span');
      expected.style.color = 'var(--card-ink)'; el.parentElement!.append(expected);
      const matches = getComputedStyle(el).stroke === getComputedStyle(expected).color;
      expected.remove(); return matches;
    })).toBe(true);
    await expect(page.locator('astro-island[ssr]')).toHaveCount(1);
  });
}

for (const requested of ['profile', 'sigil']) {
  test(`readable cards do not wait for a slow sibling; preserve ${requested} selection`, async ({ page }) => {
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const calls: string[] = [];
    await page.route('**/api/*?*', async route => {
      const key = new URL(route.request().url()).pathname.slice(5) as keyof typeof products;
      calls.push(key);
      if (key === 'sigil') await pending;
      await route.fulfill({ json: products[key] });
    });
    await page.goto(`/profile/nba/player/177-aaron-gordon?tab=${requested}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('tab', { name: 'Profile', exact: true })).toBeVisible();
    expect(calls.sort()).toEqual(Object.keys(products).sort());
    await expect(page.locator('.pw-ring-slot')).toHaveCount(0);
    if (requested === 'sigil') {
      await expect(page.getByRole('tab', { name: 'Sigil', exact: true })).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.reading-table-pane.active .deck-back-loading')).toBeVisible();
      await page.getByRole('tab', { name: 'Profile', exact: true }).click();
    }
    const chart = page.locator('.reading-table-pane.active .pizza-chart-svg');
    await expect(chart).toBeVisible();
    await chart.evaluate(el => (window as any).__earlyChart = el);
    release();
    await expect(page.locator('.pw-ring-slot')).toHaveCount(5);
    await expect(chart).toBeVisible();
    expect(await chart.evaluate(el => el === (window as any).__earlyChart)).toBe(true);
    expect(calls).toHaveLength(8);
    await expect(page.getByRole('tab', { name: 'Profile', exact: true })).toHaveAttribute('aria-selected', 'true');
  });
}

for (const width of [1440, 390]) {
  test(`eager reads reveal the complete score ring with settled geometry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript({ content: `${probe}\nobserveProfileArrival(${JSON.stringify(products)});` });
    await page.goto('/profile/nba/player/177-aaron-gordon', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.pw-ring-slot')).toHaveCount(5);
    await expect(page.locator('.pw-ring-slot[data-deck=vibe] .pw-ring-value')).toHaveText('0');
    await expect(page.locator('.pw-ring-slot[data-deck=momentum] .pw-ring-value')).toHaveText('47');
    await expect(page.locator('[role=alert]')).toHaveCount(0);
    await expect(page.locator('.reading-table-pane.active .pizza-chart-svg')).toBeVisible();
    const result = await page.evaluate(() => (window as any).__profileArrival);
    expect(result.requests.map((r: { key: string }) => r.key).sort()).toEqual(Object.keys(products).sort());
    expect(result.rings.map((ring: { decks: string }) => ring.decks)).toEqual(['scouting,narratives,vibe,momentum,sigil']);
    expect(result.marks.productDOM).toBeGreaterThan(0);
    expect(result.marks.deckDOM).toBeGreaterThan(0);
    // Keep the approved top-first, evenly spaced ring; do not hide arrival shifts.
    const geometry = await page.locator('.pw-ring').evaluate(ring => {
      const parent = ring.getBoundingClientRect();
      return [...ring.querySelectorAll('.pw-ring-slot')].map(slot => {
        const rect = slot.getBoundingClientRect();
        return { x: (rect.x + rect.width / 2 - parent.x) / parent.width,
          y: (rect.y + rect.height / 2 - parent.y) / parent.height };
      });
    });
    for (const [index, point] of geometry.entries()) {
      const angle = -Math.PI / 2 + index * 2 * Math.PI / geometry.length;
      expect(point.x).toBeCloseTo(0.5 + 0.35 * Math.cos(angle), 2);
      expect(point.y).toBeCloseTo(0.5 + 0.35 * Math.sin(angle), 2);
    }
  });
}
