import { actividadDe } from "./actividad.mjs";
import { origenDe } from "./origen.mjs";

// Tarea 3A.1 (T3) — las aptitudes de clase y subclase: 234 `type: feat` de `classfeatures/`,
// traducidas con el mismo `actividadDe` que ya usan los conjuros (T1). Lo nuevo de esta tanda es
// de dónde sale la CLASE, el NIVEL y el NOMBRE ESPAÑOL de una aptitud — un conjuro los trae en su
// propio `system.level`/`system.school`; una aptitud de clase no, y hay que resolverlos.

/**
 * Cuatro subclases donde `system.identifier` de Foundry (`subclasses/*.yml`) NO coincide con la
 * `key` que ya declara `classes.ts` (2A.3) — medido al convertir, no adivinado: el resto de las
 * doce coincide tal cual (`life-domain`, `circle-of-the-land`, `champion`, `oath-of-devotion`,
 * `hunter`, `thief`, `draconic-bloodline`, `the-fiend`). Nunca se renombra `classes.ts`.
 */
const IDENTIFICADOR_DE_SUBCLASE_A_CLAVE = {
  "path-of-the-berserker": "berserker",
  "college-of-lore": "lore",
  "way-of-the-open-hand": "open-hand",
  "school-of-evocation": "evocation",
};

/** Las doce clases del SRD 5.1, en el inglés que usa `system.requirements` de Foundry. */
const CLASE_EN_A_CLAVE = {
  Barbarian: "barbarian",
  Bard: "bard",
  Cleric: "cleric",
  Druid: "druid",
  Fighter: "fighter",
  Monk: "monk",
  Paladin: "paladin",
  Ranger: "ranger",
  Rogue: "rogue",
  Sorcerer: "sorcerer",
  Warlock: "warlock",
  Wizard: "wizard",
};

/**
 * `requirements` de una aptitud (p. ej. `"Fighter 5"`, o `"Fighter 1, Champion 10, Ranger 2"`
 * para un estilo de combate compartido) es el dato MÁS fiable que trae Foundry para saber a
 * quién pertenece y en qué nivel — más que la posición en la tabla del SRD español, que no
 * distingue una aptitud compartida entre varias clases. Se toma el PRIMER propietario listado
 * como el "dueño primario" (metadato informativo del catálogo); el resto de propietarios llega
 * igual a su texto porque el emparejamiento real (para `enriquecerClases`) es por IDENTIFICADOR,
 * no por esta cadena.
 */
function primerPropietario(requirements) {
  if (!requirements || requirements === "''") return null;
  const limpio = requirements.replace(/^'|'$/g, "").trim();
  if (!limpio) return null;
  const primero = limpio.split(",")[0].trim();
  const m = primero.match(/^(.+?)\s+(\d+)(?:st|nd|rd|th)?$/);
  if (!m) return null;
  return { nombre: m[1].trim(), nivel: Number.parseInt(m[2], 10) };
}

/**
 * `<repo>/.../classfeatures/<classFolder>/<subFolder>/<file>.yml` → `{ owner, compartida }`.
 * `owner` es `"<classKey>"` o `"<classKey>/<subclassKey>"`; `compartida: true` cuando el fichero
 * vive en `classfeatures/shared-features/` (sin clase propia: el genérico de Mejora de
 * puntuación de característica, el Ataque adicional que reutilizan cuatro clases, los seis
 * estilos de combate) — esos se buscan por identificador sin más, cualquier clase los puede usar.
 */
function propietarioDeRuta(ruta, subclasesPorCarpeta) {
  const partes = ruta.split(/[\\/]/);
  const i = partes.indexOf("classfeatures");
  const classFolder = partes[i + 1];
  const subFolder = partes[i + 2];
  if (classFolder === "shared-features" || subFolder === undefined) {
    return { owner: null, compartida: true };
  }
  const subSlug = subFolder.replace(/-features$/, "");
  if (subSlug === classFolder) return { owner: classFolder, compartida: false };
  const subclaveNormalizada = subclasesPorCarpeta.get(subSlug);
  if (subclaveNormalizada)
    return { owner: `${classFolder}/${subclaveNormalizada}`, compartida: false };
  return { owner: classFolder, compartida: false };
}

