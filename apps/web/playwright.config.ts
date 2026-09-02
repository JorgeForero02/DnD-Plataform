import { defineConfig, devices } from "@playwright/test";

// Los e2e de navegador NO entran en `pnpm verify` ni en el gancho de pre-commit:
// necesitan Docker con Postgres y dos servidores vivos. Ver docs/08-pruebas.md.
const WEB = "http://localhost:5173";
const REPO_ROOT = "../..";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: WEB,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // La API se sirve compilada, que es como corre en produccion.
      command: "pnpm --filter @dnd/api build && pnpm --filter @dnd/api start:prod",
      cwd: REPO_ROOT,
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      // Casi todos los specs registran e inician sesión con un usuario nuevo, y todos
      // comparten 127.0.0.1: un solo cubo del limitador por IP. AUTH_RATE_LIMIT_DEFAULT
      // (5/min, apps/api/src/common/rate-limit.constants.ts) protege producción de fuerza
      // bruta y no se toca; esta variable, fijada solo aquí y en el job e2e-browser de CI
      // (.github/workflows/ci.yml), es la única forma permitida de darle margen a esta suite.
      // Nunca se sube en producción — ver .env.example.
      env: { AUTH_RATE_LIMIT: "1000" },
    },
    {
      // Vite hace de proxy de /api hacia :3000, igual que nginx en produccion.
      command: "pnpm --filter @dnd/web dev",
      cwd: REPO_ROOT,
      url: WEB,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
