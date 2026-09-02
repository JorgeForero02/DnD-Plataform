import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { apiPortForSlot, webPortForSlot } from "./worktree-slot";

// WORKTREE_SLOT sin definir (o 0) da los puertos de siempre: sin fijar nada, nada cambia.
// Ver worktree-slot.ts y docs/02-entorno.md.
const apiPort = apiPortForSlot();
const webPort = webPortForSlot();

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
    port: webPort,
    // Un slot ocupado debe fallar alto y claro, no deslizarse al siguiente puerto
    // libre: eso dejaría a Playwright (que calculó el mismo puerto por separado) esperando
    // en el puerto equivocado, sin nada ahí, hasta que el timeout lo delate como algo peor.
    strictPort: true,
    proxy: {
      "/api": {
        // Sigue al slot automáticamente: un proxy apuntando al puerto equivocado es el
        // fallo silencioso que WORKTREE_SLOT existe para evitar.
        target: `http://localhost:${apiPort}`,
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
