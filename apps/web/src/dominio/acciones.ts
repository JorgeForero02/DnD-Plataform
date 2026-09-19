import type {
  AccionDisponible,
  CosteDeAccion,
  GrupoDeAccion,
  MotivoNoDisponible,
} from "@dnd/shared";
import { NOMBRE_MECANICA } from "./conjuros";
import { nombreTipoDano } from "./dano";

// Task 4 de 3A.3 (T22) — el vocabulario de la barra de acciones, **una sola vez**. `GrupoDeAccion`,
// `CosteDeAccion` y `MotivoNoDisponible` (`packages/shared/src/actions.schema.ts`) son claves de
// vocabulario cerrado que el servidor manda en `GET …/actions`; ninguna llega a la pantalla sin
// pasar por aquí (docs/04-convenciones.md: «ningún valor de enumeración llega a la pantalla»).
//
// Vive en `dominio/` y no dentro de `features/actions/` porque la Task 5 (el centro «sin tablero»)
// y cualquier pantalla futura que quiera nombrar un grupo o un motivo lo va a necesitar igual — el
// mismo criterio que ya documentan `dominio/combate.ts` y `dominio/conjuros.ts`.

/** Los cinco cajones de la barra, en el orden del prototipo (Ataques · Conjuros · Aptitudes ·
 *  Objetos · Esquivar, ayudar…). */
export const ORDEN_DE_GRUPOS: GrupoDeAccion[] = [
  "ATAQUES",
  "CONJUROS",
  "APTITUDES",
  "OBJETOS",
  "BASICAS",
];

/** El rótulo del botón que abre cada menú. «Esquivar, ayudar…» es el propio prototipo, no una
 *  paráfrasis: las ocho básicas del SRD (Esquivar, Ayudar, Esconderse, Destrabarse, Correr,
 *  Preparar, Buscar, Usar un objeto — los nombres los pone el servidor, `basic-actions.ts`)
 *  no caben en una sola palabra y esa es la que eligió. */
export const NOMBRE_GRUPO: Record<GrupoDeAccion, string> = {
  ATAQUES: "Ataques",
  CONJUROS: "Conjuros",
  APTITUDES: "Aptitudes",
  OBJETOS: "Objetos",
  BASICAS: "Esquivar, ayudar…",
};

/** El verbo del botón «Usar»/«Lanzar»/«Atacar»/«Beber» de cada fila (brief, forma del prototipo).
 *  Objetos usa «Beber» porque el consumible de la barra es, en la práctica, siempre una poción o
 *  algo que se bebe/come/usa de un trago — el mismo verbo corto que ya eligió el prototipo; un
 *  objeto que no se bebe (una antorcha) sigue mandando `POST …/consume`, solo que con un verbo que
 *  no describe el gesto al pie de la letra. Ruling, ver el informe de la tarea.
 */
export const VERBO_DE_GRUPO: Record<GrupoDeAccion, string> = {
  ATAQUES: "Atacar",
  CONJUROS: "Lanzar",
  APTITUDES: "Usar",
  OBJETOS: "Beber",
  BASICAS: "Usar",
};

/** El coste, en el vocabulario de la barra (`CosteDeAccion`, no el `Coste` de cuatro miembros de
 *  la economía del turno — ver el comentario de cabecera de `actions.schema.ts`). */
export const NOMBRE_COSTE: Record<CosteDeAccion, string> = {
  ACTION: "acción",
  BONUS: "acción adicional",
  REACTION: "reacción",
  FREE: "gratis",
  TIEMPO: "tiempo",
};

/**
 * Por qué una fila está en gris, o por qué trae un aviso aunque se pueda usar igual
 * (`NO_PREPARADO` es el único motivo que no apaga — D-CF-126, `ActionsService.disponible`).
 * **El texto es el que se lee en la fila apagada**: `ACCION_GASTADA` es literalmente «ya gastaste
 * tu acción» porque el e2e de esta tarea lo comprueba tal cual.
 */
export const NOMBRE_MOTIVO: Record<MotivoNoDisponible, string> = {
  SIN_ESPACIO: "sin espacios de ese nivel",
  SIN_USOS: "sin usos",
  NO_PREPARADO: "no lo tienes preparado",
  ACCION_GASTADA: "ya gastaste tu acción",
  ADICIONAL_GASTADA: "ya gastaste tu acción adicional",
  REACCION_GASTADA: "ya gastaste tu reacción",
  NO_ES_TU_TURNO: "no es tu turno",
  SIN_CANTIDAD: "no te queda ninguno",
  NO_EQUIPADA: "no está equipada",
  FUERA_DE_COMBATE: "fuera de combate",
};

/** La frase completa de una fila apagada: uno o varios motivos, unidos con «y». Nunca una cadena
 *  vacía — quien llama solo la usa cuando `motivos.length > 0`. */
export function fraseDeMotivos(motivos: MotivoNoDisponible[]): string {
  const partes = motivos.map((m) => NOMBRE_MOTIVO[m]);
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

/** El resumen mecánico corto de una fila, cuando lo hay: «1d20+5 vs CA», «1d8+3 cortante», o solo
 *  el nombre del tipo de mecánica cuando no hay dados (conjuros y aptitudes, ruling de la Task 1:
 *  `mecanica` para esos dos grupos solo trae `{ tipo }`, nunca `dados`/`tipoDeDano` — **se pinta
 *  lo que hay, sin inventar una expresión que el servidor no mandó**). */
export function fraseDeMecanica(mecanica: NonNullable<AccionDisponible["mecanica"]>): string {
  if (mecanica.dados) {
    return mecanica.tipoDeDano
      ? `${mecanica.dados} ${nombreTipoDano(mecanica.tipoDeDano)}`
      : mecanica.dados;
  }
  return NOMBRE_MECANICA[mecanica.tipo];
}

/**
 * El recurso que gasta la fila: «espacio de nivel 2 · 1/2», «uso 2/3», «quedan 3».
 *
 * **`quedan N`, no `×N`.** El brief («×3») usaba el signo de multiplicar como el prototipo, pero
 * es exactamente el glifo que `Iconos.test.tsx` prohíbe en todo el código fuente (D-CF, «ningún
 * glifo de fuente vuelve al código como icono») — lo cazó esa misma prueba, no una lectura. Coste
 * si está mal: ninguno; es una palabra en vez de un símbolo, dice lo mismo.
 */
export function fraseDeRecurso(recurso: NonNullable<AccionDisponible["recurso"]>): string {
  const cantidad = recurso.max === null ? `${recurso.actual}` : `${recurso.actual}/${recurso.max}`;
  if (recurso.tipo === "ESPACIO") {
    return `espacio de nivel ${recurso.nivel ?? "?"} · ${cantidad}`;
  }
  if (recurso.tipo === "USO") {
    return `uso ${cantidad}`;
  }
  return `quedan ${recurso.actual}`;
}
