import { expect, test } from '@playwright/test';

test.use({ launchOptions: {
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  args: ['--disable-features=BackForwardCache'],
} });
test('BFCache-disabled player/team history and About anchors retain preferences', async ({ page }) => {
  test.fail(true, 'Pause G remains open: native Back without BFCache loses the team-link focus; compare legacy before changing navigation.');
  // Navigation must remain usable even with every character absent.
  await page.route('**/api/*', route => route.fulfill({ json: null }));
  await page.goto('/about#privacy', { waitUntil: 'domcontentloaded' });
  await expect.poll(() => page.locator('#privacy').evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThan(100);
  await page.evaluate(() => {
    localStorage.setItem('scoracle-theme', 'dark');
    localStorage.setItem('scoracle.trayExpanded', 'true');
  });
  await page.goto('/profile/nba/player/177-aaron-gordon', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveClass(/dark/);
  const team = page.locator('.pw-subtitle-link');
  await expect(team).toHaveText('Denver Nuggets');
  await team.click();
  await expect(page).toHaveTitle('Denver Nuggets - Scoracle');
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle('Aaron Gordon - Scoracle');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect.soft(page.locator('.pw-subtitle-link')).toBeFocused();
  await page.goForward({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle('Denver Nuggets - Scoracle');
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/about#privacy$/);
  await expect.poll(() => page.locator('#privacy').evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThan(100);
  expect(await page.evaluate(() => localStorage.getItem('scoracle.trayExpanded'))).toBe('true');
});
