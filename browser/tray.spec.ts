import { expect, test } from '@playwright/test';

test('native tray restores recents safely, marks identity and overlays the page', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('scoracle.trayExpanded', '1');
    localStorage.setItem('scoracle.recentEntities', JSON.stringify([
      { sport: 'nba', type: 'team', id: '177', name: 'Same ID team' },
      { sport: 'football', type: 'player', id: '177', name: '<img src=x onerror=alert(1)>', image: 'data:image/png,broken' },
      { sport: 'nba', type: 'player', id: 'bad', name: 'Invalid' },
    ]));
  });
  await page.route('**/api/*', route => route.fulfill({ json: null }));
  await page.goto('/profile/nba/player/177-aaron-gordon?tab=sigil');
  const tray = page.locator('.app-tray');
  await expect(tray).toHaveClass(/app-tray-expanded/);
  await expect(tray.locator('.app-tray-recent')).toHaveCount(3);
  await expect(tray.locator('.app-tray-recent[aria-current=page]')).toHaveAttribute('href', '/profile/nba/player/177-aaron-gordon');
  await expect(tray.locator('.app-tray-recent[aria-current=page] .app-tray-marker')).toHaveCount(1);
  await expect(tray.locator('.app-tray-recent').last()).toContainText('<img src=x onerror=alert(1)>');
  await expect(tray.locator('.app-tray-recent').last().locator('.app-tray-recent-img')).toHaveCount(0);
  await expect(tray.locator('[aria-label=Leaderboard]')).toHaveAttribute('href', '/leaderboard?sport=NBA');
  const before = await page.locator('main').boundingBox();
  await page.getByRole('button', { name: 'Collapse menu' }).click();
  await expect(tray.locator('.app-tray-recents')).toBeHidden();
  expect(await page.locator('main').boundingBox()).toEqual(before);
  expect(await page.evaluate(() => localStorage.getItem('scoracle.trayExpanded'))).toBe('0');
  await page.getByRole('button', { name: 'Expand menu' }).click();
  expect(await page.locator('main').boundingBox()).toEqual(before);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('scoracle.recentEntities')!)[0].id)).toBe('177');
});

test('About ships no Solid island and retains theme, dismissal and reconnect cleanup', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  const scripts: string[] = [];
  page.on('request', request => { if (request.resourceType() === 'script') scripts.push(request.url()); });
  await page.goto('/about');
  await expect(page.locator('astro-island')).toHaveCount(0);
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('.app-tray a[href="/"]')).toHaveCount(1);
  await expect(page.locator('.app-tray [aria-current=page]')).toHaveCount(0);
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  await settings.click();
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect(page.getByRole('button', { name: 'Light', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'System', exact: true }).click();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.keyboard.press('Escape');
  await expect(settings).toBeFocused();
  await expect(settings).toHaveAttribute('aria-expanded', 'false');
  await settings.click();
  await page.evaluate(() => {
    const tray = document.querySelector('scoracle-tray')!;
    const parent = tray.parentElement!;
    tray.remove();
    parent.prepend(tray);
  });
  await expect(page.locator('.app-tray-settings-menu')).toHaveCount(0);
  await settings.click();
  await expect(page.locator('.app-tray-settings-menu')).toHaveCount(1);
  await page.locator('.app-tray').getByRole('link', { name: 'Privacy', exact: true }).click();
  await expect(page).toHaveURL(/\/about#privacy$/);
  await expect(page.locator('.app-tray-settings-menu')).toHaveCount(0);
  expect(scripts.some(url => /\/web\.|\/client\./.test(url))).toBe(false);
});

test('tray tolerates blocked storage and follows the board sport', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('Blocked'); } });
  });
  await page.goto('/leaderboard?sport=NBA');
  const board = page.locator('.app-tray [aria-label=Leaderboard]');
  await expect(board).toHaveAttribute('aria-current', 'page');
  await expect(board.locator('.app-tray-marker')).toHaveCount(1);
  await page.getByRole('button', { name: 'Sport: NBA', exact: true }).click();
  await page.getByRole('option', { name: 'NFL', exact: true }).click();
  await expect(board).toHaveAttribute('href', '/leaderboard?sport=NFL');
  await page.getByRole('button', { name: 'Expand menu' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test('mobile tray hides desktop extras even with stored expansion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('scoracle.trayExpanded', '1'));
  await page.goto('/');
  await expect(page.locator('.app-tray-brand')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: 'Collapse menu' })).toBeHidden();
  await expect(page.locator('.app-tray-label').first()).toBeHidden();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const bounds = await page.locator('.app-tray-settings-menu').boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
});
