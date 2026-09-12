import type { InventoryRow } from "./api";

/**
 * HP-9a (2026-09-12) — «Sintonizar cuenta». El servidor aplica los `effects` de un objeto que
 * exige sintonización **solo si la fila está sintonizada** (`apps/api/src/rules/items.ts`,
 * `efectosActivos`; SRD 5.1 §Attunement); lo mundano —CA base, dado del arma— cuenta siempre.
 *
 * Este es el único sitio de la web donde se escribe ese predicado: la fila y el detalle lo
 * importan para tachar el bono y poner la marca, y así no pueden discrepar entre sí ni con el
 * motor. Se lee `row.attuned` (la verdad de la fila) y **nunca `item.attuned`**: en el listado
 * del inventario el objeto anidado sale del catálogo y siempre trae `false`.
 *
 * Un objeto que exige sintonización pero no tiene `effects` no tiene nada que perder: no se
 * marca, para no anunciar un efecto inactivo que no existe.
 */
export function efectoInactivoPorSintonizacion(
  row: Pick<InventoryRow, "attuned"> & {
    item: Pick<InventoryRow["item"], "requiresAttunement" | "effects">;
  },
): boolean {
  return row.item.requiresAttunement && !row.attuned && row.item.effects.length > 0;
}
