import { defineConfig } from "vite";
import { solidStart } from "@solidjs/start/config";

export default defineConfig({
  plugins: [solidStart({ ssr: true })],
  resolve: {
    alias: {
      "@": "/src",
      "@components": "/src/components",
      "@layouts": "/src/layouts",
      "@lib": "/src/lib",
      "@pages": "/src/routes",
    },
  },
});
