// Tarea 3A.1 (T1) — corta el texto extraído del SRD 5.1 español (`srd-5.1-es.txt`) en bloques
// por conjuro y listas de conjuros por clase. Reglas de corte medidas en la
// tarea 0 (`docs/superpowers/specs/2026-09-14-3a1-tarea-0-prueba-de-fuego.md`, sección c):
// tolerante a `(ritual)`, a `(truco)`, a la escuela escrita «Ilusionismo» y a los cuatro campos
// partidos en varias líneas.

const ESCUELAS = {
  Abjuración: "abj",
  Conjuración: "con",
  Adivinación: "div",
  Encantamiento: "enc",
  Evocación: "evo",
  Ilusión: "ill",
  Ilusionismo: "ill",
  Nigromancia: "nec",
  Transmutación: "trs",
};

const NOMBRE_DE_ESCUELA = Object.keys(ESCUELAS).join("|");

// Cabecera: "<Escuela> nivel N" (con "(ritual)" opcional) o "<Escuela> (truco)".
const RE_CABECERA = new RegExp(
  `^(${NOMBRE_DE_ESCUELA})\\s+(?:nivel\\s+(\\d+)(\\s*\\(ritual\\))?|\\(truco\\))\\s*$`,
);

const ETIQUETAS = ["Tiempo de lanzamiento:", "Alcance:", "Componentes:", "Duración:"];
const RE_A_NIVELES_SUPERIORES = /^A niveles superiores\.?/;

/**
 * El pie de página del PDF, medido en `srd-5.1-es.txt` (ola de arreglos, C4): son TRES líneas
 * seguidas —« Documento de referencia del sistema 5.1. 184», «Prohibida la reventa. Tienes
 * permiso para imprimir» y «o fotocopiar este documento solo para uso personal.»— que caen
 * DENTRO del cuerpo de un conjuro o de una aptitud cada vez que cruza una página. Hasta esta ola
 * solo se quitaba la primera, y las otras dos acababan en 81 `textEs` de conjuro, 33 de aptitud
 * y 1 de raza. Las tres se quitan por línea aquí, y `limpiarProsaEs` remata cualquier resto que
 * hubiera quedado pegado a una línea de prosa.
 */
const RE_PIE_DE_PAGINA = [
  /^Documento de referencia del sistema 5\.1\.\s*\d*$/,
  /^Prohibida la reventa\. Tienes permiso para imprimir$/,
  /^o fotocopiar este documento solo para uso personal\.$/,
];
const RE_PIE_DE_PAGINA_EN_LINEA =
  /\s*Documento de referencia del sistema 5\.1\.\s*\d*\s*Prohibida la reventa\. Tienes permiso para imprimir\s*o fotocopiar este documento solo para uso personal\.?/g;

function esPieDePagina(linea) {
  const t = linea.trim();
  return RE_PIE_DE_PAGINA.some((re) => re.test(t));
}

/**
 * Tras «Zona de la verdad», el último conjuro del capítulo, el texto sigue con el capítulo
 * «Trampas»: sin esta cota su cuerpo arrastraba ~2500 caracteres ajenos (C4). Es una cabecera
 * medida en el texto, y `cortarSrdEs` falla si no la encuentra después del último conjuro —
 * un texto distinto al medido no se corta a ciegas.
 */
const CABECERA_TRAS_LOS_CONJUROS = "Trampas";

/**
 * Busca las cuatro etiquetas EN ORDEN dentro de una ventana de líneas, sea cual sea cuántas
 * líneas ocupe cada una (T0, sección c, punto 4). Devuelve `{ campos, finIndice }` — `campos` es
 * un `Record<etiqueta, texto>` y `finIndice` la línea donde termina el último campo.
 */
