import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  leerFoundry,
  leerSubclases,
  leerEscalasDeClase,
  leerConcesionesDeClase,
} from "./foundry.mjs";
import { cortarSrdEs, cortarAptitudesEs } from "./srd-es.mjs";
import { emparejar } from "./huella.mjs";
import { convertirActividades, repartirRechazos } from "./actividad.mjs";
import { convertirAptitudes } from "./aptitudes.mjs";
import { convertirRazas } from "./razas.mjs";
import { limpiarProsa, separarNivelesSuperiores, claveDeNombre } from "./prosa.mjs";

// Tarea 3A.1 (T1) — junta los módulos puros anteriores en el pipeline completo: lee Foundry,
// corta el SRD español, empareja por huella, traduce cada actividad, y escribe el catálogo
// generado (o lo compara, en `--check`). **`apps/api/src/rules/catalog/generado/*.json` +
// `rechazos.md` llevan cabecera «GENERADO — no editar»** (constraints.md).

// La limpieza de la prosa HTML (E-3A1-7) vive en `prosa.mjs` desde la ola de arreglos (I8): una
// sola copia para conjuros, aptitudes y razas.

// E-3A1-3: las listas de conjuros por clase salen del SRD español («Conjuros de <clase>», por
// nivel), no de Foundry. El nombre de clase que usa esa cabecera (minúscula, singular) se traduce
// aquí a la clave de `SRD_CLASSES` (`apps/api/src/rules/catalog/classes.ts`) — las ocho clases
// con lanzamiento de conjuros del SRD 5.1; bárbaro, guerrero (salvo su subclase Caballero
// arcano, fuera de esta tanda), monje y pícaro no tienen lista propia.
const CLASE_ES_A_CLAVE = {
  bardo: "bard",
  brujo: "warlock",
  clérigo: "cleric",
  druida: "druid",
  explorador: "ranger",
  hechicero: "sorcerer",
  mago: "wizard",
  paladín: "paladin",
};

/**
 * `classesDe(nameEs, listasPorClase)` — las claves de `SRD_CLASSES` en cuyo listado por nivel
 * aparece `nameEs` tal cual. Un conjuro sin traducción (`nameEs === null`) no puede casar contra
 * ninguna lista española: queda `[]` y lo cuenta el informe de rechazos (`sinTraduccion`), nunca
 * en silencio.
 */
function classesDe(nameEs, listasPorClase) {
  if (!nameEs) return [];
  const claves = [];
  for (const [nombreEs, clave] of Object.entries(CLASE_ES_A_CLAVE)) {
    const lista = listasPorClase.get(nombreEs);
    if (!lista) continue;
    for (const nombres of lista.porNivel.values()) {
      if (nombres.includes(nameEs)) {
        claves.push(clave);
        break;
      }
    }
  }
  return claves;
}

const CABECERA_GENERADO =
  "// GENERADO por scripts/convertir-catalogo.mjs — no editar a mano. Cualquier cambio se hace en el conversor y se regenera.\n";

// -------------------------------------------------------------------------------------------
// Parseo de prosa española (Tiempo de lanzamiento / Alcance / Componentes / Duración) — la
// frontera final entre "texto libre del SRD" y "campo estructurado del catálogo". Nunca evalúa
// una fórmula: son patrones fijos sobre un vocabulario cerrado de palabras del SRD español.

function activacionEsDe(texto) {
  if (!texto) return undefined;
  const t = texto.trim();
  if (/^1 acci[oó]n adicional/i.test(t)) return { coste: "BONUS" };
  if (/^1 reacci[oó]n/i.test(t)) {
    const condicion = t.replace(/^1 reacci[oó]n,?\s*/i, "").trim();
    return { coste: "REACTION", ...(condicion && { condicion }) };
  }
  if (/^1 acci[oó]n/i.test(t)) return { coste: "ACTION" };
  const minutos = t.match(/^(\d+)\s*minutos?$/i);
  if (minutos) return { tiempo: { valor: Number.parseInt(minutos[1], 10), unidad: "minuto" } };
  const horas = t.match(/^(\d+)\s*horas?$/i);
  if (horas) return { tiempo: { valor: Number.parseInt(horas[1], 10), unidad: "hora" } };
  return { coste: "ACTION" };
}

