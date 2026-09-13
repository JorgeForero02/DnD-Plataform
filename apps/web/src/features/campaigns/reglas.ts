import {
  tableRulesSchema,
  type AbilitiesRule,
  type OroInicial,
  type PgNivelesSiguientes,
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
export const AVISO_NO_RETROACTIVO =
  "Estas reglas valen para los personajes que se creen a partir de ahora.";

/** Rellena defaults sobre lo que llegue (una respuesta vieja sin `tableRules`, `{}`, o un parcial). */
export function reglasCompletas(parcial: unknown): TableRules {
  return tableRulesSchema.parse(parcial ?? {});
}
