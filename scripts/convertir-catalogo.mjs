#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { convertir, escribir, comprobar } from "./convertir-catalogo/salida.mjs";
import { spellsCatalogSchema } from "../packages/shared/dist/index.js";

// Tarea 3A.1 (T1) — CLI del conversor. `pnpm catalogo:convertir` (env `FOUNDRY_SOURCE_DIR` y
// `SRD_ES_TXT`); `--out <dir>` cambia el destino (por defecto
// `apps/api/src/rules/catalog/generado/`); `--check` regenera en memoria y compara con lo
// commiteado, sin escribir nada.

const RAIZ = fileURLToPath(new URL(".", import.meta.url));

function leerArgumentos(argv) {
  const out = { check: false, outDir: join(RAIZ, "apps/api/src/rules/catalog/generado") };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--check") out.check = true;
    if (argv[i] === "--out") out.outDir = argv[++i];
  }
  return out;
}

function main() {
  const { check, outDir } = leerArgumentos(process.argv.slice(2));

  const foundryDir = process.env.FOUNDRY_SOURCE_DIR;
  const srdEsTxtRuta = process.env.SRD_ES_TXT;
  if (!foundryDir || !existsSync(foundryDir)) {
    console.error(`FOUNDRY_SOURCE_DIR no apunta a un directorio: "${foundryDir}"`);
    process.exit(1);
  }
  if (!srdEsTxtRuta || !existsSync(srdEsTxtRuta)) {
    console.error(`SRD_ES_TXT no apunta a un fichero: "${srdEsTxtRuta}"`);
    process.exit(1);
  }

  const emparejamientosRuta = join(RAIZ, "convertir-catalogo", "emparejamientos.json");
  const emparejamientos = JSON.parse(readFileSync(emparejamientosRuta, "utf8"));
  const srdEsTxt = readFileSync(srdEsTxtRuta, "utf8");

  let resultado;
  try {
    resultado = convertir({ foundryDir, srdEsTxt, emparejamientos });
  } catch (err) {
    console.error(`El conversor falló: ${err.message}`);
    process.exit(1);
  }

  const validacion = spellsCatalogSchema.safeParse(resultado.spells);
  const conjurosRechazadosPorEsquema = validacion.success
    ? []
    : validacion.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);

  console.log("Conteos:");
  for (const [k, v] of Object.entries(resultado.conteos)) console.log(`  ${k}: ${v}`);
  console.log(`  rechazados por el esquema Zod: ${conjurosRechazadosPorEsquema.length}`);

  if (check) {
    const cmp = comprobar(outDir, resultado);
    if (!cmp.ok) {
      console.error(`--check falló: ${cmp.motivo}`);
      process.exit(1);
    }
    console.log("--check: el catálogo commiteado coincide con lo regenerado en memoria.");
    return;
  }

  escribir(outDir, resultado);
  console.log(`Catálogo escrito en ${outDir}`);

  const huboRechazoNoDeclarado = resultado.rechazos.fueraDeA.some((r) =>
    r.includes("Tipo de actividad sin implementar"),
  );
  if (huboRechazoNoDeclarado) {
    console.error("Hubo al menos un rechazo NO declarado (tipo de actividad sin implementar).");
    process.exit(1);
  }
}

main();