function leerCuatroCampos(lineas, desde, ventana = 25) {
  const campos = {};
  let cursor = desde;
  let etiquetaActual = 0;
  let acumulado = [];

  for (let i = desde; i < Math.min(lineas.length, desde + ventana) && etiquetaActual < 4; i++) {
    const linea = lineas[i];
    const siguienteEtiqueta = ETIQUETAS[etiquetaActual];
    if (linea.trim().startsWith(siguienteEtiqueta)) {
      if (etiquetaActual > 0) {
        campos[ETIQUETAS[etiquetaActual - 1]] = acumulado.join(" ").trim();
      }
      acumulado = [linea.trim().slice(siguienteEtiqueta.length).trim()];
      etiquetaActual += 1;
      cursor = i;
    } else if (etiquetaActual > 0) {
      acumulado.push(linea.trim());
      cursor = i;
    }
  }
  if (etiquetaActual > 0) {
    campos[ETIQUETAS[etiquetaActual - 1]] = acumulado.join(" ").trim();
  }
  return { campos, finIndice: cursor };
}

/**
 * `cortarSrdEs(txt)` — pura. Devuelve `{ conjuros, listasPorClase }`.
 * `conjuros` es un `Map<nombreEs, bloque>` con `{ nameEs, level, school, ritual, camposCrudos,
 * textoEs, higherLevelsEs }` — la traducción de `camposCrudos` (tiempo/alcance/componentes/
 * duración en prosa) a la forma estructurada es trabajo de `salida.mjs`, no de este módulo.
 */
export function cortarSrdEs(txt) {
  const lineasCrudas = txt.split(/\r?\n/);
  const lineas = lineasCrudas.filter((l) => !esPieDePagina(l));

  const conjuros = new Map();
  const cabeceras = [];

  for (let i = 1; i < lineas.length; i++) {
    const m = lineas[i].trim().match(RE_CABECERA);
    if (!m) continue;
    // La lista de conjuros por clase nunca trae las cuatro etiquetas a continuación (T0, punto
    // c.4): una cabecera real SIEMPRE tiene "Tiempo de lanzamiento:" dentro de la ventana.
    const { campos, finIndice } = leerCuatroCampos(lineas, i + 1);
    if (!campos["Tiempo de lanzamiento:"]) continue;

    const nombre = lineas[i - 1].trim();
    if (!nombre) continue;

    const escuela = ESCUELAS[m[1]];
    const esTruco = lineas[i].includes("(truco)");
    const nivel = esTruco ? 0 : Number.parseInt(m[2], 10);
    const ritual = Boolean(m[3]);

    cabeceras.push({
      indice: i,
      nombre,
      escuela,
      nivel,
      ritual,
      campos,
      cuerpoDesde: finIndice + 1,
    });
  }

  for (let c = 0; c < cabeceras.length; c++) {
    const actual = cabeceras[c];
    let finCuerpo;
    if (c + 1 < cabeceras.length) {
      finCuerpo = cabeceras[c + 1].indice - 1;
    } else {
      finCuerpo = lineas.findIndex(
        (l, i) => i > actual.indice && l.trim() === CABECERA_TRAS_LOS_CONJUROS,
      );
      if (finCuerpo < 0 && cabeceras.length > 1) {
        throw new Error(
          `cortarSrdEs: no se encontró la cabecera «${CABECERA_TRAS_LOS_CONJUROS}» tras el último conjuro («${actual.nombre}»): el texto no es el medido y su cuerpo no se puede acotar.`,
        );
      }
      if (finCuerpo < 0) finCuerpo = lineas.length;
    }
    const cuerpoLineas = lineas.slice(actual.cuerpoDesde, finCuerpo);

    const indiceNiveles = cuerpoLineas.findIndex((l) => RE_A_NIVELES_SUPERIORES.test(l.trim()));
    let textoEs;
    let higherLevelsEs;
    if (indiceNiveles >= 0) {
      textoEs = limpiarProsaEs(unirParrafos(cuerpoLineas.slice(0, indiceNiveles)));
      higherLevelsEs = limpiarProsaEs(
        unirParrafos(cuerpoLineas.slice(indiceNiveles)).replace(RE_A_NIVELES_SUPERIORES, ""),
      );
    } else {
      textoEs = limpiarProsaEs(unirParrafos(cuerpoLineas));
    }

    conjuros.set(actual.nombre, {
      nameEs: actual.nombre,
      level: actual.nivel,
      school: actual.escuela,
      ritual: actual.ritual,
      camposCrudos: actual.campos,
      textoEs,
      ...(higherLevelsEs && { higherLevelsEs }),
    });
  }

  return {
    conjuros,
    listasPorClase: leerListasPorClase(lineas),
  };
}

