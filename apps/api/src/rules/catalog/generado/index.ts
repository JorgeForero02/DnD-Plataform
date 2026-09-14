// Tarea 3A.1 (T2) — el cargador del catálogo GENERADO. `spells-srd.json` no es TS (E-3A1-6:
// `tsconfig.base.json` es `commonjs` sin `resolveJsonModule`), así que aquí se lee con
// `readFileSync` + `JSON.parse` + `spellsCatalogSchema.parse` **una sola vez, al importar el
// módulo**. Un JSON inválido revienta al arrancar el proceso, a propósito: es la misma barrera
// que ya usa `GameEvent.payload`, y falla en el arranque en vez de a mitad de una petición.
//
// **`__dirname` y no una ruta relativa a `src`.** Compilado, este fichero vive en
// `dist/src/rules/catalog/generado/index.js` (rootDir "." en `tsconfig.json`, no el `src/` que
// usaría Nest CLI por defecto — ver `apps/api/Dockerfile`, que llama a
// `node apps/api/dist/src/main.js`). `nest-cli.json` copia `spells-srd.json` al lado de este
// fichero en cada build (`compilerOptions.assets`), así que `__dirname` apunta al sitio
// correcto tanto en `src/` (con `ts-node`/Jest) como en `dist/src/` (compilado) — nunca hace
// falta un `../../../..` que se rompería si alguien mueve el directorio.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spellsCatalogSchema, type SrdSpell } from "@dnd/shared";

const RUTA_SPELLS_JSON = join(__dirname, "spells-srd.json");

function cargarSpells(): SrdSpell[] {
  const crudo = readFileSync(RUTA_SPELLS_JSON, "utf8");
  return spellsCatalogSchema.parse(JSON.parse(crudo));
}

/** Los 319 conjuros del SRD 5.1 convertidos, validados una vez al cargar el módulo. */
export const SRD_SPELLS: readonly SrdSpell[] = cargarSpells();

/** El mismo catálogo, indexado por `key` (el identificador de Foundry, p. ej. `"fireball"`). */
export const SRD_SPELL_POR_KEY: ReadonlyMap<string, SrdSpell> = new Map(
  SRD_SPELLS.map((s) => [s.key, s]),
);
