import { ABILITY_KEYS, SKILLS } from "@dnd/shared";
import type { AbilityKey, SkillKey } from "@dnd/shared";
import { NOMBRE_CARACTERISTICA, NOMBRE_HABILIDAD } from "../character-sheet/vocabulario";

// Tarea 2C.5 — el vocabulario de una petición de tirada.
//
// **Ningún valor de enumeración llega a la pantalla** (docs/04-convenciones.md), y **la
// traducción vive una sola vez por dominio**: las dieciocho habilidades y las seis
// características ya están en español en `features/character-sheet/vocabulario.ts`, así que aquí
// **se importan**, no se reescriben. Escribir una segunda tabla de nombres de habilidad sería
// exactamente la deriva que esa regla existe para impedir — y la que ya se pagó una vez cuando la
// copia de razas y clases del navegador se quedó contradiciendo a la del servidor en diez claves.
//
// Lo único que este fichero escribe de nuevo son los seis rótulos de la guía de CD, porque **el
// servidor manda claves y no prosa** a propósito (`apps/api/src/rules/catalog/difficulty.ts`).

/** Una cosa que se puede pedir: la clave que entiende el motor y su nombre en español. */
export interface OpcionDeTirada {
  /** `skill.perception`, `save.dex`: la forma que deriva la hoja (`apps/api/src/rules/engine.ts`). */
  key: string;
  etiqueta: string;
}

/**
 * Las seis salvaciones, en el orden del SRD (FUE, DES, CON, INT, SAB, CAR) — el mismo de
 * `ABILITY_KEYS`, que es de donde sale la lista para no transcribirla.
 */
export const SALVACIONES: readonly OpcionDeTirada[] = ABILITY_KEYS.map((ability) => ({
  key: `save.${ability}`,
  etiqueta: `Salvación de ${NOMBRE_CARACTERISTICA[ability]}`,
}));

/**
 * Las dieciocho habilidades, **ordenadas por su nombre en español** y no por su clave inglesa:
 * quien busca «Sigilo» en una lista lo busca por la S, no por la de `stealth`.
 */
export const HABILIDADES: readonly OpcionDeTirada[] = (Object.keys(SKILLS) as SkillKey[])
  .map((skill) => ({ key: `skill.${skill}`, etiqueta: NOMBRE_HABILIDAD[skill] }))
  .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));

/**
 * El nombre en español de una clave de la hoja. Si no la reconoce **lo dice**, como
 * `traducirLabelKey`: nunca devuelve la clave cruda como si fuera prosa.
 */
export function nombreDeClave(key: string): string {
  const habilidad = /^skill\.(.+)$/.exec(key);
  if (habilidad && habilidad[1] in SKILLS) return NOMBRE_HABILIDAD[habilidad[1] as SkillKey];

  const salvacion = /^save\.(.+)$/.exec(key);
  if (salvacion && (ABILITY_KEYS as readonly string[]).includes(salvacion[1])) {
    return `Salvación de ${NOMBRE_CARACTERISTICA[salvacion[1] as AbilityKey]}`;
  }

  const caracteristica = /^ability\.(.+)$/.exec(key);
  if (caracteristica && (ABILITY_KEYS as readonly string[]).includes(caracteristica[1])) {
    return `Prueba de ${NOMBRE_CARACTERISTICA[caracteristica[1] as AbilityKey]}`;
  }

  return `Sin traducir: ${key}`;
}

/**
 * Los rótulos de la tabla «Typical Difficulty Classes» del SRD 5.1.
 *
 * **Las claves las manda el servidor y los nombres se escriben aquí, una sola vez.** Si aparece
 * una clave que esta tabla no conoce, se ve «Sin traducir: <clave>» — visible, no silencioso.
 */
export const NOMBRE_DE_CD: Record<string, string> = {
  "very-easy": "Muy fácil",
  easy: "Fácil",
  medium: "Media",
  hard: "Difícil",
  "very-hard": "Muy difícil",
  "nearly-impossible": "Casi imposible",
};

export function nombreDeCd(key: string): string {
  return NOMBRE_DE_CD[key] ?? `Sin traducir: ${key}`;
}
