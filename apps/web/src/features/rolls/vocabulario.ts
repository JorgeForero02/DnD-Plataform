import type { RollMode, RollResult } from "@dnd/shared";

// Tarea F3 — el vocabulario de una tirada.
//
// **Ningún valor de enumeración llega a la pantalla** (docs/04-convenciones.md). `RollMode`,
// `natural` y `outcome` son tres enumeraciones que el servidor manda en inglés y en mayúsculas;
// este fichero es el único sitio de `features/rolls` donde se convierten en español, igual que
// `features/character-sheet/vocabulario.ts` lo es para las claves del motor y
// `features/entities/visibilidad.ts` para los niveles de visibilidad.
//
// Vive aparte del componente a propósito: un módulo que exporta a la vez componentes y
// constantes rompe el refresco rápido de React, y el linter lo avisa.

export interface ModoDeTirada {
  modo: RollMode;
  /** Lo que se lee en el radio. */
  etiqueta: string;
  /**
   * La frase que explica qué hace. **No es decoración**: ventaja y desventaja son la decisión
   * táctica más frecuente de una mesa de 5.ª edición, y hasta F3 la única forma de pedirlas era
   * escribir `2d20kh1` a mano.
   *
   * Esto es **texto de interfaz, no una regla**: quien convierte el `d20` en `2d20kh1` es
   * `conVentaja` (`apps/api/src/rolls/rolls.service.ts`). Si alguna vez dejan de coincidir, el
   * que miente es este fichero.
   */
  frase: string;
}

export const MODOS_DE_TIRADA: readonly ModoDeTirada[] = [
  { modo: "NORMAL", etiqueta: "Normal", frase: "Un solo d20." },
  { modo: "ADVANTAGE", etiqueta: "Ventaja", frase: "Dos d20: se queda el alto." },
  { modo: "DISADVANTAGE", etiqueta: "Desventaja", frase: "Dos d20: se queda el bajo." },
];

export function modoDeTirada(modo: RollMode): ModoDeTirada {
  return MODOS_DE_TIRADA.find((m) => m.modo === modo) ?? MODOS_DE_TIRADA[0];
}

/**
 * El rótulo que dice **cuál de los dos dados se queda**, sacado de la expresión que el servidor
 * dice haber tirado — no del modo que el cliente pidió.
 *
 * Es deliberado y es la regla de «si la interfaz explica una regla del servidor, el servidor
 * manda». `conVentaja` ignora la petición cuando la expresión no es un `d20` suelto (pedir
 * ventaja sobre `4d6kh3` no significa nada), y en ese caso devuelve la expresión intacta: un
 * rótulo sacado del modo pedido diría «se queda el alto» sobre una tirada donde no se descartó
 * nada. Sacado de la expresión devuelta, no puede mentir.
 */
export function rotuloDeConservacion(expression: string): string | null {
  if (/kh\d+/i.test(expression)) return "se queda el alto";
  if (/kl\d+/i.test(expression)) return "se queda el bajo";
  return null;
}

/**
 * **Una palabra, y nada más.** El 20 y el 1 naturales se cantan en la mesa, así que se marcan;
 * pero se marcan con un filete de cobre y una palabra, no con una celebración. El ornamento
 * informa o enmarca, nunca compite (docs/04-convenciones.md).
 */
const PALABRA_DE_NATURAL: Record<RollResult["natural"], string | null> = {
  NONE: null,
  TWENTY: "Crítico",
  ONE: "Pifia",
};

export function palabraDeNatural(natural: RollResult["natural"]): string | null {
  return PALABRA_DE_NATURAL[natural] ?? null;
}

/**
 * El resultado frente a la Clase de Dificultad, cuando la había. Hoy la hoja nunca manda `dc`
 * —se tira sin CD, que es lo que pasa en la mesa—, pero el campo llega en la respuesta y una
 * enumeración que se pinte sin traducir es el fallo que esta casa existe para evitar.
 */
const FRASE_DE_RESULTADO: Record<RollResult["outcome"], (dc: number) => string | null> = {
  NO_DC: () => null,
  SUCCESS: (dc) => `Supera la CD ${dc}.`,
  FAILURE: (dc) => `No llega a la CD ${dc}.`,
};

export function fraseDeResultado(resultado: Pick<RollResult, "outcome" | "dc">): string | null {
  if (resultado.dc === undefined) return null;
  return FRASE_DE_RESULTADO[resultado.outcome](resultado.dc);
}