/**
 * Une las líneas del PDF en párrafos (ola de arreglos, menor 1). El texto extraído parte cada
 * párrafo en líneas de ~50 caracteres y marca el principio de un párrafo nuevo con un ESPACIO
 * inicial (la sangría del PDF: « Una criatura afectada es consciente…»). Aquí una línea con
 * sangría abre párrafo y las demás se pegan a la anterior con un espacio — salvo que la anterior
 * termine en guion, que se pegan sin espacio conservando el guion: el texto extraído no
 * distingue un guion de partición («permanen-temente») de uno real («amarillo-verdosa»), y
 * quitarlo a ciegas rompería el segundo.
 */
function unirParrafos(lineasCrudas) {
  const parrafos = [];
  let actual = "";
  for (const cruda of lineasCrudas) {
    const t = cruda.trim();
    if (!t) continue;
    const abreParrafo = /^\s/.test(cruda) && actual !== "";
    if (abreParrafo) {
      parrafos.push(actual);
      actual = t;
    } else if (actual === "") {
      actual = t;
    } else if (actual.endsWith("-")) {
      actual += t;
    } else {
      actual += " " + t;
    }
  }
  if (actual) parrafos.push(actual);
  return parrafos.join("\n\n");
}

/**
 * Colapsa espacios dobles/múltiples a uno solo (T3b). El texto extraído con `pymupdf` a veces
 * deja dos espacios donde el PDF justificaba una línea — se ve tanto en la prosa de conjuros
 * (`textoEs`/`higherLevelsEs`, ya cortados por `cortarSrdEs`) como en la de aptitudes y rasgos de
 * raza (`cortarAptitudesEs`, más abajo): es la MISMA limpieza, una sola función para las dos.
 * No toca saltos de línea ni el resto de espacios en blanco, solo dos o más espacios/tabs
 * seguidos dentro de una línea ya unida.
 */
export function limpiarProsaEs(texto) {
  if (!texto) return texto;
  return texto
    .replace(RE_PIE_DE_PAGINA_EN_LINEA, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ \n/g, "\n")
    .trim();
}

// -------------------------------------------------------------------------------------------
// Tarea 3A.1 (T3b) — `cortarAptitudesEs(txt)`: la prosa española de las aptitudes de clase y los
// rasgos de raza. A diferencia de un conjuro (una cabecera de cuatro etiquetas que acota su
// cuerpo sin ambigüedad), una aptitud no tiene ancla estructural — así que el corte busca, por
// NOMBRE ya conocido (el que `aptitudes.mjs`/`razas.mjs` ya resolvieron contra `classes.ts`/
// `races.ts` en 2A.3, o contra la tabla a mano de esta tanda), uno de dos formatos que el SRD
// español usa de verdad (medidos hoy sobre el texto, no supuestos):
//
//  · Formato A — «cabecera sola»: una línea que es SOLO el nombre del rasgo (sin coma, sin
//    punto final), seguida de una línea de prosa. Es el formato de los rasgos "de nivel" de cada
//    clase («Tomar Aliento», «Acción Súbita», «Ataque Furtivo»…) y de los de subclase («Crítico
//    Mejorado»). El MISMO nombre puede aparecer antes, dentro de la tabla «El <clase>» —pero ahí
//    va seguido de un número de nivel o de "(N usos)", nunca de prosa— así que "la línea
//    siguiente empieza por letra y no es una celda de tabla" es lo que distingue una cabecera
//    real de una fila de tabla, sin tener que saltarse la tabla aparte.
//  · Formato B — «viñeta en línea»: `Nombre. Prosa…` en la MISMA línea (con un espacio inicial
//    de la viñeta del PDF). Es el formato de las OPCIONES dentro de un rasgo con elección
//    («El Cazador y la Presa» del explorador: «Azote de Colosos.», «Destructor de Hordas.»…; la
//    Metamagia del hechicero: «Conjuro Cuidadoso.», «Conjuro Distante.»…; las invocaciones
//    sobrenaturales del brujo, cada una con su propio nombre en negrita) y también el de los
//    rasgos raciales (ver `RE_VIÑETA` reutilizada por `cortarRasgosDeRazaEs`).
//
// Las dos cabeceras compiten dentro de la MISMA sección de clase (o de raza): se recorre la
// sección línea a línea, se detectan los candidatos de los dos formatos en el orden en que
// aparecen y el cuerpo de cada uno llega hasta el candidato siguiente (o el final de la
// sección). El resultado es un `Map<nombre, texto>` por sección — nunca se filtra por si el
// nombre detectado es una aptitud real: el filtro lo hace el LLAMADOR, que solo mira los nombres
// que ya sabe que necesita (`aptitudesDeClase`/`rasgosDeRaza`/`traduccionesPropias`); una
// cabecera espuria («Competencias», «Equipo»…) que nadie busca simplemente no se usa.

