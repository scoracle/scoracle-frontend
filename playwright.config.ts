import { defineConfig } from '@playwright/test';

// The browser suite runs the real Cloudflare Worker entry, so it must boot
// workerd. `vite preview` — the old default branch — cannot serve a Workers app:
// the health check never sees a 2xx and every run times out before a test
// starts. The wrangler path is therefore the default; set SCORACLE_TEST_WORKERS=0
// to opt back into preview.
//
// `scripts/api-proxy.mjs` is a pass-through to a real API on 127.0.0.1:18000 — keep
// the archbox loopback tunnel open (see docs/ARCHITECTURE.md) or the proxy 502s,
// the Worker renders its designed 503 page, and the health check times out.
//
// SCORACLE_INTERNAL_KEY is a local test fixture, not a credential, so it is set in
// the environment rather than as a --var: wrangler.jsonc declares it under
// "secrets.required", and only an environment/.dev.vars entry satisfies that
// check. Passing it via --var left the Worker logging "Missing required secrets"
// on every run.
const WORKER_COMMAND =
  'SCORACLE_INTERNAL_KEY=local-verification-key npx wrangler dev --local --ip 127.0.0.1 --port 4314' +
  ' --inspector-port 9346 --var PUBLIC_GO_API_URL:http://127.0.0.1:18001/api/v1 --var SCORACLE_API_TIMEOUT_MS:2500';

export default defineConfig({ testDir: './browser', workers: 1, timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:4314', headless: true, viewport: { width: 1440, height: 1000 },
    extraHTTPHeaders: { Cookie: "scoracle-verification=1" },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined },
    screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: [
    { command: 'node scripts/api-proxy.mjs', url: 'http://127.0.0.1:18001/__test', reuseExistingServer: false },
    { command: process.env.SCORACLE_TEST_WORKERS === '0'
      ? 'SCORACLE_API_ORIGIN=http://127.0.0.1:18001 SCORACLE_API_TIMEOUT_MS=2500 npx vite preview --host 127.0.0.1 --port 4314 --strictPort'
      : WORKER_COMMAND,
      url: 'http://127.0.0.1:4314', reuseExistingServer: false }
  ]
});
