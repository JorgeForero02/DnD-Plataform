import { convertirActividades, repartirRechazos } from "./actividad.mjs";
import { origenDe } from "./origen.mjs";
import { textoDeAptitud } from "./srd-es.mjs";
import { limpiarProsa, claveDeNombre } from "./prosa.mjs";

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
 * La característica de lanzamiento de las ocho clases que lanzan (SRD 5.1) — la misma tabla que
 * `classes.ts` declara como `spellcastingAbility`, repetida aquí porque el conversor no puede
 * importar `apps/api` (ola de arreglos, I6). Solo sirve para decidir si el `dc.calculation` de
 * una aptitud (`"wis"`, `"cha"`, `"con"`) ES la CD de lanzador de su clase (entonces
 * `cdDeConjuro`) o una CD de característica que `Origen` no sabe expresar (entonces texto).
 */
const CARACTERISTICA_DE_LANZAMIENTO = {
  bard: "cha",
  cleric: "wis",
  druid: "wis",
  paladin: "cha",
  ranger: "wis",
  sorcerer: "cha",
  warlock: "cha",
  wizard: "int",
};

/**
 * `requirements` de una aptitud (p. ej. `"Fighter 5"`, o `"Fighter 1, Champion 10, Ranger 2"`
 * para un estilo de combate compartido) es el dato MÁS fiable que trae Foundry para saber a
 * quién pertenece y en qué nivel — más que la posición en la tabla del SRD español, que no
 * distingue una aptitud compartida entre varias clases. Se toma el PRIMER propietario listado
 * como el "dueño primario" (metadato informativo del catálogo); el resto de propietarios llega
 * igual a su texto porque el emparejamiento real (para `enriquecerClases`) es por clave, no por
 * esta cadena.
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
 * Característica, el Ataque adicional que reutilizan cuatro clases, los seis estilos de combate).
 */
function propietarioDeRuta(ruta, subclasesPorCarpeta) {
  const partes = ruta.split(/[\\/]/);
  const i = partes.indexOf("classfeatures");
  const classFolder = partes[i + 1];
  const subFolder = partes[i + 2];
  if (classFolder === "shared-features") return { owner: null, compartida: true };
  // Un fichero en la raíz de `classfeatures/` (hoy solo `grappler.yml`, una dote): compartido
  // y además marcado como dote, ver `convertirAptitudes`.
  if (subFolder === undefined) return { owner: null, compartida: true, esDote: true };
  const subSlug = subFolder.replace(/-features$/, "");
  if (subSlug === classFolder) return { owner: classFolder, compartida: false };
  const subclaveNormalizada = subclasesPorCarpeta.get(subSlug);
  if (subclaveNormalizada)
    return { owner: `${classFolder}/${subclaveNormalizada}`, compartida: false };
  return { owner: classFolder, compartida: false };
}

/**
 * `usos` de un `ClassFeature.grant` (E-3A1-5), desde `doc.system.uses`. Devuelve `{ usos }`,
 * `{}` si el ítem no declara usos, o `{ rechazo }` cuando `uses.max` es una fórmula que no cabe
 * en `Origen` — medido (ola de arreglos, I2): `max(1, @abilities.cha.mod)` (Inspiración Bárdica,
 * Toque Purificador), `1 + @abilities.cha.mod` (Sentidos Divinos), `5 * @classes.paladin.levels`
 * (Imponer las Manos). Ninguna es una de las nueve formas cerradas y `Origen` no suma ni
 * multiplica: el rasgo se queda sin `usos` y el informe lo dice — antes se devolvía `undefined`
 * en silencio. Un `recovery.period` desconocido también se rechaza en voz alta.
 */
function usosDe(uses) {
  const maxCrudo = uses?.max;
  if (maxCrudo === undefined || maxCrudo === null || maxCrudo === "") return {};
  let max;
  if (/^\d+$/.test(String(maxCrudo).trim())) {
    max = { tipo: "fijo", valor: Number.parseInt(maxCrudo, 10) };
  } else {
    const r = origenDe(maxCrudo);
    if (r.rechazo) return { rechazo: `uses.max = '${maxCrudo}': ${r.rechazo}` };
    max = r.origen;
  }
  const periodo = uses.recovery?.[0]?.period;
  const resetOn = periodo === "sr" ? "SHORT_REST" : periodo === "lr" ? "LONG_REST" : undefined;
  if (!resetOn) {
    return {
      rechazo: `uses.recovery[0].period = '${periodo}': solo 'sr' y 'lr' tienen un ResourceReset.`,
    };
  }
  return { usos: { max, resetOn } };
}