const CONECTORES_DE_NOMBRE = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "y",
  "e",
  "en",
  "con",
  "a",
  "al",
  "un",
  "una",
  "o",
  "tu",
  "sus",
  "su",
  "sin",
  "por",
  "para",
  "entre",
  "sobre",
  "contra",
  "hacia",
  "desde",
  "tras",
  "bajo",
  "ante",
  "según",
  "mediante",
  "como",
  "lo",
]);

/**
 * ¿Es `texto` un nombre de rasgo plausible? Cada palabra empieza en mayúscula, salvo los
 * conectores gramaticales españoles habituales en un título («Mejora DE Característica»,
 * «Defensa SIN Armadura»); como mucho seis palabras, ninguna con dígitos. Es una heurística, no
 * una gramática: filtra la inmensa mayoría de la prosa normal (que solo capitaliza la primera
 * palabra de la frase) sin tener que conocer de antemano el nombre exacto.
 */
function pareceNombreDeRasgo(texto) {
  const palabras = texto.trim().split(/\s+/);
  if (palabras.length === 0 || palabras.length > 6) return false;
  for (const p of palabras) {
    if (/\d/.test(p)) return false;
    const limpio = p.replace(/[():,]/g, "");
    if (!limpio) return false;
    if (CONECTORES_DE_NOMBRE.has(limpio.toLowerCase())) continue;
    if (!/^[A-ZÁÉÍÓÚÑ]/.test(limpio)) return false;
  }
  return /^[A-ZÁÉÍÓÚÑ]/.test(palabras[0]);
}

const RE_VIÑETA = /^\s*([A-ZÁÉÍÓÚÑ][^.]{1,58})\.\s+(\S.*)$/;

