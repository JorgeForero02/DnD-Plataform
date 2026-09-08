import type { EntregaInput, TableTrigger } from "@dnd/shared";
import { COIN_KEYS } from "@dnd/shared";

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

/**
 * **Lo que el botón dice sin abrirse.** Es la mitad de la decisión de esconder la entrega en un
 * panel: si el botón no cuenta lo que hay dentro, el DM tiene que abrir las veinte filas para
 * saber cuál da botín.
 */
export function resumenDeEntrega(entrega: EntregaInput | undefined): string {
  if (!entrega) return "no entrega nada";
  const objetos = entrega.objetos?.length ?? 0;
  const hayMonedas = COIN_KEYS.some((clave) => (entrega.monedas?.[clave] ?? 0) > 0);
  const trozos: string[] = [];
  if (objetos > 0) trozos.push(`${objetos} ${objetos === 1 ? "objeto" : "objetos"}`);
  if (hayMonedas) trozos.push("monedas");
  // Una entrega presente pero sin nada dentro no debería existir —el `.refine` del esquema la
  // rechaza— pero si llegara de la base escrita por otra vía, se dice en vez de pintar un botón
  // que promete algo y no lo tiene.
  return trozos.length === 0 ? "no entrega nada" : trozos.join(" y ");
}