function rangoEsDe(texto) {
  if (!texto) return undefined;
  const t = texto.trim();
  // "Personal" y "Lanzador" (el SRD español usa las dos para alcance sobre uno mismo, con o sin
  // el área entre paréntesis: «Lanzador (cono de 4,5 m)») son `personal`, que `rangoSchema` ya
  // tiene — hasta la ola de arreglos (I4) se devolvía `undefined` y el llamador lo convertía en
  // «especial», 68 conjuros (Escudo, Manos ardientes, Rociada prismática…).
  if (/^personal/i.test(t) || /^lanzador/i.test(t)) return { unidad: "personal" };
  if (/^toque/i.test(t)) return { unidad: "toque" };
  if (/^ilimitado/i.test(t)) return { unidad: "ilimitado" };
  // «1,5 km» / «750 km»: el SRD español redondea la milla (5280 pies) a 1,5 km — se deshace la
  // conversión por millas, no por metros, para que Clarividencia dé los 5280 pies de Foundry.
  const km = t.match(/^([\d.,]+)\s*km\b/i);
  if (km) {
    const millas = Math.round(Number.parseFloat(km[1].replace(",", ".")) / 1.5);
    return { unidad: "pies", distanciaFt: millas * 5280 };
  }
  const metros = t.match(/^([\d.,]+)\s*m\b/i);
  if (metros) {
    const m = Number.parseFloat(metros[1].replace(",", "."));
    return { unidad: "pies", distanciaFt: Math.round(m / 0.3) };
  }
  return { unidad: "especial" };
}

function componentesEsDe(texto) {
  const out = { v: false, s: false, m: false };
  if (!texto) return out;
  out.v = /\bV\b/.test(texto);
  out.s = /\bS\b/.test(texto);
  const material = texto.match(/\bM\s*\(([^)]+)\)/);
  out.m = /\bM\b/.test(texto);
  if (material) out.materialesTexto = material[1].trim();
  return out;
}

function duracionEsDe(texto) {
  if (!texto) return undefined;
  const t = texto.trim();
  // "Instantánea" (conjuro) e "Instantáneo" (efecto): el SRD español usa las dos formas de
  // género según la frase — se aceptan ambas.
  if (/^instant[aá]ne[oa]/i.test(t)) return { unidad: "instantanea", concentracion: false };
  // «Hasta que sea disipado» (10) y «Hasta que sea disipado o se active» (2) — el mismo
  // `hastaQueSeDisipe` que `duracionSchema` ya recoge para `disp`/`dstr` de Foundry (I4: antes
  // solo casaba «hasta que se disipe», que el SRD español no usa nunca, y caían en «especial»).
  if (/^hasta que (se disipe|sea disipad[oa])/i.test(t)) {
    return { unidad: "hastaQueSeDisipe", concentracion: false };
  }
  const concentracion = /^concentraci[oó]n/i.test(t);
  // «1 asalto» (9) y «Concentración, hasta 1 asalto» (1): `asalto` existe en el esquema (I4).
  const asaltos = t.match(/(\d+)\s*asaltos?/i);
  if (asaltos) return { unidad: "asalto", valor: Number.parseInt(asaltos[1], 10), concentracion };
  const minutos = t.match(/(\d+)\s*minutos?/i);
  const horas = t.match(/(\d+)\s*horas?/i);
  const dias = t.match(/(\d+)\s*d[ií]as?/i);
  if (minutos) return { unidad: "minuto", valor: Number.parseInt(minutos[1], 10), concentracion };
  if (horas) return { unidad: "hora", valor: Number.parseInt(horas[1], 10), concentracion };
  if (dias) return { unidad: "dia", valor: Number.parseInt(dias[1], 10), concentracion };
  return { unidad: "especial", concentracion };
}

