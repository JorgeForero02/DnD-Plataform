// Tarea 3.1 (correcciones de interfaz, 2026-09-19) — **una sola forma de enumerar en español.**
//
// Tres sitios juntaban una lista de nombres a mano, cada uno con su propio `.join(" y ")` o
// concatenación: `TiraDeIniciativa.tsx` (quién falta por tirar), `dm-tables/vocabulario.ts`
// (objetos y monedas de una entrega) y `EconomiaDeAccion.tsx` (`fraseDeExceso`, qué recursos se
// han pasado). Los tres querían lo mismo —«A», «A y B», «A, B y C»— y solo el último lo tenía
// bien para tres o más elementos.

/** «A», «A y B», «A, B y C». Sin `Intl.ListFormat`: small-ICU (ver character-sheet/vocabulario.ts). */
export function enumerar(partes: readonly string[]): string {
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}
