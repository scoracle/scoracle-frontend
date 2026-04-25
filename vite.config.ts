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
      "@": "/src",
      "@components": "/src/components",
      "@layouts": "/src/layouts",
      "@lib": "/src/lib",
      "@pages": "/src/routes",
    },
  },
});
