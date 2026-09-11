import { COIN_WEIGHT_OZ, type ResolvedItem } from "@dnd/shared";
import type { InventoryItem } from "@prisma/client";

// Carril A4 / migración 6 (D-CF-16) — el peso llevado, en un solo sitio.
//
// Vivía duplicado como método privado de `InventoryService` hasta que la sobrecarga (SRD 5.1,
// Variant: Encumbrance) necesitó el mismo número en `character-sheet.service.ts` para derivar la
// velocidad y las tiradas: dos copias de "cuánto pesa lo que llevas" se separan en cuanto una de
// las dos cambia, igual que ya pasó con `canView` o con `effectiveSpeed`.
//
// Solo lo mínimo del personaje que hace falta (las cinco monedas), no todo `Character`, para que
// esto se pueda llamar tanto con la fila completa de `InventoryService` como con la que ya tiene
// `character-sheet.service.ts` sin acoplar los dos módulos a la forma entera del modelo.
export interface PersonajeConBolsa {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

/**
 * El peso, en onzas, de lo que un personaje **lleva de verdad**: equipado o en la mochila
 * (`CARRIED`/`EQUIPPED`), nunca lo guardado en la posada (`STORED`) — y las monedas, que en el
 * SRD 5.1 también pesan.
 */
export function carriedWeightOz(
  rows: { row: InventoryItem; resolved: ResolvedItem }[],
  character: PersonajeConBolsa,
): number {
  const itemsWeight = rows.reduce(
    (sum, { row, resolved }) =>
      row.location === "STORED" ? sum : sum + resolved.weightOz * row.quantity,
    0,
  );
  const coinCount = character.cp + character.sp + character.ep + character.gp + character.pp;
  const coinsWeight = Math.round(coinCount * COIN_WEIGHT_OZ);
  return itemsWeight + coinsWeight;
}