// -------------------------------------------------------------------------------------------
// Huella, a partir de un `doc` de Foundry o de un `campos` ya cortado del SRD español.

function huellaDesdeFoundry(doc) {
  const sys = doc.system;
  const props = sys.properties ?? [];
  return {
    level: sys.level,
    school: sys.school,
    rangeUnit: sys.range?.units,
    rangeValue: Number.parseInt(sys.range?.value ?? "0", 10) || 0,
    v: props.includes("vocal"),
    s: props.includes("somatic"),
    m: props.includes("material"),
    durationUnit: sys.duration?.units === "inst" ? "instantanea" : sys.duration?.units,
    durationValue: sys.duration?.value,
    concentration: props.includes("concentration"),
    ritual: props.includes("ritual"),
  };
}

// La huella compara las dos fuentes con el MISMO vocabulario de unidades — el de Foundry, que
// es el que `huellaDesdeFoundry` ya usa tal cual. `rangoEsDe`/`duracionEsDe` devuelven las
// unidades del catálogo (español, `"toque"`/`"pies"`…); aquí se traducen de vuelta solo para
// comparar huellas, nunca para el catálogo final.
const UNIDAD_DE_RANGO_A_FOUNDRY = {
  toque: "touch",
  personal: "self",
  ilimitado: "any",
  especial: "spec",
  pies: "ft",
};
const UNIDAD_DE_DURACION_A_FOUNDRY = {
  hastaQueSeDisipe: "disp",
  especial: "spec",
  minuto: "minute",
  hora: "hour",
  dia: "day",
  asalto: "round",
  instantanea: "instantanea",
};

function huellaDesdeSrdEs(conjuro) {
  const alcanceCrudo = conjuro.camposCrudos["Alcance:"] ?? "";
  const rango = rangoEsDe(alcanceCrudo);
  // Un alcance en km es una milla de Foundry (`mi`): la huella compara la UNIDAD, no los pies
  // reconstruidos, así que aquí se dice `mi` para que la huella siga casando (I4).
  const esEnKm = /^[\d.,]+\s*km\b/i.test(alcanceCrudo.trim());
  const duracion = duracionEsDe(conjuro.camposCrudos["Duración:"]);
  const componentes = componentesEsDe(conjuro.camposCrudos["Componentes:"]);
  return {
    level: conjuro.level,
    school: conjuro.school,
    rangeUnit: esEnKm ? "mi" : rango ? (UNIDAD_DE_RANGO_A_FOUNDRY[rango.unidad] ?? "") : "self",
    rangeValue: esEnKm ? 0 : (rango?.distanciaFt ?? 0),
    v: componentes.v,
    s: componentes.s,
    m: componentes.m,
    durationUnit: duracion
      ? (UNIDAD_DE_DURACION_A_FOUNDRY[duracion.unidad] ?? duracion.unidad)
      : "",
    durationValue: duracion?.valor,
    concentration: Boolean(duracion?.concentracion),
    ritual: conjuro.ritual,
  };
}

/**
 * `convertir({ foundryDir, srdEsTxt, emparejamientos })` — el pipeline entero, puro respecto al
 * disco de salida (solo lee). Devuelve `{ spells, features, rechazos, conteos }`.
 */
