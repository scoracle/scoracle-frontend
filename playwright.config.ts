import { defineConfig } from '@playwright/test';
// Run against an explicitly started production preview; stop it with npm run preview:stop.
export default defineConfig({
  testDir: './browser', workers: 1, timeout: 30000,
  use: { baseURL: process.env.SCORACLE_TEST_ORIGIN ?? 'http://127.0.0.1:4322',
    headless: true, viewport: { width: 1440, height: 1000 },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
    screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});
