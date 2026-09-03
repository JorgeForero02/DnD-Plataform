import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import {
  apiPortForSlot,
  databaseUrlForSlot,
  getWorktreeSlot,
  readEnvValue,
  webPortForSlot,
} from "./worktree-slot";

// Los e2e de navegador NO entran en `pnpm verify` ni en el gancho de pre-commit:
// necesitan Docker con Postgres y dos servidores vivos. Ver docs/08-pruebas.md.
//
// WORKTREE_SLOT (variable de ENTORNO DE SHELL, nunca de un .env — ver
// scripts/worktree-slot.mjs) permite correr esta suite a la vez en varios checkouts del
// repo, cada uno con sus propios puertos y su propia base de datos. Sin definirla (slot 0)
// esto es exactamente lo de siempre: 3000/5173 y la base "dnd" — ver el `env` de abajo, que
// en slot 0 no inyecta nada nuevo.
const SLOT = getWorktreeSlot();
const API_PORT = apiPortForSlot(SLOT);
const WEB_PORT = webPortForSlot(SLOT);
const WEB = `http://localhost:${WEB_PORT}`;
const REPO_ROOT = "../..";
// __dirname, no import.meta.url: Playwright compila este config a CommonJS antes de
// cargarlo (ver requireOrImport en su propio runner), donde import.meta no existe.
const HERE = __dirname;
// La base de la que se deriva la base de datos del slot es la que la API REALMENTE usaría:
// su propio apps/api/.env primero (el único archivo que lee — ConfigModule resuelve rutas
// relativas al cwd del proceso, que es apps/api/), luego el entorno del shell (lo que fija
// el job e2e-browser de CI), y solo si ninguno existe, el valor por defecto de
// .env.example. Ignorar apps/api/.env aquí sería derivar el slot sobre un valor inventado.
const BASE_DATABASE_URL =
  readEnvValue(path.join(HERE, "..", "api", ".env"), "DATABASE_URL") ??
  process.env.DATABASE_URL ??
  "postgresql://dnd:dnd@localhost:5432/dnd";
const SLOT_DATABASE_URL = databaseUrlForSlot(BASE_DATABASE_URL, SLOT);

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
      port: API_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        // Casi todos los specs registran e inician sesión con un usuario nuevo, y todos
        // comparten 127.0.0.1: un solo cubo del limitador por IP. AUTH_RATE_LIMIT_DEFAULT
        // (5/min, apps/api/src/common/rate-limit.constants.ts) protege producción de fuerza
        // bruta y no se toca; esta variable, fijada solo aquí y en el job e2e-browser de CI
        // (.github/workflows/ci.yml), es la única forma permitida de darle margen a esta suite.
        // Nunca se sube en producción — ver .env.example.
        AUTH_RATE_LIMIT: "1000",
        // Y el límite **global**, por lo mismo: la suite entera dispara cientos de peticiones
        // legítimas desde 127.0.0.1 en un minuto, y con el tope de producción (100) la API
        // empezaba a devolver 429 a mitad de recorrido. El fallo cambiaba de sitio en cada
        // vuelta —un personaje que no aparecía, un campo que no guardaba—, que es la firma de
        // un límite compartido y no la de un defecto.
        RATE_LIMIT: "5000",
        // En slot 0 no se inyecta PORT ni DATABASE_URL: el proceso hereda exactamente lo que
        // ya tenía — su propio apps/api/.env, tal cual. Inyectar aquí el valor por defecto
        // (3000 / "dnd") "porque coincide hoy" fue el bug de la ronda anterior: si el .env de
        // este worktree apuntara a otra base, esto la habría pisado en silencio. Solo el
        // slot 1+ necesita valores explícitos, porque ahí sí difieren de lo que hay en el
        // .env.
        ...(SLOT === 0 ? {} : { PORT: String(API_PORT), DATABASE_URL: SLOT_DATABASE_URL }),
      },
    },
    {
      // Vite hace de proxy de /api hacia la API de este mismo slot, igual que nginx en
      // producción. WORKTREE_SLOT viaja al proceso hijo para que vite.config.ts calcule
      // el mismo puerto y el mismo destino de proxy — ver worktree-slot.ts. En slot 0 esto
      // reenvía "0", que worktree-slot.ts trata igual que no definirla — no cambia nada.
      command: "pnpm --filter @dnd/web dev",
      cwd: REPO_ROOT,
      url: WEB,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { WORKTREE_SLOT: String(SLOT) },
    },
  ],
});
