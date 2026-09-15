import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { load as cargarYaml } from "js-yaml";

// Tarea 3A.1 (T1) — lee los `.yml` de Foundry (`packs/_source/{spells,classfeatures,subclasses}`)
// y separa conjuros y aptitudes válidos de lo que no lo es. **Solo lectura**: el código de
// Foundry (`module/`) nunca se ejecuta, solo se leen sus datos como YAML plano.
//
// **SRD 5.1 (2014), nunca la edición 2024** (constraints.md, Global Constraints): cualquier
// fichero cuyo `system.source.rules !== '2014'` se rechaza con motivo, aunque viva bajo
// `spells/` o `classfeatures/` — ver `classes24/` en el árbol real, que este módulo ni siquiera
// visita porque solo entra a las tres carpetas de la lista.

const CARPETAS_DE_ENTRADA = ["spells", "classfeatures", "subclasses"];

function listarYaml(dir) {
  const salida = [];
  function recorrer(actual) {
    for (const nombre of readdirSync(actual)) {
      const ruta = join(actual, nombre);
      const st = statSync(ruta);
      if (st.isDirectory()) {
        recorrer(ruta);
      } else if (nombre.endsWith(".yml")) {
        salida.push(ruta);
      }
    }
  }
  recorrer(dir);
  return salida;
}

/**
 * `leerFoundry(dir)` — dir es `FOUNDRY_SOURCE_DIR` (…/packs/_source). Devuelve
 * `{ spells, features, folders, rechazados }`. **Pura respecto al repo**: no escribe nada, solo
 * lee y clasifica.
 */
export function leerFoundry(dir) {
  const spells = [];
  const features = [];
  const rechazados = [];
  let folders = 0;

  for (const carpeta of CARPETAS_DE_ENTRADA) {
    const raiz = join(dir, carpeta);
    let archivos;
    try {
      archivos = listarYaml(raiz);
    } catch {
      continue; // la carpeta no existe en esta fuente (p. ej. en una fuente sintética de test)
    }

    for (const ruta of archivos) {
      if (ruta.endsWith("_folder.yml")) {
        folders += 1;
        continue;
      }

      const texto = readFileSync(ruta, "utf8");
      const doc = cargarYaml(texto);
      const reglas = doc?.system?.source?.rules;

      if (reglas !== "2014") {
        rechazados.push({
          ruta,
          identifier: doc?.system?.identifier ?? doc?.name,
          motivo: `system.source.rules = "${reglas}", no "2014" — SRD 5.1 (2014) únicamente, nunca la edición 2024.`,
        });
        continue;
      }

      if (carpeta === "spells") {
        if (doc.type !== "spell") {
          rechazados.push({
            ruta,
            identifier: doc?.system?.identifier ?? doc?.name,
            motivo: `type: ${doc.type}, no "spell" — no es un conjuro (E-3A1-11: revisado uno a uno en T0).`,
          });
          continue;
        }
        spells.push({ ruta, key: doc.system.identifier, name: doc.name, doc });
      } else {
        // classfeatures/ y subclasses/: ambas aportan `type: feat`.
        if (doc.type !== "feat") {
          rechazados.push({
            ruta,
            identifier: doc?.system?.identifier ?? doc?.name,
            motivo: `type: ${doc.type}, no "feat" — no es una aptitud (E-3A1-11: revisado uno a uno en T0).`,
          });
          continue;
        }
        features.push({ ruta, key: doc.system.identifier, name: doc.name, doc });
      }
    }
  }

  return { spells, features, folders, rechazados };
}

/**
 * `leerSubclases(dir)` — Tarea 3A.1 (T3). Lee `subclasses/*.yml` (12 ficheros planos,
 * `type: subclass`, no `feat`): no son una aptitud en sí, son el ENLACE entre una subclase y su
 * clase base (`system.classIdentifier`) que `leerFoundry` no puede dar porque su filtro
 * `type !== "feat"` los rechaza a propósito para conjuros y aptitudes. Sin esto no hay forma de
 * saber que `classfeatures/fighter/champion-features/*.yml` pertenece a la subclase `champion`
 * de `fighter` — el nombre de la carpeta lo insinúa, pero `system.identifier` de la subclase es
 * el dato real (E-3A1-2, la misma disciplina que ya exige no adivinar por texto).
 *
 * Devuelve `{ subclases }`: `subclases` es `{ key, name, classKey }[]` — `key` es
 * `system.identifier` (coincide con la `subclasses[].key` de `classes.ts`, p. ej. `"champion"`),
 * `name` el nombre EN INGLÉS (lo que trae `system.requirements` de cada aptitud, p. ej.
 * `"Champion 10"`, para poder resolver el propietario de una aptitud de subclase), `classKey`
 * el `system.classIdentifier` (`"fighter"`).
 */
export function leerSubclases(dir) {
  const raiz = join(dir, "subclasses");
  let archivos;
  try {
    archivos = listarYaml(raiz);
  } catch {
    return { subclases: [] };
  }
  const subclases = [];
  for (const ruta of archivos) {
    const texto = readFileSync(ruta, "utf8");
    const doc = cargarYaml(texto);
    if (doc?.type !== "subclass") continue; // por si algún día cuelga otra cosa ahí
    // Misma frontera de edición que `leerFoundry` (ola de arreglos, m5): «el conversor rechaza
    // cualquier fichero cuyo rules no sea 2014», también aquí y en `leerEscalasDeClase`.
    if (doc.system?.source?.rules !== "2014") continue;
    subclases.push({
      key: doc.system?.identifier,
      name: doc.name,
      classKey: doc.system?.classIdentifier,
    });
  }
  return { subclases };
}

