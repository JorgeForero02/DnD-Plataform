// Fuente única de la aritmética de slots — ver docs/02-entorno.md, sección "Trabajar en
// paralelo". Deriva puertos, nombre de base de datos y DATABASE_URL a partir de una sola
// variable de ENTORNO DE SHELL, WORKTREE_SLOT (nunca de un .env: ni apps/api/.env, que solo
// lee la API, ni la raíz .env.example — Vite y Playwright leen process.env directamente).
//
// Slot 0 (WORKTREE_SLOT sin definir, o "0") reproduce el comportamiento de siempre: puerto
// 3000/5173, base de datos "dnd" — quien no exporta la variable no ve ningún cambio.
//
// Un solo archivo, en JavaScript plano: lo importan directamente `scripts/db-slot.mjs` (con
// `node`, sin paso de compilación) y, vía el re-export de `apps/web/worktree-slot.ts`,
// `vite.config.ts` y `playwright.config.ts`. Antes existían dos copias de esta aritmética;
// una diferencia entre ellas hacía que `db:slot` migrara una base mientras Playwright
// apuntaba la API a otra — un fallo de test confuso, no un error visible.

import fs from "node:fs";

// Arriba de esto los puertos calculados (3000+N*100, 5173+N*100) empiezan a salirse del
// rango válido de puertos TCP (65535) mucho antes, pero 20 ya es más slots de los que este
// equipo va a correr a la vez; el límite existe para que un typo largo (o un "1e21", que
// pasaría Number.isInteger) no genere un puerto o un nombre de base sin sentido.
const MAX_SLOT = 20;

export function getWorktreeSlot() {
  const raw = process.env.WORKTREE_SLOT;
  if (raw === undefined || raw === "") return 0;
  // Solo dígitos, sin espacios/signo/punto/notación científica/hex: Number(" 5 "), Number(".0")
  // y Number("0x1f") aceptarían silenciosamente entradas que no son "un número de slot".
  if (!/^\d+$/.test(raw)) {
    throw new Error(`WORKTREE_SLOT debe ser solo dígitos (0-9), recibido: "${raw}"`);
  }
  const slot = Number(raw);
  if (slot > MAX_SLOT) {
    throw new Error(`WORKTREE_SLOT no puede pasar de ${MAX_SLOT}, recibido: "${raw}"`);
  }
  return slot;
}

// 3000, 3100, 3200, ... — misma aritmética que webPortForSlot, así los dos se leen juntos.
export function apiPortForSlot(slot = getWorktreeSlot()) {
  return 3000 + slot * 100;
}

// 5173, 5273, 5373, ...
export function webPortForSlot(slot = getWorktreeSlot()) {
  return 5173 + slot * 100;
}

// dnd, dnd_wt1, dnd_wt2, ... — slot 0 mantiene el nombre de siempre, sin sufijo.
export function databaseNameForSlot(slot = getWorktreeSlot()) {
  return slot === 0 ? "dnd" : `dnd_wt${slot}`;
}

// Sustituye el nombre de base al final de una DATABASE_URL por el de este slot, preservando
// usuario, contraseña, host, puerto y cualquier query string. new URL() en vez de cirugía de
// texto: una URL sin ruta de base (host solo) o con "/" dentro del query string rompía el
// `lastIndexOf("/")` anterior.
export function databaseUrlForSlot(baseUrl, slot = getWorktreeSlot()) {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseNameForSlot(slot)}`;
  return url.toString();
}

// Lee una clave de un archivo .env simple (KEY=value, comentarios con #, comillas simples u
// opcionales dobles) sin depender de `dotenv` — apps/web no lo tiene como dependencia y no
// hace falta añadirla solo para esto. undefined si el archivo no existe o la clave no está.
export function readEnvValue(filePath, key) {
  if (!fs.existsSync(filePath)) return undefined;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    if (k !== key) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    return value;
  }
  return undefined;
}
