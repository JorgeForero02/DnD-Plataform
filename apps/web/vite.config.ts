import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Point at the shared package's TS source: its CJS dist re-exports via
    // __exportStar, whose named exports rollup cannot statically resolve.
    alias: {
      "@dnd/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.ts",
    // e2e/ es de Playwright: mismo sufijo .spec.ts, otro runner.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
