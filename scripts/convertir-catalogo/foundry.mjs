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
