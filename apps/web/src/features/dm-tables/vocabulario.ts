import type { TableTrigger } from "@dnd/shared";

// Tarea 2C.6 — el vocabulario de una tabla del DM.
//
// **Ningún valor de enumeración llega a la pantalla** (docs/04-convenciones.md). `TableTrigger`
// viaja en inglés y en mayúsculas; este es el único sitio de `features/dm-tables` donde se
// convierte en español, igual que `features/rolls/vocabulario.ts` para los modos de tirada y
// `features/entities/visibilidad.ts` para los niveles de visibilidad — que **se importan**, no se
// vuelven a escribir aquí.
//
// Vive aparte del componente a propósito: un módulo que exporta a la vez componentes y constantes
// rompe el refresco rápido de React, y el linter lo avisa.

export interface DisparadorDeTabla {
  trigger: TableTrigger;
  /** Lo que se lee en el radio y en la fila de la lista. */
  etiqueta: string;
  /**
   * La frase que explica **cuándo se consulta sola**.
   *
   * Es texto de interfaz, no una regla: quien decide es
   * `apps/api/src/dm-tables/dm-tables.service.ts` junto con el interruptor de la campaña. Si
   * alguna vez discrepan, el que miente es este fichero.
   */
  frase: string;
}

export const DISPARADORES: readonly DisparadorDeTabla[] = [
  {
    trigger: "NONE",
    etiqueta: "Solo a mano",
    frase: "No se dispara sola. La tiras tú cuando quieras: botín, rumores, encuentros.",
  },
  {
    trigger: "CRITICAL",
    etiqueta: "Al sacar un crítico",
    frase:
      "Se consulta sola cuando alguien saca un 20 natural, y solo con la regla de la casa encendida.",
  },
  {
    trigger: "FUMBLE",
    etiqueta: "Al sacar una pifia",
    frase:
      "Se consulta sola cuando alguien saca un 1 natural, y solo con la regla de la casa encendida.",
  },
];

export function disparadorDeTabla(trigger: TableTrigger): DisparadorDeTabla {
  return DISPARADORES.find((d) => d.trigger === trigger) ?? DISPARADORES[0];
}

/**
 * Las dos posiciones del interruptor de la casa, con lo que cambia cada una.
 *
 * **La frase de «apagada» es la que importa** y es la que dice el SRD: un crítico duplica los
 * dados y no los modificadores, y nada más ocurre.
 */
export const POSICIONES_DE_LA_CASA: readonly {
  enabled: boolean;
  etiqueta: string;
  frase: string;
}[] = [
  {
    enabled: false,
    etiqueta: "Apagada",
    frase:
      "Un crítico sigue duplicando dados y nada más. Las tablas se siguen pudiendo tirar a mano.",
  },
  {
    enabled: true,
    etiqueta: "Encendida",
    frase:
      "Un crítico o una pifia consultan además la tabla que tenga ese disparador, y el resultado entra en la partida.",
  },
];
