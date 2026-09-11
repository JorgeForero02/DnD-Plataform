import { WEIGHT_OZ_PER_LB, type EncumbranceState } from "@dnd/shared";

// Migración 6, fix round 1 (BAJA-1) — los umbrales de la variante de sobrecarga (SRD 5.1,
// Variant: Encumbrance), en un solo sitio.
//
// Hasta este arreglo, `character-sheet.service.ts` calculaba `str * 5 * WEIGHT_OZ_PER_LB` y
// `str * 10 * WEIGHT_OZ_PER_LB` a mano, e `InventoryService.list()` no calculaba nada — el
// estado de sobrecarga del inventario ni siquiera existía todavía. Con los dos puntos que
// necesitan la misma fórmula, ponerla aquí es lo que impide que uno de los dos cambie el "5" por
// un "6" un día y el otro se quede con el viejo.

export interface UmbralesDeSobrecarga {
  /** SRD 5.1: por encima de 5×Fuerza (en libras), cargado. */
  encumberedAtOz: number;
  /** SRD 5.1: por encima de 10×Fuerza (en libras), muy cargado. */
  heavilyAtOz: number;
}

export function umbralesDeSobrecarga(str: number): UmbralesDeSobrecarga {
  return {
    encumberedAtOz: str * 5 * WEIGHT_OZ_PER_LB,
    heavilyAtOz: str * 10 * WEIGHT_OZ_PER_LB,
  };
}

/**
 * El estado de sobrecarga para un peso llevado dado. **Estrictamente mayor** ("in excess of" en
 * el SRD, no "at least"): justo en el umbral no cuenta todavía.
 */
export function estadoDeSobrecarga(pesoLlevadoOz: number, str: number): EncumbranceState {
  const { encumberedAtOz, heavilyAtOz } = umbralesDeSobrecarga(str);
  if (pesoLlevadoOz > heavilyAtOz) return "heavily";
  if (pesoLlevadoOz > encumberedAtOz) return "encumbered";
  return "none";
}
