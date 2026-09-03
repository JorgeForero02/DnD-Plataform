// Carril B1 — la conversión de unidades de peso, en un solo sitio.
//
// **Peso en pantalla, kg; en la API, onzas** (docs/04-convenciones.md). 16 oz = 1 libra,
// 1 libra ~= 0,4536 kg (`WEIGHT_OZ_PER_LB` en `@dnd/shared/item.schema.ts`, que no se reimporta
// aquí a propósito: esa constante vive en el esquema porque el servidor la necesita para
// validar, y esta es la única fórmula del lado de la pantalla — duplicar la constante como
// número literal es más barato que acoplar `features/inventory` a la forma exacta del paquete
// compartido para un solo número que no cambia).
const OZ_PER_LB = 16;
const KG_PER_LB = 0.45359237;

/** Onzas (la unidad de la API) a kilogramos (la unidad de la pantalla). */
export function ozAKg(oz: number): number {
  return (oz / OZ_PER_LB) * KG_PER_LB;
}

/** Kilogramos, redondeados a una cifra decimal — lo que enseña la pantalla. */
export function formatearKg(oz: number): string {
  return `${ozAKg(oz).toFixed(1)} kg`;
}
