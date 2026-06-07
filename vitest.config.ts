import { defineConfig } from "vitest/config";
import solid from "vite-plugin-solid";

/**
 * Vitest config — separate from vite.config.ts so the SolidStart plugin (server
 * functions etc.) doesn't load during tests. The bare `vite-plugin-solid` IS
 * loaded so component tests (`.test.tsx`) can render real Solid components via
 * @solidjs/testing-library; pure data-utility tests (`.test.ts`) are unaffected
 * (the plugin only transforms JSX). happy-dom provides the DOM.
 *
 * `resolve.conditions: ['development','browser']` selects Solid's dev/browser
 * build, which @solidjs/testing-library requires for reactive rendering.
 */
export default defineConfig({
  plugins: [solid()],
  resolve: { conditions: ["development", "browser"] },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