export function convertir({ foundryDir, srdEsTxt, emparejamientos }) {
  const {
    spells: spellsFoundry,
    features: featuresFoundry,
    folders,
    rechazados,
  } = leerFoundry(foundryDir);
  const { conjuros: conjurosEs, listasPorClase } = cortarSrdEs(srdEsTxt);
  // T3b — la prosa española de aptitudes de clase/subclase y rasgos de raza, cortada UNA vez
  // (misma disciplina que `cortarSrdEs` arriba) y reutilizada por las dos conversiones de abajo.
  const cortesEs = cortarAptitudesEs(srdEsTxt);

  const spellsEnHuella = new Map(spellsFoundry.map((s) => [s.key, huellaDesdeFoundry(s.doc)]));
  const conjurosEsHuella = new Map(
    [...conjurosEs.entries()].map(([nombre, c]) => [nombre, huellaDesdeSrdEs(c)]),
  );
  const { pares, choques, sinPareja } = emparejar(
    spellsEnHuella,
    conjurosEsHuella,
    emparejamientos?.conjuros ?? {},
  );

  const rechazos = {
    edicion2024: [],
    sinTraduccion: [],
    // C5 — dos tablas: tipos fuera de A por decisión de autor, y huecos del esquema / fórmulas
    // rechazadas, cada línea con su motivo.
    fueraDeAPorAutor: [],
    huecos: [],
  };
  for (const r of rechazados) rechazos.edicion2024.push(r);

  const spells = [];
  for (const s of spellsFoundry) {
    const nombreEs = pares.get(s.key);
    const conjuroEs = nombreEs ? conjurosEs.get(nombreEs) : undefined;
    const sinTraduccion = !conjuroEs;
    if (sinTraduccion) rechazos.sinTraduccion.push(s.key);

    const sys = s.doc.system;
    const key = claveDeNombre(s.name);
    const componentes = conjuroEs ? componentesEsDe(conjuroEs.camposCrudos["Componentes:"]) : {};
    // I8: «At Higher Levels.» va aparte (`higherLevelsEn`), como ya hacía el español.
    const { textEn: textEnPlano, higherLevelsEn } = separarNivelesSuperiores(
      limpiarProsa(sys.description?.value) || "(sin texto)",
    );
    const castingTimeEs = activacionEsDe(conjuroEs?.camposCrudos["Tiempo de lanzamiento:"]);
    const ctxComun = {
      recurso: key,
      // C1: el bloque de ÍTEM, al que vuelve toda actividad con `override: false`.
      itemActivation: sys.activation,
      // La condición de la reacción («que llevas a cabo cuando…») sale del SRD español, del
      // mismo campo que ya alimenta `castingTime`.
      condicionEs: castingTimeEs?.condicion,
      itemRange: sys.range,
      itemDuration: sys.duration?.units === "inst" ? { units: "inst" } : sys.duration,
      itemConcentration: (sys.properties ?? []).includes("concentration"),
      itemMaterials: sys.materials,
      itemLevel: sys.level,
      esCantrip: sys.level === 0,
      // Sin traducción española (`sinTraduccion`): la actividad se importa igual, con el texto
      // inglés — nunca vacía, o `actividadTieneMecanicaOTexto` la rechazaría por no tener ni
      // mecánica propia (una `utilidad` pura) ni descripción.
      descripcionEs: conjuroEs?.textoEs ?? textEnPlano,
      higherLevelsEs: conjuroEs?.higherLevelsEs,
      materialesTextoEs: componentes.materialesTexto,
    };
    const { actividades, fueraDeA, rechazosDeItem } = convertirActividades(s.doc, ctxComun, key);
    repartirRechazos(rechazosDeItem, rechazos);

    spells.push({
      key,
      // I13: `key` sale del nombre (2014); el `identifier` de Foundry (a veces el de 2024:
      // `befuddlement` para Feeblemind) se conserva aparte solo cuando difiere, por trazabilidad.
      ...(s.key !== key && { foundryIdentifier: s.key }),
      nameEn: s.name,
      nameEs: conjuroEs?.nameEs ?? null,
      sinTraduccion,
      level: sys.level,
      school: sys.school,
      castingTime: castingTimeEs ?? { coste: "ACTION" },
      range: rangoEsDe(conjuroEs?.camposCrudos["Alcance:"]) ?? { unidad: "especial" },
      components: {
        v: Boolean(sys.properties?.includes("vocal")),
        s: Boolean(sys.properties?.includes("somatic")),
        m: Boolean(sys.properties?.includes("material")),
      },
      duration: duracionEsDe(conjuroEs?.camposCrudos["Duración:"]) ?? {
        unidad: "instantanea",
        concentracion: false,
      },
      ritual: Boolean(sys.properties?.includes("ritual")),
      concentration: Boolean(sys.properties?.includes("concentration")),
      // I9: sin recortes — el tope lo pone el esquema Zod y, si no cabe, el CLI falla en voz alta.
      textEn: textEnPlano,
      textEs: conjuroEs?.textoEs ? conjuroEs.textoEs : null,
      ...(higherLevelsEn && { higherLevelsEn }),
      ...(conjuroEs?.higherLevelsEs && { higherLevelsEs: conjuroEs.higherLevelsEs }),
      classes: classesDe(conjuroEs?.nameEs ?? null, listasPorClase),
      actividades,
      fueraDeA,
      efectosPasivos: (s.doc.effects ?? []).length,
    });
  }

  const conteos = {
    conjurosFoundry: spellsFoundry.length,
    aptitudesFoundry: featuresFoundry.length,
    carpetas: folders,
    rechazadosPorEdicion: rechazos.edicion2024.length,
    emparejadosAutomaticamente: pares.size - Object.keys(emparejamientos?.conjuros ?? {}).length,
    emparejadosAMano: Object.keys(emparejamientos?.conjuros ?? {}).length,
    choques: choques.length,
    sinPareja: sinPareja.length,
    sinTraduccion: rechazos.sinTraduccion.length,
    conjurosFueraDeAPorAutor: rechazos.fueraDeAPorAutor.length,
    conjurosConHuecoDeEsquema: rechazos.huecos.length,
  };

  if (choques.length > 0) {
    throw new Error(
      `${choques.length} choque(s) de huella sin resolver en emparejamientos.json — E-3A1-1 exige la tabla completa:\n` +
        choques.map((c) => `  ${c.claveIngles}: ${JSON.stringify(c)}`).join("\n"),
    );
  }

  // Tarea 3A.1 (T3) — las aptitudes (234, `featuresFoundry` ya las trae `leerFoundry`) y las
  // subclases (12, `leerSubclases` — no son `type: feat`, `leerFoundry` las rechaza a propósito
  // y por eso se leen aparte, ver `foundry.mjs`).
  const { subclases } = leerSubclases(foundryDir);
  const { features: aptitudes, rechazos: rechazosAptitudes } = convertirAptitudes({
    featuresFoundry,
    subclases,
    emparejamientos,
    cortesEs,
    concesiones: leerConcesionesDeClase(foundryDir),
  });
  const { features: rasgosDeRaza, rechazos: rechazosRazas } = convertirRazas({
    foundryDir,
    emparejamientos,
    cortesEs,
  });
  const escalas = leerEscalasDeClase(foundryDir);

  const aptitudesConNombre = aptitudes.filter((f) => f.nameEs);
  const razasConNombre = rasgosDeRaza.filter((f) => f.nameEs);
  const conteosAptitudes = {
    aptitudesGeneradas: aptitudes.length,
    subclases: subclases.length,
    aptitudesSinNombreEspañol: rechazosAptitudes.sinTraduccion.length,
    aptitudesFueraDeAPorAutor: rechazosAptitudes.fueraDeAPorAutor.length,
    aptitudesConHuecoDeEsquema: rechazosAptitudes.huecos.length,
    aptitudesConUsosRechazados: rechazosAptitudes.usosRechazados.length,
    // T3b — cobertura de `textEs` entre las aptitudes CON nombre (una sin nombre no puede
    // buscarse por nombre; su ausencia ya se cuenta arriba, no se duplica aquí).
    aptitudesConTraduccionPropia: aptitudes.filter((f) => f.traduccionPropia).length,
    aptitudesConTextoEs: aptitudesConNombre.filter((f) => f.textEs).length,
    aptitudesSinTextoEs: rechazosAptitudes.sinTextoEs.length,
  };
  const conteosRazas = {
    rasgosDeRaza: rasgosDeRaza.length,
    razasFueraDeAPorAutor: rechazosRazas.fueraDeAPorAutor.length,
    razasConHuecoDeEsquema: rechazosRazas.huecos.length,
    razasSinNombreEspañol: rechazosRazas.sinTraduccion.length,
    razasConTraduccionPropia: rasgosDeRaza.filter((f) => f.traduccionPropia).length,
    razasConTextoEs: razasConNombre.filter((f) => f.textEs).length,
    razasSinTextoEs: rechazosRazas.sinTextoEs.length,
  };

  return {
    spells,
    features: aptitudes,
    razas: rasgosDeRaza,
    escalas,
    rechazos: { ...rechazos, aptitudes: rechazosAptitudes, razas: rechazosRazas },
    conteos: {
      ...conteos,
      ...conteosAptitudes,
      ...conteosRazas,
      clasesConEscalas: Object.keys(escalas).length,
    },
    sinPareja,
  };
}