/**
 * `leerEscalasDeClase(dir)` — Tarea 3A.1 (T3, Step 3). Lee `classes/*.yml` buscando
 * `advancement[].type === "ScaleValue"` (el `@scale.<clase>.<clave>` que T1 ya tradujo a
 * `escala("<clase>-<clave>")`, E-3A1-4) y lo inlina a `ScaleStep[]` (`{ desde, valor }`, la
 * misma forma que `SrdClass.scales` ya usa en `classes.ts` para `barbarian-rages`).
 *
 * **Solo el tramo NUMÉRICO, nunca la fórmula evaluable.** `configuration.type` de Foundry es
 * `"number"` (un entero por nivel, `{ value: N }`: usos de Indómito, de Acción Súbita…) o
 * `"dice"` (`{ number, faces }`: Ataque Furtivo, el dado de Artes Marciales…) — de esta segunda
 * forma solo se guarda `number` (cuántos dados), nunca `faces` (el tamaño del dado): `ScaleStep`
 * es un solo número por tramo, la misma frontera que ya declaró `origen.mjs` para `escala`. El
 * tamaño de dado se documenta en la prosa de la aptitud, no en esta tabla — inventar un segundo
 * campo para que quepa habría sido torcer el esquema para un solo caso, la misma disciplina que
 * ya evitó `expresionDeDadosSchema.n` como `Origen` (hueco A, T0).
 *
 * Devuelve `Record<claveDeClase, Record<"<clase>-<identificador>", ScaleStep[]>>`.
 */
export function leerEscalasDeClase(dir) {
  const raiz = join(dir, "classes");
  let archivos;
  try {
    archivos = listarYaml(raiz);
  } catch {
    return {};
  }
  const porClase = {};
  for (const ruta of archivos) {
    if (ruta.endsWith("_folder.yml")) continue;
    const doc = cargarYaml(readFileSync(ruta, "utf8"));
    const classKey = doc?.system?.identifier;
    if (!classKey) continue;
    if (doc.system?.source?.rules !== "2014") continue; // ver leerSubclases (m5)
    const advancement = doc?.system?.advancement ?? [];
    const scales = {};
    for (const bloque of advancement) {
      if (bloque.type !== "ScaleValue") continue;
      const cfg = bloque.configuration;
      const identificador = cfg?.identifier;
      const escala = cfg?.scale ?? {};
      const pasos = Object.entries(escala)
        .map(([nivel, valor]) => ({
          desde: Number.parseInt(nivel, 10),
          valor: typeof valor?.value === "number" ? valor.value : (valor?.number ?? null),
        }))
        .filter((p) => Number.isFinite(p.desde) && typeof p.valor === "number")
        .sort((a, b) => a.desde - b.desde);
      if (identificador && pasos.length > 0) scales[`${classKey}-${identificador}`] = pasos;
    }
    if (Object.keys(scales).length > 0) porClase[classKey] = scales;
  }
  return porClase;
}

/**
 * `leerConcesionesDeClase(dir)` — ola de arreglos (I10). Lee el `advancement` de `classes/*.yml`
 * para saber QUÉ clase concede un fichero de `classfeatures/shared-features/` y a qué nivel:
 * `extra-attack.yml` no tiene `requirements`, pero bárbaro, monje, paladín y explorador lo
 * conceden por `ItemGrant` (`configuration.items[].uuid` termina en su `_id`) al nivel 5; la
 * Mejora de Característica no es un `ItemGrant` sino un `AbilityScoreImprovement` por clase (la
 * primera vez, al nivel 4). Hasta esta ola los dos entraban como «fighter, nivel 1» — un dato
 * inventado que el invariante «toda aptitud tiene clase y nivel 1–20» aceptaba.
 *
 * Devuelve `{ porId: Map<_id, {class, level}[]>, mejoraDeCaracteristica: {class, level}[] }`.
 */
export function leerConcesionesDeClase(dir) {
  const raiz = join(dir, "classes");
  let archivos;
  try {
    archivos = listarYaml(raiz);
  } catch {
    return { porId: new Map(), mejoraDeCaracteristica: [] };
  }
  const porId = new Map();
  const mejoraDeCaracteristica = [];
  for (const ruta of archivos) {
    if (ruta.endsWith("_folder.yml")) continue;
    const doc = cargarYaml(readFileSync(ruta, "utf8"));
    const classKey = doc?.system?.identifier;
    if (!classKey || doc.system?.source?.rules !== "2014") continue;
    let primerAsi;
    for (const bloque of doc.system.advancement ?? []) {
      if (bloque.type === "AbilityScoreImprovement") {
        if (primerAsi === undefined || bloque.level < primerAsi) primerAsi = bloque.level;
      }
      if (bloque.type !== "ItemGrant") continue;
      for (const item of bloque.configuration?.items ?? []) {
        const id = String(item.uuid ?? "")
          .split(".")
          .pop();
        if (!id) continue;
        if (!porId.has(id)) porId.set(id, []);
        porId.get(id).push({ class: classKey, level: bloque.level });
      }
    }
    if (primerAsi !== undefined) mejoraDeCaracteristica.push({ class: classKey, level: primerAsi });
  }
  return { porId, mejoraDeCaracteristica };
}
