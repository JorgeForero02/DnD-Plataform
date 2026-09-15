import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { load as cargarYaml } from "js-yaml";
import { actividadDe } from "./actividad.mjs";
import { textoDeRasgoDeRaza } from "./srd-es.mjs";

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

/**
 * T3b — un puñado de `nameEs` ya fijados en `rasgosDeRaza` (2A.3) no coinciden literalmente con
 * la cabecera que usa `srd-5.1-es.txt` para la misma prosa (`dwarf:dwarven-toughness` es
 * «Tenacidad enana» en el catálogo pero «Aguante Enano» en el SRD, que es la Dureza Enana del
 * enano de las colinas). Nunca se toca `nameEs` por esto —es el nombre que 2A.3 ya verificó y lo
 * que ve la hoja— solo se busca el TEXTO bajo este alias antes de darlo por no encontrado.
 */
const ALIAS_DE_BUSQUEDA = {
  "dwarf:dwarven-toughness": "Aguante Enano",
};

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
 * `convertirRazas({ foundryDir, emparejamientos, cortesEs })` — lee `races/` directamente (no
 * pasa por `leerFoundry`, que solo visita `spells/classfeatures/subclasses`). Devuelve
 * `{ features: RaceFeature[], rechazos }`. `cortesEs` es el resultado de `cortarAptitudesEs`
 * (T3b, `srd-es.mjs`), opcional por la misma razón que en `aptitudes.mjs`.
 */
export function convertirRazas({ foundryDir, emparejamientos, cortesEs }) {
  const raiz = join(foundryDir, "races");
  let archivos;
  try {
    archivos = listarYaml(raiz);
  } catch {
    return { features: [], rechazos: { sinTraduccion: [], noEsAptitud: [], sinTextoEs: [] } };
  }

  const nombresDeRaza = emparejamientos?.rasgosDeRaza ?? {};
  // T3b: último recurso, solo para lo que el SRD español no nombra (10 colores del Ataque de
  // Aliento dracónido — ver el comentario de `traduccionesPropias` en `emparejamientos.json`).
  const traduccionesPropias = emparejamientos?.traduccionesPropias ?? {};
  const rechazos = { sinTraduccion: [], noEsAptitud: [], sinTextoEs: [] };
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
    let nameEs = nombresDeRaza[`${raceKey}:${identifier}`] ?? null;
    let traduccionPropia = false;
    if (!nameEs) {
      const propia = traduccionesPropias[`${raceKey}:${identifier}`];
      if (propia) {
        nameEs = propia;
        traduccionPropia = true;
      }
    }
    const sinTraduccion = !nameEs;
    if (sinTraduccion) rechazos.sinTraduccion.push(`${raceKey}:${identifier}`);

    const nombreDeBusqueda = ALIAS_DE_BUSQUEDA[`${raceKey}:${identifier}`] ?? nameEs;
    const textEs =
      !traduccionPropia && cortesEs
        ? (textoDeRasgoDeRaza(cortesEs, raceKey, nombreDeBusqueda) ?? null)
        : null;
    if (nameEs && !traduccionPropia && !textEs) {
      rechazos.sinTextoEs.push(`${raceKey}:${identifier} -> ${nameEs}`);
    }

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
      traduccionPropia,
      textEn: textEnPlano.slice(0, 4000),
      textEs: textEs ? textEs.slice(0, 4000) : null,
      actividades,
      fueraDeA,
      efectosPasivos: (doc.effects ?? []).length,
    });
  }

  return { features, rechazos };
}