/**
 * `convertirAptitudes({ featuresFoundry, subclases, emparejamientos, cortesEs, concesiones })` —
 * pura. Devuelve `{ features: SrdFeature[], rechazos }`. `cortesEs` es el resultado de
 * `cortarAptitudesEs` (T3b, `srd-es.mjs`) — opcional para no romper llamadas antiguas en pruebas
 * unitarias que no lo necesitan; sin él, `textEs` se queda en `null` como antes de esta tanda.
 * `concesiones` es el resultado de `leerConcesionesDeClase` (`foundry.mjs`, I10), opcional por
 * la misma razón: sin él, un fichero de `shared-features/` sin `requirements` se rechaza.
 */
export function convertirAptitudes({
  featuresFoundry,
  subclases,
  emparejamientos,
  cortesEs,
  concesiones,
}) {
  // `s.key` normalizada a la clave de `classes.ts` (`IDENTIFICADOR_DE_SUBCLASE_A_CLAVE` para las
  // cuatro que no coinciden con el `identifier` de Foundry, igual en el resto).
  const subclasesNormalizadas = subclases.map((s) => ({
    ...s,
    key: IDENTIFICADOR_DE_SUBCLASE_A_CLAVE[s.key] ?? s.key,
  }));
  // Por el IDENTIFICADOR CRUDO de Foundry (el que nombra la carpeta `<identifier>-features/`) —
  // usado solo por `propietarioDeRuta`, a diferencia de `subclasesPorNombreEn` que ya trabaja
  // con la clave normalizada de `classes.ts`.
  const subclasesPorCarpeta = new Map(
    subclases.map((s) => [s.key, IDENTIFICADOR_DE_SUBCLASE_A_CLAVE[s.key] ?? s.key]),
  );
  const subclasesPorNombreEn = new Map(subclasesNormalizadas.map((s) => [s.name, s]));

  const nombresDeAptitud = emparejamientos?.aptitudesDeClase ?? {};
  // T3b (E-3A1, «traducción propia, marcada»): último recurso, solo para lo que el SRD español
  // de verdad no nombra (ver el comentario de `traduccionesPropias` en `emparejamientos.json`).
  const traduccionesPropias = emparejamientos?.traduccionesPropias ?? {};

  // I13: `identifier` de Foundry → clave del catálogo (la del nombre), para que un consumo
  // `feat:<identifier>` (Canalizar Divinidad, Inspiración Bárdica) apunte a la clave buena.
  const claveDeIdentificador = new Map(
    featuresFoundry.map((entry) => [entry.key, claveDeNombre(entry.name)]),
  );

  const rechazos = {
    sinTraduccion: [],
    fueraDeAPorAutor: [],
    huecos: [],
    usosRechazados: [],
    sinTextoEs: [],
  };
  const features = [];

  for (const entry of featuresFoundry) {
    const { doc, key: identifier, name: nameEn, ruta } = entry;
    const key = claveDeNombre(nameEn);
    const requirements = doc.system.requirements ?? "";
    const dueño = primerPropietario(requirements);

    let classKey;
    let subclassKey;
    let level;
    let compartidaPor;
    if (dueño && CLASE_EN_A_CLAVE[dueño.nombre]) {
      classKey = CLASE_EN_A_CLAVE[dueño.nombre];
      level = dueño.nivel;
    } else if (dueño && subclasesPorNombreEn.has(dueño.nombre)) {
      const sub = subclasesPorNombreEn.get(dueño.nombre);
      classKey = sub.classKey;
      subclassKey = sub.key;
      level = dueño.nivel;
    } else {
      // Sin `requirements` resoluble: los dos genéricos de `shared-features` sin dueño propio
      // (Mejora de Característica, Ataque Adicional). Ola de arreglos (I10): ya no se inventa
      // «fighter, nivel 1» — la clase es `shared` y las clases que de verdad lo conceden, con su
      // nivel, salen del `advancement` de `classes/*.yml` (`leerConcesionesDeClase`). Sin ese
      // dato el conversor falla: un dato inventado es peor que un conversor parado.
      const porRuta = propietarioDeRuta(ruta, subclasesPorCarpeta);
      if (!porRuta.compartida) {
        throw new Error(
          `${identifier} (${ruta}): sin requirements resoluble y fuera de shared-features — no hay clase que atribuirle.`,
        );
      }
      if (porRuta.esDote) {
        // `classfeatures/grappler.yml`, en la RAÍZ de la carpeta: es la dote Luchador (un FEAT
        // del SRD 5.1, `requirements: STR 13 or higher`), no una aptitud de clase. Entra porque
        // cuenta entre los 234 `type: feat` (constraints.md), con `class: "feat"` y el nivel
        // mínimo del esquema — una dote no tiene nivel de clase; antes era «fighter, nivel 1».
        classKey = "feat";
        level = 1;
      } else {
        compartidaPor =
          key === "ability-score-improvement"
            ? concesiones?.mejoraDeCaracteristica
            : concesiones?.porId.get(doc._id);
        if (!compartidaPor || compartidaPor.length === 0) {
          throw new Error(
            `${identifier} (shared-features): ninguna clase lo concede en classes/*.yml — sin clase ni nivel que declarar.`,
          );
        }
        compartidaPor = [...compartidaPor].sort(
          (a, b) => a.class.localeCompare(b.class) || a.level - b.level,
        );
        classKey = "shared";
        level = Math.min(...compartidaPor.map((c) => c.level));
      }
    }

    const owner = subclassKey ? `${classKey}/${subclassKey}` : classKey;

    let nameEs = nombresDeAptitud[`${owner}:${key}`] ?? null;
    if (!nameEs && !subclassKey) {
      // Último intento: la clave desnuda bajo "shared" (los estilos de combate, que sí traen
      // `requirements` —«Fighter 1, Paladin 2, Ranger 2»— y por eso llegan aquí con dueño
      // primario `fighter`, pero cuyo nombre la tabla guarda una sola vez).
      nameEs = nombresDeAptitud[`shared:${key}`] ?? null;
    }
    // T3b: traducción propia, marcada (E-3A1) — solo cuando el SRD español no nombra el ítem.
    let traduccionPropia = false;
    if (!nameEs) {
      const propia = traduccionesPropias[`${owner}:${key}`] ?? traduccionesPropias[`shared:${key}`];
      if (propia) {
        nameEs = propia;
        traduccionPropia = true;
      }
    }
    const sinTraduccion = !nameEs;
    if (sinTraduccion) rechazos.sinTraduccion.push(`${owner}:${key}`);

    // T3b: prosa española de la aptitud, buscada por su nombre ya resuelto dentro de la sección
    // de `classKey` (con `global` como respaldo para las de `shared-features`). `null` cuando no
    // hay nombre (sin nada que buscar) o cuando el nombre no se encontró en el texto cortado —
    // nunca inventada; el fallo se cuenta abajo, en `rechazos.sinTextoEs`. Desde la ola de
    // arreglos (I3) `nameEs` ES el nombre del SRD, así que se busca tal cual, sin alias.
    const textEs =
      !traduccionPropia && cortesEs ? (textoDeAptitud(cortesEs, classKey, nameEs) ?? null) : null;
    if (nameEs && !traduccionPropia && !textEs) {
      rechazos.sinTextoEs.push(`${owner}:${key} -> ${nameEs}`);
    }

    const textEnPlano = limpiarProsa(doc.system.description?.value) || "(sin texto)";

    const ctxComun = {
      recurso: key,
      itemLevel: undefined,
      esCantrip: false,
      // I11: la `description` de la actividad va en español cuando hay prosa española; el
      // inglés solo cuando no la hay (mismo criterio que los conjuros).
      descripcionEs: textEs ?? textEnPlano,
      claveConocida: key,
      claveDeIdentificador,
      spellcastingAbility: CARACTERISTICA_DE_LANZAMIENTO[classKey],
    };
    const { actividades, fueraDeA, rechazosDeItem } = convertirActividades(
      doc,
      ctxComun,
      `${owner}:${key}`,
    );
    repartirRechazos(rechazosDeItem, rechazos);

    const usos = usosDe(doc.system.uses);
    if (usos.rechazo) rechazos.usosRechazados.push(`${owner}:${key}: ${usos.rechazo}`);

    features.push({
      key,
      ...(identifier !== key && { foundryIdentifier: identifier }),
      class: classKey,
      ...(subclassKey && { subclass: subclassKey }),
      level,
      ...(compartidaPor && { compartidaPor }),
      nameEn,
      nameEs,
      sinTraduccion,
      traduccionPropia,
      textEn: textEnPlano,
      // T3b: prosa española cortada de `srd-5.1-es.txt` por nombre (`cortarAptitudesEs`,
      // `srd-es.mjs`) — `null` cuando no hay nombre, la traducción es propia (sin prosa oficial
      // que buscar) o el corte no la encontró (contado en `rechazos.sinTextoEs`).
      textEs,
      ...(usos.usos && { usos: usos.usos }),
      actividades,
      fueraDeA,
      efectosPasivos: (doc.effects ?? []).length,
    });
  }

  return { features, rechazos };
}
