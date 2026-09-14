import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { convertir, escribir, comprobar } from "../salida.mjs";

// Tarea 3A.1 (T1), Step 8. Un directorio de 3 YAML sintéticos (dos conjuros con huella única y
// una carpeta) y un texto de 3 cabeceras del SRD español (dos conjuros reales, uno de ellos sin
// pareja en Foundry a propósito, para probar `sinPareja`).

function fuenteFoundry() {
  const dir = mkdtempSync(join(tmpdir(), "convertir-catalogo-salida-"));
  mkdirSync(join(dir, "spells", "cantrip"), { recursive: true });
  writeFileSync(join(dir, "spells", "_folder.yml"), "name: Spells\ntype: Item\n");
  writeFileSync(
    join(dir, "spells", "cantrip", "fire-bolt.yml"),
    [
      "name: Fire Bolt",
      "type: spell",
      "system:",
      "  identifier: fire-bolt",
      "  level: 0",
      "  school: evo",
      "  properties: [vocal, somatic]",
      "  description:",
      "    value: You hurl fire.",
      "  range:",
      "    value: '120'",
      "    units: ft",
      "  duration:",
      "    units: inst",
      "    value: ''",
      "  materials: {}",
      "  source:",
      "    rules: '2014'",
      "  activities: {}",
      "effects: []",
    ].join("\n"),
  );
  return dir;
}

const SRD_ES = `
Descarga de fuego
Evocación (truco)
Tiempo de lanzamiento: 1 acción
Alcance: 36 m
Componentes: V, S
Duración: Instantánea
Lanzas una descarga de fuego contra un objetivo.
`;

// T2: mismo texto que SRD_ES, más las listas por clase (E-3A1-3) de dos clases — para probar que
// `classes` sale del listado español y no de una adivinanza.
const SRD_ES_CON_LISTAS = `
${SRD_ES}
Conjuros de mago
Trucos (nivel 0)
Descarga de fuego
Conjuros de hechicero
Trucos (nivel 0)
Descarga de fuego
Descripciones de conjuros
`;

test("convertir + escribir + comprobar: el catálogo regenerado coincide con lo escrito", () => {
  const foundryDir = fuenteFoundry();
  const outDir = mkdtempSync(join(tmpdir(), "convertir-catalogo-out-"));
  try {
    const emparejamientos = { conjuros: { "fire-bolt": "Descarga de fuego" } };
    const resultado = convertir({ foundryDir, srdEsTxt: SRD_ES, emparejamientos });

    assert.equal(resultado.spells.length, 1);
    assert.equal(resultado.spells[0].nameEs, "Descarga de fuego");
    assert.equal(resultado.spells[0].sinTraduccion, false);

    escribir(outDir, resultado);
    const spellsJson = readFileSync(join(outDir, "spells-srd.json"), "utf8");
    assert.match(spellsJson, /Descarga de fuego/);

    const cmp = comprobar(outDir, resultado);
    assert.equal(cmp.ok, true, cmp.motivo);
  } finally {
    rmSync(foundryDir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  }
});

test("--check falla si el YAML cambia tras escribir el catálogo", () => {
  const foundryDir = fuenteFoundry();
  const outDir = mkdtempSync(join(tmpdir(), "convertir-catalogo-out2-"));
  try {
    const emparejamientos = { conjuros: { "fire-bolt": "Descarga de fuego" } };
    const resultado1 = convertir({ foundryDir, srdEsTxt: SRD_ES, emparejamientos });
    escribir(outDir, resultado1);

    // Tocar el YAML: sube el nivel de 0 a 1.
    const ruta = join(foundryDir, "spells", "cantrip", "fire-bolt.yml");
    writeFileSync(ruta, readFileSync(ruta, "utf8").replace("level: 0", "level: 1"));

    const resultado2 = convertir({ foundryDir, srdEsTxt: SRD_ES, emparejamientos });
    const cmp = comprobar(outDir, resultado2);
    assert.equal(cmp.ok, false);
  } finally {
    rmSync(foundryDir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  }
});

test("classes sale de las listas de conjuros por clase del SRD español (E-3A1-3, T2)", () => {
  const foundryDir = fuenteFoundry();
  try {
    const emparejamientos = { conjuros: { "fire-bolt": "Descarga de fuego" } };
    const resultado = convertir({ foundryDir, srdEsTxt: SRD_ES_CON_LISTAS, emparejamientos });
    assert.equal(resultado.spells.length, 1);
    assert.deepEqual([...resultado.spells[0].classes].sort(), ["sorcerer", "wizard"]);
  } finally {
    rmSync(foundryDir, { recursive: true, force: true });
  }
});

test("classes queda vacío si el conjuro no aparece en ninguna lista por clase", () => {
  const foundryDir = fuenteFoundry();
  try {
    const emparejamientos = { conjuros: { "fire-bolt": "Descarga de fuego" } };
    const resultado = convertir({ foundryDir, srdEsTxt: SRD_ES, emparejamientos });
    assert.deepEqual(resultado.spells[0].classes, []);
  } finally {
    rmSync(foundryDir, { recursive: true, force: true });
  }
});

test("limpiarProsa (T2): @embed[...]{Nombre} y [[lookup ...]] no sobreviven en textEn", () => {
  const dir = mkdtempSync(join(tmpdir(), "convertir-catalogo-embed-"));
  try {
    mkdirSync(join(dir, "spells", "cantrip"), { recursive: true });
    writeFileSync(
      join(dir, "spells", "cantrip", "confusion-like.yml"),
      [
        "name: Confusion Like",
        "type: spell",
        "system:",
        "  identifier: confusion-like",
        "  level: 0",
        "  school: enc",
        "  properties: [vocal, somatic]",
        "  description:",
        "    value: >-",
        "      <p>Roll on the @UUID[Compendium.x]{Confusion} table.</p>",
        "      <p>@embed[Compendium.dnd5e.tables.RollTable.abc inline rollable]{Confusion}</p>",
        "      <p>Lasts for [[lookup @labels.duration activity=xyz]]{1 minute}.</p>",
        "  range:",
        "    value: '30'",
        "    units: ft",
        "  duration:",
        "    units: inst",
        "    value: ''",
        "  materials: {}",
        "  source:",
        "    rules: '2014'",
        "  activities: {}",
        "effects: []",
      ].join("\n"),
    );
    const resultado = convertir({ foundryDir: dir, srdEsTxt: "", emparejamientos: {} });
    assert.equal(resultado.spells.length, 1);
    assert.equal(resultado.spells[0].textEn.includes("@"), false);
    assert.equal(resultado.spells[0].textEn.includes("Confusion"), true);
    assert.equal(resultado.spells[0].textEn.includes("[[lookup"), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
