import { defineConfig } from "vite";
import { solidStart } from "@solidjs/start/config";

export default defineConfig({
  envPrefix: "PUBLIC_",
  plugins: [
    solidStart({
      ssr: true,
      middleware: "src/middleware.ts",
    }),
  ],
  define: {
    __DATA_VERSION__: JSON.stringify(Date.now().toString()),
  },
  resolve: {
    alias: {
      "@lib": "/src/lib",
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