// Re-revisión de la ola de arreglos (2026-09-14) — el Formato B (viñeta en línea) disparaba con
// una línea que, por pura coincidencia del salto de línea del PDF, EMPIEZA en mayúscula y trae un
// punto seguido de más texto, pero en realidad es la CONTINUACIÓN de la frase anterior: «...con tu
// estilo y técnicas de combate, como el de / Campeón. El arquetipo que elijas...» — «Campeón.»
// parece una viñeta (Nombre. Prosa) pero es solo dónde el PDF cortó la enumeración «como el de
// Campeón»; mismo defecto en «Abierta. Tu tradición...» (Camino de la Mano Abierta) e «Inspiración
// Bárdica. Tira el dado...» (dentro de la frase «uno de tus usos de Inspiración Bárdica»). Una
// viñeta REAL siempre viene después de que la frase anterior ya haya terminado: la línea de texto
// previa (saltándose pies de página) o bien está vacía (salto de párrafo del PDF) o bien termina en
// puntuación de cierre de frase. Eso es lo que decide `limiteDeParrafoAntes` — una condición
// NECESARIA además de las que ya tenía el Formato B, no un reemplazo. NO se aplica al Formato A
// (cabecera sola en su propia línea): ahí el mismo criterio rechazaba cabeceras reales que vienen
// justo detrás de una fórmula o tabla sin punto final («Ki» termina en «...tu modificador por
// Sabiduría» sin punto, y el siguiente rasgo real, «Defensa Paciente», es una cabecera legítima) —
// el Formato A tiene su propio filtro más abajo (longitud de la prosa siguiente).
function limiteDeParrafoAntes(lineas, i, desde) {
  let j = i - 1;
  while (j >= desde && esPieDePagina(lineas[j])) j--;
  if (j < desde) return true;
  const anterior = lineas[j].trim();
  if (!anterior) return true;
  return /[.:!?][»"”')]?$/.test(anterior);
}

// Formato A: la tabla «Formas de bestia» (dentro de `druid:wild-shape`) cortaba el rasgo en su
// primera celda («Nivel», seguida de «VD», «máx.», «Limitaciones», «Ejemplo» y los propios
// nombres de bestia «Lobo», «Cocodrilo», «Águila») porque cada una, sola en su línea, sin coma ni
// punto y con la letra siguiente empezando la celda de al lado, pasa el resto de filtros de una
// cabecera real — re-review, `druid:wild-shape` cortado a mitad de tabla. No se puede rechazar
// por el LARGO de la línea siguiente ni por si la línea anterior parece tabla (una celda o un
// número) sin de paso romper cabeceras que SÍ repiten el propio nombre del rasgo como título de
// su tabla («Destruir Muertos Vivientes» antes de «Nivel de clérigo / Destruye muertos vivientes
// de VD...», con su tabla de niveles justo detrás de «Intercesión Divina») o que empiezan justo
// tras una fila de tabla («Intercesión Divina» viene después de «17 / 4 o inferior»): esas
// posiciones son AMBIGUAS con solo mirar alrededor. Lo que sí es inequívoco es la palabra exacta:
// ninguna de estas ocho es nunca el nombre de un rasgo, así que se deniegan por lista — la MISMA
// disciplina que ya usa `CABECERA_TRAS_LOS_CONJUROS` con "Trampas" para el corte de conjuros,
// contra un documento cerrado que solo hace crecer la lista si aparece otro caso medido.
const CABECERAS_DE_COLUMNA_DE_TABLA = new Set([
  "Nivel",
  "Rasgos",
  "Competencias",
  "Equipo",
  "VD",
  "Limitaciones",
  "Ejemplo",
  "Lobo",
  "Cocodrilo",
  "Águila",
]);

// Cabeceras de sección DENTRO del capítulo de una clase que no son una aptitud (nadie las busca
// por nombre) pero SÍ deben acotar la aptitud anterior — si no se reconocen como límite, su prosa
// se cuela dentro del cuerpo de la última aptitud vista (I3/I13, re-review: «Voz del Amo de la
// Cadena» arrastraba las ~700 letras de esta sección de brujo). No son un nombre de rasgo
// («pareceNombreDeRasgo» las rechaza: solo la primera palabra va en mayúscula, como una frase
// normal, no un título) así que se reconocen por texto exacto — la MISMA disciplina que ya usa
// `CABECERA_TRAS_LOS_CONJUROS` en este fichero para el corte de conjuros. Se contrastan contra el
// SRD 5.1 español, un documento cerrado: la lista solo crece si aparece otro caso medido.
const CABECERAS_DE_SECCION_NO_APTITUD = new Set(["Patrones sobrenaturales"]);

/** Candidatos de cabecera (los dos formatos, más los límites de `CABECERAS_DE_SECCION_NO_APTITUD`)
 * dentro de `lineas[desde, hasta)`. Un candidato con `esLimiteSolo: true` nunca entra en el mapa
 * nombre→texto (`mapaDeSeccion` lo salta) pero sí corta el cuerpo del candidato anterior. */
function candidatosDeSeccion(lineas, desde, hasta) {
  const candidatos = [];
  for (let i = desde; i < hasta; i++) {
    const cruda = lineas[i];
    if (esPieDePagina(cruda)) continue;
    const t = cruda.trim();
    if (!t) continue;

    if (CABECERAS_DE_SECCION_NO_APTITUD.has(t) && limiteDeParrafoAntes(lineas, i, desde)) {
      candidatos.push({ indice: i, nombre: t, inicioMismaLinea: null, esLimiteSolo: true });
      continue;
    }

    const mB = t.match(RE_VIÑETA);
    if (mB && pareceNombreDeRasgo(mB[1]) && mB[2] && limiteDeParrafoAntes(lineas, i, desde)) {
      candidatos.push({ indice: i, nombre: mB[1].trim(), inicioMismaLinea: mB[2].trim() });
      continue;
    }

    if (
      !t.includes(",") &&
      !t.endsWith(".") &&
      t.length <= 60 &&
      pareceNombreDeRasgo(t) &&
      !CABECERAS_DE_COLUMNA_DE_TABLA.has(t)
    ) {
      const siguiente = (lineas[i + 1] ?? "").trim();
      const esProsa =
        siguiente.length > 0 &&
        /^[A-ZÁÉÍÓÚÑa-záéíóúñ]/.test(siguiente) &&
        !/^\+?\d+$/.test(siguiente);
      if (esProsa) candidatos.push({ indice: i, nombre: t, inicioMismaLinea: null });
    }
  }
  return candidatos;
}

/** El cuerpo del candidato `candidatos[k]`, hasta el candidato siguiente o `hasta`. */
function cuerpoDelCandidato(lineas, candidatos, k, hasta) {
  const c = candidatos[k];
  const finIndice = k + 1 < candidatos.length ? candidatos[k + 1].indice : hasta;
  const partes = [];
  if (c.inicioMismaLinea) partes.push(c.inicioMismaLinea);
  for (let j = c.indice + 1; j < finIndice; j++) {
    if (esPieDePagina(lineas[j])) continue;
    const t = lineas[j].trim();
    if (t) partes.push(t);
  }
  return limpiarProsaEs(partes.join(" "));
}

/** `Map<nombre, texto>` de una sección — la primera aparición de cada nombre gana. */
function mapaDeSeccion(lineas, desde, hasta) {
  const candidatos = candidatosDeSeccion(lineas, desde, hasta);
  const mapa = new Map();
  for (let k = 0; k < candidatos.length; k++) {
    if (candidatos[k].esLimiteSolo) continue;
    const nombre = candidatos[k].nombre;
    if (!mapa.has(nombre)) mapa.set(nombre, cuerpoDelCandidato(lineas, candidatos, k, hasta));
  }
  return mapa;
}

/** Clave sin acentos y en minúsculas — para buscar un nombre sin depender de mayúscula/tilde. */
function normalizarNombre(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** `Map<claveNormalizada, texto>` a partir de un `Map<nombre, texto>` — la primera gana. */
function indiceNormalizado(mapa) {
  const indice = new Map();
  for (const [nombre, texto] of mapa) {
    const clave = normalizarNombre(nombre);
    if (!indice.has(clave)) indice.set(clave, texto);
  }
  return indice;
}

/** Índice de una cabecera de clase («Guerrero \n Rasgos de clase») o de raza («Elfo \n Atributos
 * de los…»): la línea es EXACTAMENTE `nombre` y la siguiente línea no vacía empieza por
 * `siguientePrefijo`. Devuelve `-1` si no se encuentra (evita las apariciones sueltas del nombre
 * de clase/raza en tablas o índices, que no van seguidas de esa frase fija). */
function indiceDeCabecera(lineas, nombre, siguientePrefijo) {
  for (let i = 0; i < lineas.length; i++) {
    if (lineas[i].trim() !== nombre) continue;
    let j = i + 1;
    while (j < lineas.length && lineas[j].trim() === "") j++;
    if (lineas[j] && lineas[j].trim().startsWith(siguientePrefijo)) return i;
  }
  return -1;
}

/** Las doce clases del SRD 5.1, en el español de la cabecera de capítulo, a la clave de
 * `classes.ts`. En el mismo orden en que aparecen en `srd-5.1-es.txt` (E-3A1-2). */
const CLASE_ES_A_CLAVE_DE_CAPITULO = [
  ["Bárbaro", "barbarian"],
  ["Bardo", "bard"],
  ["Brujo", "warlock"],
  ["Clérigo", "cleric"],
  ["Druida", "druid"],
  ["Explorador", "ranger"],
  ["Guerrero", "fighter"],
  ["Hechicero", "sorcerer"],
  ["Mago", "wizard"],
  ["Monje", "monk"],
  ["Paladín", "paladin"],
  ["Pícaro", "rogue"],
];

/** Las razas del SRD 5.1 con capítulo propio, a la clave de `races.ts` (`CARPETA_FOUNDRY_A_CLAVE`
 * de `razas.mjs`, reproducida aquí porque el orden en el texto —no el de esa tabla— es el que
 * importa para cortar cada capítulo). */
const RAZA_ES_A_CLAVE_DE_CAPITULO = [
  ["Elfo", "elf"],
  ["Enano", "dwarf"],
  ["Humano", "human"],
  ["Mediano", "halfling"],
  ["Dracónido", "dragonborn"],
  ["Gnomo", "gnome"],
  ["Semiorco", "half-orc"],
  ["Tiefling", "tiefling"],
];

/**
 * `cortarAptitudesEs(txt)` — pura. Devuelve `{ porClase: Map<claveDeClase, Map<claveNormalizada,
 * texto>>, porRaza: Map<claveDeRaza, Map<claveNormalizada, texto>>, global: Map<claveNormalizada,
 * texto> }`. `global` es el respaldo para los rasgos de `classfeatures/shared-features/` (los
 * estilos de combate, "Mejora de puntuación de característica", "Ataque adicional" genérico):
 * sin clase propia en el catálogo generado, pero con texto en la sección de la clase donde el
 * SRD los enumera por primera vez (el guerrero, para los estilos de combate).
 */
export function cortarAptitudesEs(txt) {
  const lineas = txt.split(/\r?\n/);

  const inicios = CLASE_ES_A_CLAVE_DE_CAPITULO.map(([nombre, clave]) => ({
    clave,
    indice: indiceDeCabecera(lineas, nombre, "Rasgos de clase"),
  })).filter((x) => x.indice >= 0);
  inicios.sort((a, b) => a.indice - b.indice);

  let finClases = lineas.length;
  if (inicios.length > 0) {
    for (let i = inicios[inicios.length - 1].indice; i < lineas.length; i++) {
      if (lineas[i].trim() === "Más allá del nivel 1") {
        finClases = i;
        break;
      }
    }
  }

  const porClase = new Map();
  const global = new Map();
  for (let i = 0; i < inicios.length; i++) {
    const desde = inicios[i].indice;
    const hasta = i + 1 < inicios.length ? inicios[i + 1].indice : finClases;
    const mapa = mapaDeSeccion(lineas, desde, hasta);
    porClase.set(inicios[i].clave, indiceNormalizado(mapa));
    for (const [nombre, texto] of mapa) {
      const clave = normalizarNombre(nombre);
      if (!global.has(clave)) global.set(clave, limpiarProsaEs(texto));
    }
  }

  const raices = RAZA_ES_A_CLAVE_DE_CAPITULO.map(([nombre, clave]) => ({
    clave,
    indice: indiceDeCabecera(lineas, nombre, "Atributos de"),
  })).filter((x) => x.indice >= 0);
  raices.sort((a, b) => a.indice - b.indice);

  const primeraClase = inicios.length > 0 ? inicios[0].indice : lineas.length;
  const porRaza = new Map();
  for (let i = 0; i < raices.length; i++) {
    const desde = raices[i].indice;
    const hasta = i + 1 < raices.length ? raices[i + 1].indice : primeraClase;
    porRaza.set(raices[i].clave, indiceNormalizado(mapaDeSeccion(lineas, desde, hasta)));
  }

  return { porClase, porRaza, global };
}

/**
 * Un nombre ya resuelto (`aptitudesDeClase`/`rasgosDeRaza`) a veces trae un matiz que el propio
 * SRD español no repite en la cabecera de la prosa — un tramo entre paréntesis que distingue
 * ClassFeature sintéticas del mismo rasgo (`"Indómito (un uso)"` / `"Indómito (dos usos)"`,
 * ambas la MISMA cabecera «Indómito»), o el prefijo «Canalizar Divinidad: » de una opción que en
 * el SRD aparece como viñeta suelta bajo su propio nombre («Expulsar Muertos Vivientes», no
 * «Canalizar Divinidad: Expulsar Muertos Vivientes»). Se intenta el nombre tal cual primero, y
 * solo si falla, estas dos variantes — nunca al revés, para no preferir una coincidencia parcial
 * cuando la exacta ya estaba.
 */
function* variantesDeNombre(nombreEs) {
  yield nombreEs;
  const sinParentesis = nombreEs.replace(/\s*\([^)]*\)\s*$/, "").trim();
  if (sinParentesis !== nombreEs) yield sinParentesis;
  const posDosPuntos = nombreEs.indexOf(":");
  if (posDosPuntos >= 0) {
    const despues = nombreEs.slice(posDosPuntos + 1).trim();
    if (despues) yield despues;
  }
}

/**
 * `textoDeAptitud(cortes, claseKey, nombreEs)` — busca primero en la sección de `claseKey`
 * (T3b: nunca confunde el "Ataque adicional" del bárbaro con el del guerrero si sus textos
 * llegaran a diferir) y, si no está ahí, en `global` (los rasgos de `shared-features`, sin
 * sección propia). `undefined` si no se encontró en ninguno de los dos — el llamador decide qué
 * hacer (contar el fallo en `rechazos.md`, nunca inventar prosa).
 */
export function textoDeAptitud(cortes, claseKey, nombreEs) {
  if (!nombreEs) return undefined;
  for (const variante of variantesDeNombre(nombreEs)) {
    const clave = normalizarNombre(variante);
    const texto = cortes.porClase.get(claseKey)?.get(clave) ?? cortes.global.get(clave);
    if (texto) return texto;
  }
  return undefined;
}

/** `textoDeRasgoDeRaza(cortes, raceKey, nombreEs)` — mismo criterio, sin respaldo global (un
 * rasgo de raza no se comparte entre razas como sí ocurre con los estilos de combate). */
export function textoDeRasgoDeRaza(cortes, raceKey, nombreEs) {
  if (!nombreEs) return undefined;
  for (const variante of variantesDeNombre(nombreEs)) {
    const texto = cortes.porRaza.get(raceKey)?.get(normalizarNombre(variante));
    if (texto) return texto;
  }
  return undefined;
}

// `leerTablasDeClase` (la tabla «El <clase> / Nivel / Rasgos») se borró en la ola de arreglos
// (I12): nadie la consumía — los nombres de las aptitudes salen de la tabla a mano de
// `emparejamientos.json`, verificada contra el SRD, no de la posición en la tabla de la clase.

/**
 * Lee «Conjuros de <clase>» (por nivel) a `{ clase, porNivel: Map<nivel, nombre[]> }`. La
 * cabecera real en `srd-5.1-es.txt` es «Conjuros de <clase>», no «Lista de conjuros del…»
 * (verificado en T2 contra las líneas 13466-14345: «Conjuros de bardo/brujo/clérigo/druida/
 * explorador/hechicero/mago/paladín»); el mismo patrón también casa con «Conjuros de dominio»,
 * «Conjuros de círculo» y «Conjuros de juramento» (listas de subclase, no de clase base) — se
 * capturan igual y el llamador las descarta al no reconocer esos nombres como clave de
 * `SRD_CLASSES`. Nunca se confunde con la cabecera de un conjuro real (esta función nunca mira
 * las cuatro etiquetas: las listas no las traen — T0, punto c.4 final).
 */
function leerListasPorClase(lineas) {
  const listas = new Map();
  const RE_TITULO = /^Conjuros de (\S+)$/i;
  // El truco (nivel 0) se titula «Trucos (nivel 0)» dentro de esta lista (no «Trucos» a secas,
  // que es la cabecera del apartado narrativo de cada clase en otra parte del documento).
  const RE_NIVEL = /^Nivel (\d+)$|^Trucos(?:\s*\(nivel 0\))?$/;

  for (let i = 0; i < lineas.length; i++) {
    const titulo = lineas[i].trim().match(RE_TITULO);
    if (!titulo) continue;
    const clase = titulo[1].toLowerCase();
    const porNivel = new Map();
    let nivelActual = null;
    let k = i + 1;
    while (k < lineas.length && k < i + 400) {
      const linea = lineas[k].trim();
      // La última lista (paladín, en el orden del documento) no tiene otra «Conjuros de» detrás
      // que la corte: la corta el rótulo fijo que abre las descripciones completas.
      if (/^Conjuros de /i.test(linea) || /^Descripciones de conjuros$/i.test(linea)) break;
      const nivelMatch = linea.match(RE_NIVEL);
      if (nivelMatch) {
        nivelActual = nivelMatch[1] ? Number.parseInt(nivelMatch[1], 10) : 0;
        porNivel.set(nivelActual, []);
      } else if (linea && nivelActual !== null) {
        porNivel.get(nivelActual).push(linea);
      }
      k++;
    }
    listas.set(clase, { clase, porNivel });
  }
  return listas;
}
