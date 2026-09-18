import type {
  CharacterSpellState,
  MecanicaDeConjuro,
  SetSpellResponse,
  SpellbookTope,
  SpellSchool,
} from "@dnd/shared";

// Tarea 6 de 3A.2 («elegir, lanzar y usar») — el vocabulario de dominio del libro de conjuros.
//
// **Ningún valor de enumeración llega a la pantalla** (docs/04-convenciones.md): `abj`, `PREPARADO`,
// `dados`... son claves que vienen tal cual de `@dnd/shared`, y este es el único fichero de la
// pantalla de conjuros donde se convierten a español. Sigue el mismo patrón que
// `dominio/dano.ts` — vive en `dominio/` y no dentro de `features/spellbook/` porque, si mañana
// otra pantalla necesita nombrar una escuela o un nivel (el bestiario, un PNJ lanzador), la forma
// legible ya está aquí y no hay que sacarla de un carril de features.

/** Las ocho escuelas de magia del SRD 5.1, con su nombre legible. */
export const NOMBRE_ESCUELA: Record<SpellSchool, string> = {
  abj: "Abjuración",
  con: "Conjuración",
  div: "Adivinación",
  enc: "Encantamiento",
  evo: "Evocación",
  ill: "Ilusión",
  nec: "Nigromancia",
  trs: "Transmutación",
};

/** Los tres estados en los que puede estar un conjuro en la lista de un personaje. */
export const NOMBRE_ESTADO_CONJURO: Record<CharacterSpellState, string> = {
  EN_EL_LIBRO: "En el libro",
  PREPARADO: "Preparado",
  CONOCIDO: "Conocido",
};

/**
 * Lo que un cambio del libro hizo fuera de regla (`SetSpellResponse.fueraDeRegla`, D-CF-126):
 * el servidor lo escribe igual y avisa; la frase se compone aquí, nunca llega el código.
 */
export const NOMBRE_FUERA_DE_REGLA: Record<SetSpellResponse["fueraDeRegla"][number], string> = {
  EN_COMBATE: "Fuera de regla: en combate.",
  SOBRE_EL_TOPE: "Fuera de regla: por encima del tope; el DM decide.",
};

/** «Truco» para nivel 0; «Nivel N» para el resto — igual que el resto del catálogo lo nombra. */
export function NOMBRE_NIVEL_CONJURO(level: number): string {
  return level === 0 ? "Truco" : `Nivel ${level}`;
}

/** De qué familia es la mecánica de un conjuro, para que la pantalla decida qué explicar. */
export const NOMBRE_MECANICA: Record<MecanicaDeConjuro, string> = {
  ataque: "Ataque",
  salvacion: "Salvación",
  dados: "Daño o curación",
  utilidad: "Utilidad",
  prueba: "Prueba",
  texto: "Texto",
};

/**
 * Las cuatro claves de tope que puede traer `SpellbookResponse.topes`, con la frase corta que
 * pinta la cabecera de la tarjeta: «5 de 6 preparados». Una sola función y no cuatro literales
 * repetidos en la pantalla, porque las cuatro comparten la misma forma «actual de max clave».
 */
const NOMBRE_TOPE: Record<"preparados" | "trucos" | "libro" | "conocidos", string> = {
  preparados: "preparados",
  trucos: "trucos",
  libro: "en el libro",
  conocidos: "conocidos",
};

export function fraseDeTope(
  clave: "preparados" | "trucos" | "libro" | "conocidos",
  tope: SpellbookTope,
): string {
  return `${tope.actual} de ${tope.max} ${NOMBRE_TOPE[clave]}`;
}
