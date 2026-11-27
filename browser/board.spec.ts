import { expect, test } from '@playwright/test';

for (const width of [1440, 390]) {
  test(`board rail preserves warmed reads, reset semantics and history at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const calls: string[] = [];
    await page.route('**/api/board-options?*', route => route.fulfill({ json: { teams: [], positions: [] } }));
    await page.route('**/api/board?*', route => {
      calls.push(route.request().url());
      return route.fulfill({ json: { leaders: [{ id: 177, name: 'Fixed player', entity_type: 'player', rank: 1,
        image: null, team_logo: null, heat: 0, rating_score: 0, rating_rank: 0, headline: 'Fixed reading' }] } });
    });
    await page.goto('/leaderboard?sport=NBA&board=momentum&metric=rating&teamId=8&unrelated=keep');
    await expect(page.getByRole('tab', { name: 'Momentum', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.board-row')).toHaveCount(1);
    await expect.poll(() => calls.length).toBe(6);
    await page.evaluate(() => history.replaceState({ retained: true }, '', location.href));
    for (const name of ['Scouting', 'Narratives', 'Vibe', 'Momentum', 'Sigil']) {
      const tab = page.getByRole('tab', { name, exact: true });
      await tab.focus(); await page.keyboard.press('Enter');
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.board h1')).toHaveText(name);
      await expect(page.locator('.lb-name')).toHaveText('Fixed player');
      expect(await page.locator('.board-field').evaluate(el => getComputedStyle(el, '::before').maskImage))
        .toContain(`engraving-${name.toLowerCase()}-`);
      const state = await page.evaluate(() => ({ query: location.search, retained: history.state.retained }));
      expect(state.query).toContain('unrelated=keep');
      expect(state.query).not.toMatch(/teamId|metric/);
      expect(state.retained).toBe(true);
    }
    expect(calls).toHaveLength(6);
    await page.evaluate(() => {
      history.pushState({ retained: true }, '', '/leaderboard?sport=NFL&board=news&unrelated=keep');
      dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page).toHaveTitle('NFL Narratives Leaderboard · Scoracle');
    await expect(page.getByRole('tab', { name: 'Narratives', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://scoracle.com/leaderboard?sport=NFL&board=news');
    await expect(page.locator('.nav-well-rail')).toHaveClass(/is-measured/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
