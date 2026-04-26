import { defineConfig } from "vitest/config";

/**
 * Vitest config — separate from vite.config.ts so the SolidStart plugin
 * doesn't load during tests. Pure data-utility tests don't need Solid
 * runtime; happy-dom provides `window.location` for the URL helper.
 */
export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
  },
});