/** `usos` de un `ClassFeature.grant` (E-3A1-5), desde `doc.system.uses`. `undefined` si no hay. */
function usosDe(uses) {
  const maxCrudo = uses?.max;
  if (maxCrudo === undefined || maxCrudo === null || maxCrudo === "") return undefined;
  let max;
  if (/^\d+$/.test(String(maxCrudo).trim())) {
    max = { tipo: "fijo", valor: Number.parseInt(maxCrudo, 10) };
  } else {
    const r = origenDe(maxCrudo);
    if (r.rechazo) return undefined; // fórmula que no cabe en Origen: sin usos declarados, no inventados
    max = r.origen;
  }
  const periodo = uses.recovery?.[0]?.period;
  const resetOn = periodo === "sr" ? "SHORT_REST" : periodo === "lr" ? "LONG_REST" : undefined;
  if (!resetOn) return undefined;
  return { max, resetOn };
}

/**
 * `convertirAptitudes({ featuresFoundry, subclases, emparejamientos })` — pura. Devuelve
 * `{ features: SrdFeature[], rechazos }`.
 */
export function convertirAptitudes({ featuresFoundry, subclases, emparejamientos }) {
  // `s.key` normalizada a la clave de `classes.ts` (`IDENTIFICADOR_DE_SUBCLASE_A_CLAVE` para las
  // cuatro que no coinciden con el `identifier` de Foundry, igual en el resto).
  const subclasesNormalizadas = subclases.map((s) => ({
    ...s,
    key: IDENTIFICADOR_DE_SUBCLASE_A_CLAVE[s.key] ?? s.key,
  }));
  // Por el IDENTIFICADOR CRUDO de Foundry (el que nombra la carpeta `<identifier>-features/`) —
  // usado solo por `propietarioDeRuta` (el respaldo sin `requirements` resoluble), a diferencia
  // de `subclasesPorNombreEn` que ya trabaja con la clave normalizada de `classes.ts`.
  const subclasesPorCarpeta = new Map(
    subclases.map((s) => [s.key, IDENTIFICADOR_DE_SUBCLASE_A_CLAVE[s.key] ?? s.key]),
  );
  const subclasesPorNombreEn = new Map(subclasesNormalizadas.map((s) => [s.name, s]));

  const clavesDeAptitud = emparejamientos?.clavesDeAptitud ?? {};
  const nombresDeAptitud = emparejamientos?.aptitudesDeClase ?? {};

  const rechazos = { sinTraduccion: [], fueraDeA: [] };
  const features = [];

  for (const entry of featuresFoundry) {
    const { doc, key: identifier, name: nameEn, ruta } = entry;
    const requirements = doc.system.requirements ?? "";
    const dueño = primerPropietario(requirements);

    let classKey;
    let subclassKey;
    let level;
    if (dueño && CLASE_EN_A_CLAVE[dueño.nombre]) {
      classKey = CLASE_EN_A_CLAVE[dueño.nombre];
      level = dueño.nivel;
    } else if (dueño && subclasesPorNombreEn.has(dueño.nombre)) {
      const sub = subclasesPorNombreEn.get(dueño.nombre);
      classKey = sub.classKey;
      subclassKey = sub.key;
      level = dueño.nivel;
    } else {
      // Sin `requirements` resoluble (los dos genéricos de `shared-features` sin dueño propio:
      // Mejora de puntuación de característica, Ataque adicional): el propietario "primario" se
      // deriva de la carpeta solo para tener un `class`/`level` válidos en el esquema — el dato
      // real que importa (la clase que de verdad concede esta aptitud) lo decide `classes.ts`
      // al enriquecerse por identificador, no este campo informativo.
      const porRuta = propietarioDeRuta(ruta, subclasesPorCarpeta);
      classKey = porRuta.owner ?? "fighter";
      level = 1;
    }

    const owner = subclassKey ? `${classKey}/${subclassKey}` : classKey;
    const claveOverride = clavesDeAptitud[`${owner}:${identifier}`];
    const identificadorResuelto = claveOverride ?? identifier;

    let nameEs = nombresDeAptitud[`${owner}:${identificadorResuelto}`] ?? null;
    if (!nameEs && !subclassKey) {
      // Último intento: el identificador desnudo bajo "shared" (Mejora de puntuación de
      // característica y compañía, que no tienen clase propia en el catálogo generado).
      nameEs = nombresDeAptitud[`shared:${identificadorResuelto}`] ?? null;
    }
    const sinTraduccion = !nameEs;
    if (sinTraduccion) rechazos.sinTraduccion.push(`${owner}:${identifier}`);

    const textEnPlano = limpiarProsaFeature(doc.system.description?.value) || "(sin texto)";

    const ctxComun = {
      recurso: identifier,
      itemLevel: undefined,
      esCantrip: false,
      descripcionEs: textEnPlano,
      claveConocida: identifier,
    };
    const actividades = [];
    const fueraDeA = [];
    const bloque = doc.system.activities ?? {};
    for (const actividadFoundry of Object.values(bloque)) {
      const r = actividadDe(actividadFoundry, ctxComun);
      if (r.rechazo) {
        rechazos.fueraDeA.push(`${owner}:${identifier}/${actividadFoundry.type}: ${r.rechazo}`);
      } else if (r.texto) {
        fueraDeA.push(r.tipo);
      } else {
        actividades.push(r);
      }
    }

    features.push({
      key: identifier,
      class: classKey,
      ...(subclassKey && { subclass: subclassKey }),
      level,
      nameEn,
      nameEs,
      sinTraduccion,
      textEn: textEnPlano.slice(0, 4000),
      // Sin extracción de prosa española por-aptitud en esta tanda (a diferencia de los
      // conjuros, una aptitud no tiene una cabecera de cuatro etiquetas que acote su cuerpo en
      // `srd-5.1-es.txt`; el nombre SÍ sale del SRD español — `aptitudesDeClase`, hecho a mano
      // sobre el nombre que `classes.ts` ya verificó en 2A.3 — pero el TEXTO largo se queda en
      // inglés, documentado como deuda, no fingido): `textEs` es `null` salvo los ocho casos
      // conocidos de la tarea 0 que sí traen descripción en español (`CONOCIDOS_A_MANO`, más
      // abajo vía `actividadDe`).
      textEs: null,
      ...(usosDe(doc.system.uses) && { usos: usosDe(doc.system.uses) }),
      actividades,
      fueraDeA,
      efectosPasivos: (doc.effects ?? []).length,
    });
  }

  return { features, rechazos };
}

