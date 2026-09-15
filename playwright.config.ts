import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './browser', workers: 1, timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:4314', headless: true, viewport: { width: 1440, height: 1000 },
    extraHTTPHeaders: { Cookie: "scoracle-verification=1" },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
    screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: [
    { command: 'node scripts/api-proxy.mjs', url: 'http://127.0.0.1:18001/__test', reuseExistingServer: false },
    { command: process.env.SCORACLE_TEST_WORKERS === '1'
      ? 'npx wrangler dev --local --ip 127.0.0.1 --port 4314 --inspector-port 9346 --var PUBLIC_GO_API_URL:http://127.0.0.1:18001/api/v1 --var SCORACLE_API_TIMEOUT_MS:2500 --var SCORACLE_INTERNAL_KEY:local-verification-key'
      : 'SCORACLE_API_ORIGIN=http://127.0.0.1:18001 SCORACLE_API_TIMEOUT_MS=2500 npx vite preview --host 127.0.0.1 --port 4314 --strictPort', url: 'http://127.0.0.1:4314', reuseExistingServer: false }
  ]
});