function rechazosMd({ rechazos, conteos, sinPareja }) {
  const filas = (lista) =>
    lista.length === 0 ? "_ninguno_\n" : lista.map((x) => `- ${x}\n`).join("");
  return (
    `${CABECERA_GENERADO}\n# Rechazos del conversor\n\n` +
    `## Rechazados al leer Foundry (edición 2024, o type distinto de spell/feat)\n\n${filas(rechazos.edicion2024.map((r) => `${r.identifier}: ${r.motivo}`))}\n` +
    `## Sin traducción al español (conjuros)\n\n${filas(rechazos.sinTraduccion)}\n` +
    `## Conjuros — actividad fuera de A por decisión de autor (tipo)\n\n${filas(rechazos.fueraDeAPorAutor)}\n` +
    `## Conjuros — hueco de esquema o fórmula rechazada (motivo)\n\n${filas(rechazos.huecos)}\n` +
    `## Sin huella hermana (huella sin pareja, T1 revisó a mano)\n\n${filas(sinPareja)}\n` +
    `## Aptitudes de clase — sin nombre español\n\n${filas(rechazos.aptitudes?.sinTraduccion ?? [])}\n` +
    `## Aptitudes de clase — actividad fuera de A por decisión de autor (tipo)\n\n${filas(rechazos.aptitudes?.fueraDeAPorAutor ?? [])}\n` +
    `## Aptitudes de clase — hueco de esquema o fórmula rechazada (motivo)\n\n${filas(rechazos.aptitudes?.huecos ?? [])}\n` +
    `## Aptitudes de clase — usos descartados (uses.max que no cabe en Origen; el rasgo se queda sin \`usos\`)\n\n${filas(rechazos.aptitudes?.usosRechazados ?? [])}\n` +
    `## Aptitudes de clase — con nombre pero sin texto en español (T3b, corte por nombre sin coincidencia)\n\n${filas(rechazos.aptitudes?.sinTextoEs ?? [])}\n` +
    `## Rasgos de raza — sin nombre español\n\n${filas(rechazos.razas?.sinTraduccion ?? [])}\n` +
    `## Rasgos de raza — no es una aptitud (subraza en sí, u otro tipo)\n\n${filas(rechazos.razas?.noEsAptitud ?? [])}\n` +
    `## Rasgos de raza — actividad fuera de A por decisión de autor (tipo)\n\n${filas(rechazos.razas?.fueraDeAPorAutor ?? [])}\n` +
    `## Rasgos de raza — hueco de esquema o fórmula rechazada (motivo)\n\n${filas(rechazos.razas?.huecos ?? [])}\n` +
    `## Rasgos de raza — con nombre pero sin texto en español (T3b, corte por nombre sin coincidencia)\n\n${filas(rechazos.razas?.sinTextoEs ?? [])}\n` +
    `## Conteos\n\n` +
    Object.entries(conteos)
      .map(([k, v]) => `- ${k}: ${v}\n`)
      .join("")
  );
}

