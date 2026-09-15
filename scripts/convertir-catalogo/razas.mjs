import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { load as cargarYaml } from "js-yaml";
import { actividadDe } from "./actividad.mjs";

// Tarea 3A.1 (T3) — los rasgos raciales: `races/**/*.yml` con `type: feat` (E-3A1-11/d.1 de T0:
// 26 de esos, más 9 `type: race` — las subrazas en sí, que no son una aptitud y aquí no se leen).
//
// **Alcance más corto que el de clases, declarado, no escondido.** Una aptitud de clase tiene
// `system.requirements` (`"Fighter 5"`) que da clase+nivel sin ambigüedad; un rasgo racial no
// tiene ese campo — ni clase, ni nivel, solo una carpeta. Emparejar el NOMBRE español de cada
// rasgo pasaría por la misma extracción de prosa por-aptitud que T3 ya declaró fuera de alcance
// para clases (ver `aptitudes.mjs`): aquí se reutiliza el nombre que `races.ts` ya verificó en
// 2A.3 para los rasgos comunes (`nombresDeRaza` en `emparejamientos.json`), y el resto queda
// `sinTraduccion: true`, contado en el informe — nunca inventado.

const CARPETA_FOUNDRY_A_CLAVE = {
  dragonborn: "dragonborn",
  dwarf: "dwarf",
  elf: "elf",
  gnome: "gnome",
  halfling: "halfling",
  human: "human",
  orc: "half-orc", // el SRD 5.1 solo tiene "semiorco" como raza jugable; Foundry lo guarda bajo "orc"
  tiefling: "tiefling",
};

function listarYaml(dir) {
  const salida = [];
  function recorrer(actual) {
    for (const nombre of readdirSync(actual)) {
      const ruta = join(actual, nombre);
      const st = statSync(ruta);
      if (st.isDirectory()) recorrer(ruta);
      else if (nombre.endsWith(".yml")) salida.push(ruta);
    }
  }
  recorrer(dir);
  return salida;
}

function limpiarProsa(html) {
  if (!html) return "";
  return html
    .replace(/@UUID\[[^\]]*\]\{([^}]*)\}/g, "$1")
    .replace(/@UUID\[[^\]]*\]/g, "")
    .replace(/@embed\[[^\]]*\]\{([^}]*)\}/g, "$1")
    .replace(/@embed\[[^\]]*\]/g, "")
    .replace(/\[\[lookup\s+[^\]]*\]\](?:\{[^}]*\})?/g, "")
    .replace(/\[\[\/(?:r|roll|gmroll|blindroll)\s+[^\]]*\]\]\{([^}]*)\}/gi, "$1")
    .replace(/\[\[\/(?:r|roll|gmroll|blindroll)\s+[^\]]*\]\]/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * `convertirRazas({ foundryDir, emparejamientos })` — lee `races/` directamente (no pasa por
 * `leerFoundry`, que solo visita `spells/classfeatures/subclasses`). Devuelve
 * `{ features: RaceFeature[], rechazos }`.
 */
export function convertirRazas({ foundryDir, emparejamientos }) {
  const raiz = join(foundryDir, "races");
  let archivos;
  try {
    archivos = listarYaml(raiz);
  } catch {
    return { features: [], rechazos: { sinTraduccion: [], noEsAptitud: [] } };
  }

  const nombresDeRaza = emparejamientos?.rasgosDeRaza ?? {};
  const rechazos = { sinTraduccion: [], noEsAptitud: [] };
  const features = [];

  for (const ruta of archivos) {
    if (ruta.endsWith("_folder.yml")) continue;
    const doc = cargarYaml(readFileSync(ruta, "utf8"));
    if (doc?.type !== "feat") {
      rechazos.noEsAptitud.push(
        `${doc?.system?.identifier ?? doc?.name ?? ruta}: type: ${doc?.type} — subraza en sí o ` +
          `carpeta, no un rasgo (fuera de alcance de T3, ver cabecera del módulo).`,
      );
      continue;
    }
    const reglas = doc.system?.source?.rules;
    if (reglas !== "2014") continue; // misma frontera de edición que spells/classfeatures

    const partes = ruta.split(/[\\/]/);
    const i = partes.indexOf("races");
    const carpeta = partes[i + 1];
    const raceKey = CARPETA_FOUNDRY_A_CLAVE[carpeta] ?? carpeta;

    const identifier = doc.system.identifier;
    const nameEs = nombresDeRaza[`${raceKey}:${identifier}`] ?? null;
    const sinTraduccion = !nameEs;
    if (sinTraduccion) rechazos.sinTraduccion.push(`${raceKey}:${identifier}`);

    const textEnPlano = limpiarProsa(doc.system.description?.value) || "(sin texto)";

    const actividades = [];
    const fueraDeA = [];
    const bloque = doc.system.activities ?? {};
    for (const actividadFoundry of Object.values(bloque)) {
      const r = actividadDe(actividadFoundry, {
        recurso: identifier,
        esCantrip: false,
        descripcionEs: textEnPlano,
      });
      if (r.rechazo) {
        rechazos.noEsAptitud.push(
          `${raceKey}:${identifier}/${actividadFoundry.type}: ${r.rechazo}`,
        );
      } else if (r.texto) {
        fueraDeA.push(r.tipo);
      } else {
        actividades.push(r);
      }
    }

    features.push({
      key: identifier,
      race: raceKey,
      nameEn: doc.name,
      nameEs,
      sinTraduccion,
      textEn: textEnPlano.slice(0, 4000),
      textEs: null,
      actividades,
      fueraDeA,
      efectosPasivos: (doc.effects ?? []).length,
    });
  }

  return { features, rechazos };
}
