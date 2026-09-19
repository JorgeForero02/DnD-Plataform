import {
  tableRulesSchema,
  type AbilitiesRule,
  type OroInicial,
  type PgNivelesSiguientes,
  type Progresion,
  type TableRules,
} from "@dnd/shared";

// Reglas de la mesa (D-CF-53) — **la forma legible, una vez por dominio**. Ningún `metodo`, `modo`
// ni `pgNivelesSiguientes` llega a la pantalla: se pasa por aquí.
// Si una frase explica una regla del servidor y discrepan, miente la frase (04-convenciones.md).

export const NOMBRE_METODO: Record<AbilitiesRule["metodo"], { etiqueta: string; frase: string }> = {
  LIBRE: {
    etiqueta: "Libres",
    frase: "Cada jugador escribe sus seis números, de 1 a 30, uno a uno.",
  },
  MATRIZ: {
    etiqueta: "Matriz estándar",
    frase: "15, 14, 13, 12, 10 y 8, repartidos como cada jugador quiera (SRD 5.1).",
  },
  PUNTOS: {
    etiqueta: "Compra por puntos",
    frase:
      "Puntos a repartir entre 8 y 15 por característica; cada valor tiene su coste (SRD 5.1, variante).",
  },
  // El DM sí puede corregir los seis valores del jugador directamente tras elegir (E-RM-13):
  // solo el jugador está bloqueado, así que la frase habla de "quedan fijados" para el jugador
  // y aclara quién conserva la llave, no que nadie la tenga.
  DADOS: {
    etiqueta: "Con dados",
    frase:
      "El servidor tira la expresión seis veces, tantos intentos como digas; cada jugador se queda con uno y sus seis números quedan fijados; solo el DM puede corregirlos.",
  },
};
export const NOMBRE_PG: Record<PgNivelesSiguientes, { etiqueta: string; frase: string }> = {
  MAXIMO: {
    etiqueta: "Máximo del dado",
    frase: "Cada nivel del 2 en adelante da el dado de golpe entero, más Constitución.",
  },
  MEDIA: {
    etiqueta: "Media del dado",
    frase:
      "La media redondeada arriba (d6→4, d8→5, d10→6, d12→7), más Constitución. Es lo de siempre.",
  },
  TIRADA: {
    etiqueta: "Tirada por nivel",
    frase: "El servidor tira el dado de golpe una vez por nivel y lo escribe en el hilo.",
  },
};
export const NOMBRE_ORO: Record<OroInicial["modo"], { etiqueta: string; frase: string }> = {
  EQUIPO: {
    etiqueta: "Equipo de clase",
    frase: "Sin oro: el DM da el equipo a mano, como hasta ahora.",
  },
  ORO_TABLA: {
    etiqueta: "Oro de la tabla",
    frase:
      "El servidor tira la riqueza inicial de la clase (SRD 5.1: guerrero 5d4x10 po, mago 4d4x10 po…) al fijar la clase.",
  },
  ORO_FIJO: { etiqueta: "Oro fijo", frase: "Todos nacen con la misma cantidad de piezas de oro." },
};
/**
 * Puerta de efectos §5 bis (D-CF-68) — cómo sube de nivel la mesa. `HITO` es el defecto: una
 * campaña que ya existe no cambia de comportamiento hasta que el DM elige `XP` a propósito
 * (D-CF-53). Las dos frases dicen la verdad completa del servidor, no la de la maqueta: en los
 * dos modos **el DM sigue siendo quien sube el nivel** (D-CF-66) — «por experiencia» solo añade
 * que la hoja cuenta y avisa.
 */
export const NOMBRE_PROGRESION: Record<Progresion, { etiqueta: string; frase: string }> = {
  HITO: {
    etiqueta: "Por hito",
    frase:
      "El DM decide cuándo sube cada personaje; la hoja no cuenta experiencia. Es lo de siempre.",
  },
  XP: {
    etiqueta: "Por experiencia",
    frase:
      "La hoja cuenta PX contra la tabla del SRD y avisa cuando toca subir; el DM da los PX desde la mesa y sigue siendo quien sube el nivel.",
  },
};

/**
 * **Acotado a las reglas de creación** (ola de arreglos 1 de la puerta de efectos). La frase
 * valía para todo el bloque y era falsa para «Progresión»: cambiarla mueve de inmediato la hoja
 * de TODOS los personajes (aparece o desaparece el marcador de PX), la columna del DM (el botón
 * «Dar PX») y lo que propone el final de un combate. Texto que explica una regla del servidor y
 * discrepa: miente el texto, así que cada aviso dice exactamente lo que alcanza.
 */
export const AVISO_NO_RETROACTIVO =
  "Las reglas de creación —características, nivel inicial, puntos de golpe, permitidos y oro— valen para los personajes que se creen a partir de ahora.";

/** Bajo «Progresión», porque esa sí cambia la mesa entera al guardar. */
export const AVISO_PROGRESION_INMEDIATA =
  "La progresión vale para toda la mesa desde que se guarda: cambia la hoja de todos los personajes que ya existen.";

/** Rellena defaults sobre lo que llegue (una respuesta vieja sin `tableRules`, `{}`, o un parcial). */
export function reglasCompletas(parcial: unknown): TableRules {
  return tableRulesSchema.parse(parcial ?? {});
}
