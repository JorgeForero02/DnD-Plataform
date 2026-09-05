import type { DamageType } from "@dnd/shared";

// D-OP-14 — **el vocabulario de los tipos de daño, una vez y con dos formas.**
//
// Había **tres** copias —`features/character-sheet/vocabulario.ts`,
// `features/campaign-items/vocabulario.ts` y `features/inventory/vocabulario.ts`— y **no decían lo
// mismo**. Comparadas entrada por entrada el 2026-09-06: las dos primeras son **idénticas** en las
// trece; `inventory` difiere en **cuatro** —`contund.`, `perf.`, `cort.` y **`rayo`** donde las
// otras dicen `relámpago`—.
//
// **Por eso no se fusionan en una sola tabla, y esto es la decisión que un futuro «unificador» va a
// querer deshacer:** la forma corta de `inventory` no es un descuido, es lo que hace que su fila
// quepa. Unificar a ciegas rompería esa tabla, y ya se intentó una vez.
//
// ## Dónde vive, y por qué aquí
//
// En `apps/web/src/dominio/`, **no en `packages/shared`**: esto es **forma legible en español**, no
// forma de los datos. `shared` declara qué es un `DamageType`; traducirlo a una palabra que se lee
// en pantalla es cosa de la interfaz, y meterlo allí convertiría el paquete de contratos en un
// diccionario.
//
// Y no vive dentro de un `features/<x>/` porque **lo usan cuatro**: la hoja, el catálogo de
// objetos, el inventario y el bestiario. Un vocabulario de dominio que vive dentro de una pantalla
// es cómo nacieron las tres copias.
//
// ## Quién usa cada forma, y a propósito
//
// | Consumidor | Forma | Por qué |
// |---|---|---|
// | La hoja (`character-sheet`) | **larga** | Se lee, no se ojea: «6 cortante» junto al arma |
// | La traza de daño y el selector de tipo | **larga** | Es una decisión del DM; abreviar la oscurece |
// | El catálogo de objetos (`campaign-items`) | **larga** | Es una ficha, no una tabla apretada |
// | El bestiario (`bestiario`) | **larga** | Igual: se lee una criatura entera |
// | La fila del inventario (`inventory`) | **corta** | **Cabe en la fila**, que es el motivo entero |
//
// ## Las dos tablas son explícitas, y ninguna deriva de la otra
//
// La corta **no** es «la larga salvo excepciones»: es un `Record<DamageType, string>` completo. Con
// un valor por defecto, añadir un tipo de daño nuevo daría una corta silenciosamente larga y la
// fila del inventario se rompería sin que nada avisara. Así, TypeScript **obliga a rellenar las
// dos**.

/** La forma larga: la que se lee. */
export const NOMBRE_TIPO_DANO: Record<DamageType, string> = {
  BLUDGEONING: "contundente",
  PIERCING: "perforante",
  SLASHING: "cortante",
  ACID: "ácido",
  COLD: "frío",
  FIRE: "fuego",
  FORCE: "fuerza",
  LIGHTNING: "relámpago",
  NECROTIC: "necrótico",
  POISON: "veneno",
  PSYCHIC: "psíquico",
  RADIANT: "radiante",
  THUNDER: "trueno",
};

/**
 * La forma corta: la que **cabe en una fila**.
 *
 * Solo cuatro se acortan de verdad; las otras nueve ya eran cortas y se repiten a propósito, para
 * que la tabla sea completa y el compilador pueda exigirla entera.
 */
export const NOMBRE_TIPO_DANO_CORTO: Record<DamageType, string> = {
  BLUDGEONING: "contund.",
  PIERCING: "perf.",
  SLASHING: "cort.",
  ACID: "ácido",
  COLD: "frío",
  FIRE: "fuego",
  FORCE: "fuerza",
  LIGHTNING: "rayo",
  NECROTIC: "necrótico",
  POISON: "veneno",
  PSYCHIC: "psíquico",
  RADIANT: "radiante",
  THUNDER: "trueno",
};

/**
 * **Nunca devuelve la clave a secas ni una cadena vacía.**
 *
 * Una clave sin traducir tiene que **verse como tal**, no colarse en la pantalla pareciendo un
 * nombre: es la regla de que ningún valor de enumeración llega a la interfaz. Si algún día la API
 * añade un tipo de daño y esta tabla no lo tiene, sale «Sin traducir: X» y se nota.
 */
function traducir(tabla: Record<DamageType, string>, clave: string): string {
  return tabla[clave as DamageType] ?? `Sin traducir: ${clave}`;
}

/** La forma larga. Lo que usa todo el que **lee** un tipo de daño. */
export function nombreTipoDano(clave: string): string {
  return traducir(NOMBRE_TIPO_DANO, clave);
}

/** La forma corta. Solo la fila del inventario, y por el ancho. */
export function nombreTipoDanoCorto(clave: string): string {
  return traducir(NOMBRE_TIPO_DANO_CORTO, clave);
}