/** Copia un objeto de dos niveles (`{ clase: { clave: ScaleStep[] } }`) con las claves de ambos
 * niveles ordenadas — un diff determinista, sin el efecto secundario de filtrar niveles internos
 * que tiene pasar un ARRAY como segundo argumento de `JSON.stringify` (solo filtra/ordena el
 * nivel raíz, no los anidados: usarlo aquí vaciaba cada clase a `{}`). */
function ordenarClaves(porClase) {
  const salida = {};
  for (const clase of Object.keys(porClase).sort()) {
    salida[clase] = {};
    for (const clave of Object.keys(porClase[clase]).sort())
      salida[clase][clave] = porClase[clase][clave];
  }
  return salida;
}

/**
 * Los seis ficheros que el conversor escribe, con su contenido exacto — UNA sola definición
 * para `escribir` y para `comprobar` (ola de arreglos, I7): antes `comprobar` solo exigía
 * `spells-srd.json`, comparaba tres más «si existían» y nunca miraba `rechazos.md` ni el
 * `.meta.json`, así que borrar `class-features-srd.json` pasaba `--check`.
 *
 * Un JSON no admite comentarios: la marca «GENERADO — no editar» va en el fichero hermano
 * `spells-srd.meta.json` y en la cabecera Markdown de `rechazos.md`, que sí es texto libre —
 * los cuatro `.json` de datos NO llevan cabecera (05-datos y NOTICE lo dicen así desde I12).
 */
