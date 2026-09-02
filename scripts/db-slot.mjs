#!/usr/bin/env node
// Crea (si hace falta) y migra la base de datos de un WORKTREE_SLOT — ver
// scripts/worktree-slot.mjs y docs/02-entorno.md ("Trabajar en paralelo"). Un solo comando
// en vez de una lista de pasos manuales: `CREATE DATABASE`, si no existe ya, seguido de
// `prisma migrate deploy` contra esa base.
//
// Slot 0 (o WORKTREE_SLOT sin definir) no crea nada: usa la base "dnd" de siempre, que ya
// existe desde `docker compose up -d`. Solo aplica las migraciones pendientes, igual que
// cualquier `prisma migrate deploy` normal.
//
// Deliberadamente sin el paquete `pg`: `prisma db execute` (ya una dependencia de
// apps/api) manda la sentencia CREATE DATABASE contra el servidor sin abrir una conexión
// propia, así que no hace falta añadir un cliente de Postgres solo para esto.
//
// Uso:
//   WORKTREE_SLOT=1 pnpm db:slot                     # bash / Git Bash
//   $env:WORKTREE_SLOT=1; pnpm db:slot               # PowerShell
//   pnpm db:slot                                     # equivalente a WORKTREE_SLOT=0: solo migra "dnd"

import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  getWorktreeSlot,
  apiPortForSlot,
  databaseNameForSlot,
  databaseUrlForSlot,
  readEnvValue,
} from "./worktree-slot.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const API_ENV_PATH = path.join(REPO_ROOT, "apps", "api", ".env");
const SCHEMA_PATH = path.join(REPO_ROOT, "apps", "api", "prisma", "schema.prisma");
// shell:true hace falta en Windows porque pnpm es un .cmd (invocarlo directo con stdin
// pipeado falla con EINVAL). Nunca se le pasa un valor de entorno por argv — solo literales
// de este script o nombres de flag — así que un shell no tiene nada propio que interpretar;
// cualquier valor variable (la URL, el nombre de base) viaja por `env` o por `--stdin`.
const PNPM = "pnpm";

let slot;
try {
  slot = getWorktreeSlot();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const dbName = databaseNameForSlot(slot);
const apiPort = apiPortForSlot(slot);
// La misma que usaría la API real: primero su propio apps/api/.env (el archivo que de
// verdad lee), luego el entorno del shell (lo que fija CI), y solo si ninguno existe el
// valor por defecto de .env.example — así el slot 1+ no se calcula sobre un valor inventado
// cuando el .env de este worktree apunta a otro sitio.
const BASE_DATABASE_URL =
  readEnvValue(API_ENV_PATH, "DATABASE_URL") ??
  process.env.DATABASE_URL ??
  "postgresql://dnd:dnd@localhost:5432/dnd";
const slotDatabaseUrl = databaseUrlForSlot(BASE_DATABASE_URL, slot);

if (slot === 0) {
  console.log('Slot 0: usando la base "dnd" de siempre, solo se migra.');
} else {
  console.log(`Slot ${slot}: creando "${dbName}" si no existe...`);
}

// Corre `prisma db execute` con el SQL por stdin y el datasource resuelto desde el schema +
// DATABASE_URL en el entorno del proceso — nunca por argv, para que shell:true no pueda
// partir ni reinterpretar una URL con `&`, `|`, `%`, backticks o `$(...)` (posibles en una
// URL de Postgres con parámetros o una contraseña generada).
function runPrismaDbExecute(sql, databaseUrl) {
  const result = execFileSync(
    PNPM,
    ["--filter", "@dnd/api", "exec", "prisma", "db", "execute", "--schema", SCHEMA_PATH, "--stdin"],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      input: sql,
      stdio: ["pipe", "pipe", "pipe"],
      encoding: "utf8",
      shell: true,
    },
  );
  return result;
}

if (slot !== 0) {
  try {
    const output = runPrismaDbExecute(`CREATE DATABASE ${dbName};\n`, BASE_DATABASE_URL);
    if (output.trim()) console.log(output.trim());
  } catch (error) {
    // Postgres: 42P04 "database already exists". Prisma lo envuelve con su propio código
    // (P1009) y a veces lo imprime por stdout en vez de stderr — se juntan los dos antes de
    // decidir si esto es un fallo real o el camino normal de "ya existía".
    const combined = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
    if (/42P04|already exists|P1009/i.test(combined)) {
      console.log(`"${dbName}" ya existía — nada que crear.`);
    } else {
      console.error(combined.trim() || error.message);
      process.exit(1);
    }
  }
}

console.log(`Migrando "${dbName}"...`);
try {
  execFileSync(PNPM, ["--filter", "@dnd/api", "exec", "prisma", "migrate", "deploy"], {
    cwd: REPO_ROOT,
    env: { ...process.env, DATABASE_URL: slotDatabaseUrl },
    stdio: "inherit",
    shell: true,
  });
} catch {
  console.error(
    `No se pudieron aplicar las migraciones a "${dbName}". Revisa que Postgres esté arriba ` +
      `(\`docker compose up -d\`) y que la URL sea correcta — arriba tienes la salida real de Prisma.`,
  );
  process.exit(1);
}
console.log(`Listo: "${dbName}" migrada.`);

if (slot !== 0) {
  console.log("");
  console.log(`Para levantar la API de este slot manualmente, en apps/api/.env de este worktree:`);
  console.log(`  PORT=${apiPort}`);
  console.log(`  DATABASE_URL=${slotDatabaseUrl}`);
  console.log(
    `(el e2e de API, \`pnpm --filter @dnd/api test:e2e\`, no es consciente de WORKTREE_SLOT — ` +
      `solo lee apps/api/.env — así que este es también el valor a pegar ahí para correrlo ` +
      `aislado de otro checkout.)`,
  );
}
