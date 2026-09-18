import type { RollAudience, RollMode, RollResultRevealed } from "@dnd/shared";
import type { Caras } from "./bandeja";

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
const PALABRA_DE_NATURAL: Record<RollResultRevealed["natural"], string | null> = {
  NONE: null,
  TWENTY: "Crítico",
  ONE: "Pifia",
};

export function palabraDeNatural(natural: RollResultRevealed["natural"]): string | null {
  return PALABRA_DE_NATURAL[natural] ?? null;
}

/**
 * El resultado frente a la Clase de Dificultad, cuando la había. Hoy la hoja nunca manda `dc`
 * —se tira sin CD, que es lo que pasa en la mesa—, pero el campo llega en la respuesta y una
 * enumeración que se pinte sin traducir es el fallo que esta casa existe para evitar.
 */
const FRASE_DE_RESULTADO: Record<RollResultRevealed["outcome"], (dc: number) => string | null> = {
  NO_DC: () => null,
  SUCCESS: (dc) => `Supera la CD ${dc}.`,
  FAILURE: (dc) => `No llega a la CD ${dc}.`,
};

export function fraseDeResultado(
  resultado: Pick<RollResultRevealed, "outcome" | "dc">,
): string | null {
  if (resultado.dc === undefined) return null;
  return FRASE_DE_RESULTADO[resultado.outcome](resultado.dc);
}

// ---------------------------------------------------------------------------------------------
// Tarea 2C.2 — **a quién va dirigida una tirada**, en palabras de mesa.
//
// `RollAudience` es una enumeración del contrato (`packages/shared/src/roll.schema.ts`) y este es
// el único sitio de la web donde se convierte en español, igual que `MODOS_DE_TIRADA` de arriba.
// Las tres frases describen lo que hace `VISIBILIDAD_POR_AUDIENCIA` + `canView`; **no lo
// definen**: si alguna vez discrepan, el que miente es este fichero (docs/04-convenciones.md).
// ---------------------------------------------------------------------------------------------

export interface AudienciaDeTirada {
  audiencia: RollAudience;
  /** Lo que se lee en el radio. */
  etiqueta: string;
  /** La frase que explica **quién ve el resultado**, que es la única diferencia entre las tres. */
  frase: string;
  /** La frase corta que resume la elección cuando el panel está plegado: se lee sola, sin el radio. */
  resumen: string;
}

export const AUDIENCIAS_DE_TIRADA: readonly AudienciaDeTirada[] = [
  {
    audiencia: "PUBLIC",
    etiqueta: "Pública",
    frase: "La mesa entera ve el resultado.",
    resumen: "Para la mesa entera",
  },
  {
    audiencia: "DM_PRIVATE",
    etiqueta: "Privada del DM",
    frase: "La ves tú y el DM; el resto de la mesa, no.",
    resumen: "Privada del DM",
  },
  {
    audiencia: "BLIND",
    // **No dice «solo el DM»** a secas: lo que la hace distinta de la privada es que quien tira
    // tampoco ve su propio resultado, y esa es la mitad que el proyecto tardó una fase en tener.
    etiqueta: "A ciegas",
    frase: "Solo el DM ve el resultado; tú no.",
    resumen: "A ciegas",
  },
];

/** Busca la audiencia por su clave, igual forma que `modoDeTirada` (línea 37). */
export function audienciaDeTirada(a: RollAudience): AudienciaDeTirada {
  const encontrada = AUDIENCIAS_DE_TIRADA.find((x) => x.audiencia === a);
  if (!encontrada) throw new Error(`Audiencia de tirada desconocida: ${a}`);
  return encontrada;
}

/**
 * Los siete dados que se tiran en la mesa, para los atajos.
 *
 * **Es la lista del juego, no una lista de números bonitos**: el d100 entra porque existe en las
 * tablas de la 5.ª edición, y el d3 y el d2 no, porque en el SRD se tiran como mitades de otro
 * dado y ofrecerlos invitaría a escribir expresiones que el evaluador rechaza.
 */
export const DADOS_DE_ATAJO: readonly Caras[] = [4, 6, 8, 10, 12, 20, 100];
