// Tarea 3A.1 (ola de arreglos, I8) — la limpieza de la prosa HTML de Foundry, en UN solo sitio.
// Hasta esta ola vivía copiada tres veces (`salida.mjs`, `aptitudes.mjs`, `razas.mjs`, «para no
// crear una dependencia circular») y las tres se habían separado ya: solo una quitaba las
// tiradas en línea, ninguna quitaba `&Reference[...]`. Este módulo no importa nada, así que
// nadie puede depender de él en círculo.
//
// E-3A1-7: `<p>`→saltos de línea, marcas fuera, `@UUID[...]{Nombre}`→`Nombre`,
// `@embed[...]{Nombre}`→`Nombre`, `[[lookup ...]]`→fuera (un valor calculado en vivo por el
// cliente de Foundry), `[[/r fórmula]]{Etiqueta}`→`Etiqueta` (una tirada en línea; la fórmula
// nunca llega al catálogo), `&Reference[término opciones]{Etiqueta}`→`Etiqueta` o `término` (un
// enlace de Foundry a una regla —`&Reference[paralyzed]`, `&reference[charmed apply=false]`— que
// en la fuente YAML va escapado como `&amp;Reference`), `&nbsp;`→espacio. **Ninguna `@`
// sobrevive**: la misma frontera que `catalog.schema.ts` comprueba al final.

const RE_REFERENCIA_CON_ETIQUETA = /&(?:amp;)?[Rr]eference\[([^\]\s]+)[^\]]*\]\{([^}]*)\}/g;
const RE_REFERENCIA = /&(?:amp;)?[Rr]eference\[([^\]\s]+)[^\]]*\]/g;

export function limpiarProsa(html) {
  if (!html) return "";
  return html
    .replace(/@UUID\[[^\]]*\]\{([^}]*)\}/g, "$1")
    .replace(/@UUID\[[^\]]*\]/g, "")
    .replace(/@embed\[[^\]]*\]\{([^}]*)\}/g, "$1")
    .replace(/@embed\[[^\]]*\]/g, "")
    .replace(/\[\[lookup\s+[^\]]*\]\](?:\{[^}]*\})?/g, "")
    .replace(/\[\[\/(?:r|roll|gmroll|blindroll)\s+[^\]]*\]\]\{([^}]*)\}/gi, "$1")
    .replace(/\[\[\/(?:r|roll|gmroll|blindroll)\s+[^\]]*\]\]/gi, "")
    .replace(RE_REFERENCIA_CON_ETIQUETA, "$2")
    .replace(RE_REFERENCIA, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const RE_A_NIVELES_SUPERIORES_EN = /\n\s*At Higher Levels\.?\s*/;

/**
 * Separa «At Higher Levels.» de la prosa inglesa ya limpia (E-3A1-7: «A niveles superiores» va
 * aparte, `higherLevelsEn`/`higherLevelsEs` — el español ya lo separaba `srd-es.mjs`; el inglés
 * no lo separaba nadie hasta esta ola: 0/319 tenían `higherLevelsEn` y 74 lo llevaban inline).
 * Devuelve `{ textEn, higherLevelsEn }`; `higherLevelsEn` es `undefined` si no hay rótulo.
 */
export function separarNivelesSuperiores(textoEn) {
  const m = RE_A_NIVELES_SUPERIORES_EN.exec(textoEn);
  if (!m) return { textEn: textoEn, higherLevelsEn: undefined };
  const textEn = textoEn.slice(0, m.index).trim();
  const higherLevelsEn = textoEn.slice(m.index + m[0].length).trim();
  return { textEn, higherLevelsEn: higherLevelsEn || undefined };
}

/**
 * Clave estable del catálogo a partir del NOMBRE del ítem (ola de arreglos, I13): Foundry pone
 * `system.identifier` de la edición 2024 a ítems de 2014 (`monks-focus` para Ki,
 * `deflect-attacks` para Deflect Missiles, `befuddlement` para Feeblemind…). El nombre es el de
 * 2014, así que la clave sale de él: minúsculas, sin diacríticos, apóstrofos fuera
 * («Hunter's Mark» → `hunters-mark`, igual que el identificador), lo demás a guiones.
 */
export function claveDeNombre(nombre) {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
