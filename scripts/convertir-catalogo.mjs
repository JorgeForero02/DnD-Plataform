#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { convertir, escribir, comprobar } from "./convertir-catalogo/salida.mjs";
import {
  spellsCatalogSchema,
  classFeaturesCatalogSchema,
  raceFeaturesCatalogSchema,
  classScalesCatalogSchema,
} from "../packages/shared/dist/index.js";

// Tarea 3A.1 (T1) — CLI del conversor. `pnpm catalogo:convertir` (env `FOUNDRY_SOURCE_DIR` y
// `SRD_ES_TXT`); `--out <dir>` cambia el destino (por defecto
// `apps/api/src/rules/catalog/generado/`); `--check` regenera en memoria y compara con lo
// commiteado, sin escribir nada.

// `RAIZ` es el directorio de ESTE fichero (`scripts/`); `RAIZ_REPO` es un nivel por encima. El
// `--out` por defecto necesita `RAIZ_REPO` (T2, 2026-09-14: usar `RAIZ` a secas escribía en
// `scripts/apps/api/...`, una carpeta nueva nunca leída por nadie, porque nunca se había
// ejecutado sin `--out` hasta esta tarea — todas las tareas anteriores lo pasaban siempre).
const RAIZ = fileURLToPath(new URL(".", import.meta.url));
const RAIZ_REPO = fileURLToPath(new URL("..", import.meta.url));

function leerArgumentos(argv) {
  const out = { check: false, outDir: join(RAIZ_REPO, "apps/api/src/rules/catalog/generado") };
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

  // Ola de arreglos (I7): un fallo de esquema en conjuros también para el CLI — antes se
  // imprimía como conteo y el JSON se escribía igual.
  const validacion = spellsCatalogSchema.safeParse(resultado.spells);
  if (!validacion.success) {
    console.error("spells-srd.json no pasa el esquema Zod:");
    for (const i of validacion.error.issues) console.error(`  ${i.path.join(".")}: ${i.message}`);
    process.exit(1);
  }

  const validacionFeatures = classFeaturesCatalogSchema.safeParse(resultado.features);
  if (!validacionFeatures.success) {
    console.error("class-features-srd.json no pasa el esquema Zod:");
    for (const i of validacionFeatures.error.issues)
      console.error(`  ${i.path.join(".")}: ${i.message}`);
    process.exit(1);
  }
  const validacionRazas = raceFeaturesCatalogSchema.safeParse(resultado.razas);
  if (!validacionRazas.success) {
    console.error("race-features-srd.json no pasa el esquema Zod:");
    for (const i of validacionRazas.error.issues)
      console.error(`  ${i.path.join(".")}: ${i.message}`);
    process.exit(1);
  }
  const validacionEscalas = classScalesCatalogSchema.safeParse(resultado.escalas);
  if (!validacionEscalas.success) {
    console.error("class-scales-srd.json no pasa el esquema Zod:");
    for (const i of validacionEscalas.error.issues)
      console.error(`  ${i.path.join(".")}: ${i.message}`);
    process.exit(1);
  }

  console.log("Conteos:");
  for (const [k, v] of Object.entries(resultado.conteos)) console.log(`  ${k}: ${v}`);

  // Un rechazo NO declarado (un tipo de actividad que `actividadDe` no conoce) para el CLI
  // antes de escribir y también en `--check` (I7: antes solo se miraba tras escribir).
  const noDeclarados = [
    resultado.rechazos.huecos,
    resultado.rechazos.aptitudes.huecos,
    resultado.rechazos.razas.huecos,
  ]
    .flat()
    .filter((r) => r.includes("RECHAZO SIN DECLARAR"));
  if (noDeclarados.length > 0) {
    console.error("Hubo al menos un rechazo NO declarado (tipo de actividad sin implementar):");
    for (const r of noDeclarados) console.error(`  ${r}`);
    process.exit(1);
  }

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
}

main();
