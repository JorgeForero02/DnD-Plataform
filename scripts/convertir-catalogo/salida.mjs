import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { leerFoundry, leerSubclases, leerEscalasDeClase } from "./foundry.mjs";
import { cortarSrdEs, cortarAptitudesEs } from "./srd-es.mjs";
import { emparejar } from "./huella.mjs";
import { actividadDe } from "./actividad.mjs";
import { convertirAptitudes } from "./aptitudes.mjs";
import { convertirRazas } from "./razas.mjs";

// Tarea 3A.1 (T1) — junta los módulos puros anteriores en el pipeline completo: lee Foundry,
// corta el SRD español, empareja por huella, traduce cada actividad, y escribe el catálogo
// generado (o lo compara, en `--check`). **`apps/api/src/rules/catalog/generado/*.json` +
// `rechazos.md` llevan cabecera «GENERADO — no editar»** (constraints.md).

/**
 * Limpia la prosa HTML de Foundry a texto plano (E-3A1-7): `<p>`→saltos de línea, marcas de
 * negrita fuera, `@UUID[...]{Nombre}`→`Nombre` y `@embed[...]{Nombre}`→`Nombre` (dos enlaces de
 * texto enriquecido, nunca una fórmula — el segundo lo usa Foundry para incrustar una tabla de
 * tirada, p. ej. la de *Confusion*), `[[lookup @flags...]]`/`[[lookup @labels...]]`→fuera (un
 * valor calculado en vivo por el cliente de Foundry —cuántas imágenes le quedan a *Mirror
 * Image*, la duración ya resuelta de un `activity` de *Symbol*— que no existe como texto fuera
 * de esa sesión de juego; medido en T2 sobre los 319: solo tres conjuros lo traen en su
 * `description.value` de nivel de ítem —*confusion*, *eyebite*, *symbol*— y ninguno depende de
 * ese fragmento para entenderse) y `&nbsp;`→espacio. **Ninguna `@` sobrevive**: es la misma
 * frontera que `catalog.schema.ts` comprueba al final, aplicada ya aquí para no depender solo de
 * esa red.
 */
