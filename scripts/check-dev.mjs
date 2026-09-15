import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
try {
  const page = await browser.newPage(); const diagnostics = []; const failedResources = [];
  page.on('console', message => { if (message.type() === 'warning') diagnostics.push(message.text()); });
  page.on('pageerror', error => diagnostics.push(error.message));
  page.on('requestfailed', request => failedResources.push({ url: request.url(), failure: request.failure() }));
  await page.goto('http://127.0.0.1:4315/profile/nba/player/177-aaron-gordon', { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Scouting', exact: true }).click();
  await page.waitForURL(/tab=scouting/);
  await writeFile('artifacts/development-check.json', JSON.stringify({ diagnostics, failedResources }, null, 2));
  assert.deepEqual(diagnostics, []);
  console.log('Development hydration and tab navigation: no warnings or uncaught errors.');
} finally { await browser.close(); }
