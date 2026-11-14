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
  momentum: null, summary: { scores: { momentum_score: 20 } },
  sigil: { current: { heat: 70, body: 'A deterministic final reading.' }, history: [] },
};

for (const width of [1440, 390]) {
  test(`arrival probe observes independent scores and settled geometry at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript({ content: `${probe}\nobserveProfileArrival(${JSON.stringify(products)});` });
    await page.goto('/profile/nba/player/177-aaron-gordon', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.pw-ring-slot')).toHaveCount(5);
    await expect(page.locator('.pw-ring-slot[data-deck=vibe] .pw-ring-value')).toHaveText('0');
    await expect(page.locator('[role=alert]')).toHaveCount(0);
    await expect(page.locator('.reading-table-pane.active .pizza-chart-svg')).toBeVisible();
    const result = await page.evaluate(() => (window as any).__profileArrival);
    expect(result.requests.map((r: { key: string }) => r.key).sort()).toEqual(Object.keys(products).sort());
    expect(result.rings.at(-1).decks).toBe('scouting,narratives,vibe,momentum,sigil');
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