function limpiarProsa(html) {
  if (!html) return "";
  return html
    .replace(/@UUID\[[^\]]*\]\{([^}]*)\}/g, "$1")
    .replace(/@UUID\[[^\]]*\]/g, "")
    .replace(/@embed\[[^\]]*\]\{([^}]*)\}/g, "$1")
    .replace(/@embed\[[^\]]*\]/g, "")
    .replace(/\[\[lookup\s+[^\]]*\]\](?:\{[^}]*\})?/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

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
  // "Personal" y "Lanzador" (el SRD español usa las dos para alcance sobre uno mismo) se omiten,
  // igual que "self" en Foundry (T1).
  if (/^personal/i.test(t) || /^lanzador/i.test(t)) return undefined;
  if (/^toque/i.test(t)) return { unidad: "toque" };
  if (/^ilimitado/i.test(t)) return { unidad: "ilimitado" };
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
  if (/^hasta que se disipe/i.test(t)) return { unidad: "hastaQueSeDisipe", concentracion: false };
  const concentracion = /^concentraci[oó]n/i.test(t);
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
  const rango = rangoEsDe(conjuro.camposCrudos["Alcance:"]);
  const duracion = duracionEsDe(conjuro.camposCrudos["Duración:"]);
  const componentes = componentesEsDe(conjuro.camposCrudos["Componentes:"]);
  return {
    level: conjuro.level,
    school: conjuro.school,
    rangeUnit: rango ? (UNIDAD_DE_RANGO_A_FOUNDRY[rango.unidad] ?? "") : "self",
    rangeValue: rango?.distanciaFt ?? 0,
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

/** Convierte una `activities` de Foundry (objeto por id) en `Actividad[]` + `fueraDeA[]`. */
function convertirActividades(doc, ctxComun) {
  const actividades = [];
  const fueraDeA = [];
  const rechazosDeItem = [];
  const bloque = doc.system.activities ?? {};
  for (const actividadFoundry of Object.values(bloque)) {
    const r = actividadDe(actividadFoundry, ctxComun);
    if (r.rechazo) {
      rechazosDeItem.push(`${doc.system.identifier}/${actividadFoundry.type}: ${r.rechazo}`);
    } else if (r.texto) {
      fueraDeA.push(r.tipo);
    } else {
      actividades.push(r);
    }
  }
  return { actividades, fueraDeA, rechazosDeItem };
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

  const rechazos = { edicion2024: [], sinTraduccion: [], fueraDeA: [] };
  for (const r of rechazados) rechazos.edicion2024.push(r);

  const spells = [];
  for (const s of spellsFoundry) {
    const nombreEs = pares.get(s.key);
    const conjuroEs = nombreEs ? conjurosEs.get(nombreEs) : undefined;
    const sinTraduccion = !conjuroEs;
    if (sinTraduccion) rechazos.sinTraduccion.push(s.key);

    const sys = s.doc.system;
    const componentes = conjuroEs ? componentesEsDe(conjuroEs.camposCrudos["Componentes:"]) : {};
    const textEnPlano = limpiarProsa(sys.description?.value) || "(sin texto)";
    const ctxComun = {
      recurso: s.key,
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
    const { actividades, fueraDeA, rechazosDeItem } = convertirActividades(s.doc, ctxComun);
    for (const motivo of fueraDeA) rechazos.fueraDeA.push(`${s.key}: ${motivo}`);
    for (const motivo of rechazosDeItem) rechazos.fueraDeA.push(motivo);

    spells.push({
      key: s.key,
      nameEn: s.name,
      nameEs: conjuroEs?.nameEs ?? null,
      sinTraduccion,
      level: sys.level,
      school: sys.school,
      castingTime: activacionEsDe(conjuroEs?.camposCrudos["Tiempo de lanzamiento:"]) ?? {
        coste: "ACTION",
      },
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
      textEn: textEnPlano.slice(0, 4000),
      textEs: conjuroEs?.textoEs ? conjuroEs.textoEs.slice(0, 4000) : null,
      ...(conjuroEs?.higherLevelsEs && {
        higherLevelsEs: conjuroEs.higherLevelsEs.slice(0, 2000),
      }),
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
    aptitudesFueraDeAOrechazadas: rechazosAptitudes.fueraDeA.length,
    // T3b — cobertura de `textEs` entre las aptitudes CON nombre (una sin nombre no puede
    // buscarse por nombre; su ausencia ya se cuenta arriba, no se duplica aquí).
    aptitudesConTraduccionPropia: aptitudes.filter((f) => f.traduccionPropia).length,
    aptitudesConTextoEs: aptitudesConNombre.filter((f) => f.textEs).length,
    aptitudesSinTextoEs: rechazosAptitudes.sinTextoEs.length,
  };
  const conteosRazas = {
    rasgosDeRaza: rasgosDeRaza.length,
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
    `## Fórmula o actividad fuera de A (conjuros)\n\n${filas(rechazos.fueraDeA)}\n` +
    `## Sin huella hermana (huella sin pareja, T1 revisó a mano)\n\n${filas(sinPareja)}\n` +
    `## Aptitudes de clase — sin nombre español\n\n${filas(rechazos.aptitudes?.sinTraduccion ?? [])}\n` +
    `## Aptitudes de clase — fórmula o actividad fuera de A\n\n${filas(rechazos.aptitudes?.fueraDeA ?? [])}\n` +
    `## Aptitudes de clase — con nombre pero sin texto en español (T3b, corte por nombre sin coincidencia)\n\n${filas(rechazos.aptitudes?.sinTextoEs ?? [])}\n` +
    `## Rasgos de raza — sin nombre español\n\n${filas(rechazos.razas?.sinTraduccion ?? [])}\n` +
    `## Rasgos de raza — no es una aptitud (subraza en sí, u otro tipo)\n\n${filas(rechazos.razas?.noEsAptitud ?? [])}\n` +
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

/** Escribe el catálogo generado en `outDir`. Sobrescribe sin preguntar — es contenido derivado. */
export function escribir(outDir, resultado) {
  mkdirSync(outDir, { recursive: true });
  const spellsJson =
    CABECERA_GENERADO +
    JSON.stringify(
      [...resultado.spells].sort((a, b) => a.key.localeCompare(b.key)),
      null,
      2,
    );
  writeFileSync(join(outDir, "spells-srd.json"), spellsJson.replace(/^\/\/.*\n/, ""), "utf8");
  const featuresJson = JSON.stringify(
    [...resultado.features].sort(
      (a, b) => a.class.localeCompare(b.class) || a.level - b.level || a.key.localeCompare(b.key),
    ),
    null,
    2,
  );
  writeFileSync(join(outDir, "class-features-srd.json"), featuresJson, "utf8");
  const razasJson = JSON.stringify(
    [...resultado.razas].sort((a, b) => a.race.localeCompare(b.race) || a.key.localeCompare(b.key)),
    null,
    2,
  );
  writeFileSync(join(outDir, "race-features-srd.json"), razasJson, "utf8");
  writeFileSync(
    join(outDir, "class-scales-srd.json"),
    JSON.stringify(ordenarClaves(resultado.escalas), null, 2),
    "utf8",
  );
  // El JSON no admite comentarios: la cabecera "no editar" va en un fichero hermano `.meta.json`
  // más un comentario Markdown en `rechazos.md`, que sí es texto libre.
  writeFileSync(
    join(outDir, "spells-srd.meta.json"),
    JSON.stringify({ generadoPor: "scripts/convertir-catalogo.mjs", noEditar: true }, null, 2),
    "utf8",
  );
  writeFileSync(join(outDir, "rechazos.md"), rechazosMd(resultado), "utf8");
}

/** `--check`: regenera en memoria y compara byte a byte con lo commiteado. */
export function comprobar(outDir, resultado) {
  const rutaSpells = join(outDir, "spells-srd.json");
  if (!existsSync(rutaSpells)) return { ok: false, motivo: `No existe ${rutaSpells}.` };
  const actual = readFileSync(rutaSpells, "utf8");
  const esperado = JSON.stringify(
    [...resultado.spells].sort((a, b) => a.key.localeCompare(b.key)),
    null,
    2,
  );
  if (actual !== esperado) {
    return {
      ok: false,
      motivo: "spells-srd.json commiteado no coincide con lo regenerado en memoria.",
    };
  }
  const rutaFeatures = join(outDir, "class-features-srd.json");
  if (existsSync(rutaFeatures)) {
    const actualFeatures = readFileSync(rutaFeatures, "utf8");
    const esperadoFeatures = JSON.stringify(
      [...resultado.features].sort(
        (a, b) => a.class.localeCompare(b.class) || a.level - b.level || a.key.localeCompare(b.key),
      ),
      null,
      2,
    );
    if (actualFeatures !== esperadoFeatures) {
      return {
        ok: false,
        motivo: "class-features-srd.json commiteado no coincide con lo regenerado en memoria.",
      };
    }
  }
  const rutaEscalas = join(outDir, "class-scales-srd.json");
  if (existsSync(rutaEscalas)) {
    const actualEscalas = readFileSync(rutaEscalas, "utf8");
    const esperadoEscalas = JSON.stringify(ordenarClaves(resultado.escalas), null, 2);
    if (actualEscalas !== esperadoEscalas) {
      return {
        ok: false,
        motivo: "class-scales-srd.json commiteado no coincide con lo regenerado en memoria.",
      };
    }
  }
  const rutaRazas = join(outDir, "race-features-srd.json");
  if (existsSync(rutaRazas)) {
    const actualRazas = readFileSync(rutaRazas, "utf8");
    const esperadoRazas = JSON.stringify(
      [...resultado.razas].sort(
        (a, b) => a.race.localeCompare(b.race) || a.key.localeCompare(b.key),
      ),
      null,
      2,
    );
    if (actualRazas !== esperadoRazas) {
      return {
        ok: false,
        motivo: "race-features-srd.json commiteado no coincide con lo regenerado en memoria.",
      };
    }
  }
  return { ok: true };
}
