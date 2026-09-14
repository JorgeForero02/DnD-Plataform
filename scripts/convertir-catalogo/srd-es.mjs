// Tarea 3A.1 (T1) — corta el texto extraído del SRD 5.1 español (`srd-5.1-es.txt`) en bloques
// por conjuro, tablas de clase y listas de conjuros por clase. Reglas de corte medidas en la
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
 * Limpia una línea de pie de página («Documento de referencia del sistema 5.1. 182 / Prohibida
 * la reventa…») que puede caer DENTRO del cuerpo de un conjuro, sin marcar el principio de uno
 * nuevo (T0, sección c, punto 5).
 */
function esPieDePagina(linea) {
  return /^Documento de referencia del sistema 5\.1\./.test(linea.trim());
}

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
 * `cortarSrdEs(txt)` — pura. Devuelve `{ conjuros, tablasDeClase, listasPorClase }`.
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
    const finCuerpo = c + 1 < cabeceras.length ? cabeceras[c + 1].indice - 1 : lineas.length;
    const cuerpoLineas = lineas.slice(actual.cuerpoDesde, finCuerpo);

    const indiceNiveles = cuerpoLineas.findIndex((l) => RE_A_NIVELES_SUPERIORES.test(l.trim()));
    let textoEs;
    let higherLevelsEs;
    if (indiceNiveles >= 0) {
      textoEs = cuerpoLineas.slice(0, indiceNiveles).join("\n").trim();
      higherLevelsEs = cuerpoLineas
        .slice(indiceNiveles)
        .join(" ")
        .replace(RE_A_NIVELES_SUPERIORES, "")
        .trim();
    } else {
      textoEs = cuerpoLineas.join("\n").trim();
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
    tablasDeClase: leerTablasDeClase(lineas),
    listasPorClase: leerListasPorClase(lineas),
  };
}

/**
 * Lee una tabla «El <clase> / Nivel / Bon. por competencia / Rasgos» a `[{ nivel, rasgos }]`.
 * El texto extraído la imprime como una secuencia plana de celdas, **una por línea** (nivel,
 * bonificador, rasgos — tripletas), y cuando la tabla cruza una página repite la fila de
 * cabecera («Nivel», «Bon. por competencia», «Rasgos»), que se descarta como marca de salto de
 * página en vez de leerse como una fila de datos nueva (T0, sección c).
 */
function leerTablasDeClase(lineas) {
  const tablas = new Map();
  const RE_TITULO = /^El\s+(\S+)$/;
  const RE_NIVEL = /^(\d{1,2})$/;

  for (let i = 0; i < lineas.length; i++) {
    const titulo = lineas[i].trim().match(RE_TITULO);
    if (!titulo) continue;
    let j = i + 1;
    while (j < lineas.length && lineas[j].trim() === "") j++;
    if (lineas[j]?.trim() !== "Nivel") continue;

    const filas = [];
    let k = j;
    let vacias = 0;
    while (k < lineas.length && filas.length < 20 && vacias < 3) {
      const linea = lineas[k].trim();
      if (linea === "Nivel" || linea === "Bon. por competencia" || linea === "Rasgos") {
        k++;
        continue; // repetición de cabecera tras un salto de página: se descarta
      }
      if (linea === "") {
        vacias++;
        k++;
        continue;
      }
      const nivelMatch = linea.match(RE_NIVEL);
      if (!nivelMatch) {
        if (filas.length > 0) break; // ya no estamos dentro de la tabla
        k++;
        continue;
      }
      const bono = lineas[k + 1]?.trim() ?? "";
      const rasgosLinea = lineas[k + 2]?.trim() ?? "";
      if (!/^\+?\d+$/.test(bono) || !rasgosLinea) break;
      filas.push({
        nivel: Number.parseInt(nivelMatch[1], 10),
        rasgos: rasgosLinea
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      k += 3;
      vacias = 0;
    }
    if (filas.length > 0) tablas.set(titulo[1].toLowerCase(), filas);
  }
  return tablas;
}

/**
 * Lee «Lista de conjuros del <clase>» (por nivel) a `{ clase, porNivel: Map<nivel, nombre[]> }`.
 * Nunca se confunde con la cabecera de un conjuro real (esta función nunca mira las cuatro
 * etiquetas: las listas no las traen — T0, punto c.4 final).
 */
function leerListasPorClase(lineas) {
  const listas = new Map();
  const RE_TITULO = /^Lista de conjuros del (\S+)$/i;
  const RE_NIVEL = /^Nivel (\d+)$|^Trucos$/;

  for (let i = 0; i < lineas.length; i++) {
    const titulo = lineas[i].trim().match(RE_TITULO);
    if (!titulo) continue;
    const clase = titulo[1].toLowerCase();
    const porNivel = new Map();
    let nivelActual = null;
    let k = i + 1;
    while (k < lineas.length && k < i + 400) {
      const linea = lineas[k].trim();
      if (/^Lista de conjuros del /i.test(linea)) break;
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