/** Misma limpieza que `salida.mjs` usa para conjuros (E-3A1-7) — se repite aquí para no crear
 * una dependencia circular entre los dos módulos por una función de diez líneas. */
function limpiarProsaFeature(html) {
  if (!html) return "";
  return (
    html
      .replace(/@UUID\[[^\]]*\]\{([^}]*)\}/g, "$1")
      .replace(/@UUID\[[^\]]*\]/g, "")
      .replace(/@embed\[[^\]]*\]\{([^}]*)\}/g, "$1")
      .replace(/@embed\[[^\]]*\]/g, "")
      .replace(/\[\[lookup\s+[^\]]*\]\](?:\{[^}]*\})?/g, "")
      // Tarea 3A.1 (T3) — `[[/r <fórmula>]]{Etiqueta}` es una TIRADA EN LÍNEA de Foundry (la
      // primera aparece en Desviar proyectiles del monje: "1d10 + @abilities.dex.mod +
      // @classes.monk.levels"). No hay ningún conjuro entre los 319 que la use en su
      // `description` de nivel de ítem (por eso T1 no la limpiaba), pero varias aptitudes sí: se
      // queda solo la etiqueta legible, igual que `@UUID` — la fórmula en sí nunca llega al
      // catálogo (ninguna `@` sobrevive, constraints.md), y con o sin etiqueta el texto sigue
      // siendo prosa, no una `Actividad`.
      .replace(/\[\[\/(?:r|roll|gmroll|blindroll)\s+[^\]]*\]\]\{([^}]*)\}/gi, "$1")
      .replace(/\[\[\/(?:r|roll|gmroll|blindroll)\s+[^\]]*\]\]/gi, "")
      .replace(/&nbsp;/g, " ")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