function ficherosGenerados(resultado) {
  return {
    "spells-srd.json": JSON.stringify(
      [...resultado.spells].sort((a, b) => a.key.localeCompare(b.key)),
      null,
      2,
    ),
    "class-features-srd.json": JSON.stringify(
      [...resultado.features].sort(
        (a, b) => a.class.localeCompare(b.class) || a.level - b.level || a.key.localeCompare(b.key),
      ),
      null,
      2,
    ),
    "race-features-srd.json": JSON.stringify(
      [...resultado.razas].sort(
        (a, b) => a.race.localeCompare(b.race) || a.key.localeCompare(b.key),
      ),
      null,
      2,
    ),
    "class-scales-srd.json": JSON.stringify(ordenarClaves(resultado.escalas), null, 2),
    "spells-srd.meta.json": JSON.stringify(
      { generadoPor: "scripts/convertir-catalogo.mjs", noEditar: true },
      null,
      2,
    ),
    "rechazos.md": rechazosMd(resultado),
  };
}

/** Escribe el catálogo generado en `outDir`. Sobrescribe sin preguntar — es contenido derivado. */
export function escribir(outDir, resultado) {
  mkdirSync(outDir, { recursive: true });
  for (const [nombre, contenido] of Object.entries(ficherosGenerados(resultado))) {
    writeFileSync(join(outDir, nombre), contenido, "utf8");
  }
}

/** `--check`: regenera en memoria y compara byte a byte los seis ficheros con lo commiteado. */
export function comprobar(outDir, resultado) {
  for (const [nombre, esperado] of Object.entries(ficherosGenerados(resultado))) {
    const ruta = join(outDir, nombre);
    if (!existsSync(ruta)) return { ok: false, motivo: `No existe ${ruta}.` };
    if (readFileSync(ruta, "utf8") !== esperado) {
      return {
        ok: false,
        motivo: `${nombre} commiteado no coincide con lo regenerado en memoria.`,
      };
    }
  }
  return { ok: true };
}
