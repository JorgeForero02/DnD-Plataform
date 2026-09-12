import type { CalculatedSheet } from "../api";

// Tarea 6 (spec 2026-09-11, «la hoja a página completa») §5 — quién lanza conjuros en SRD 5.1:
// bardo, clérigo, druida, hechicero, brujo y mago desde nivel 1; paladín y explorador desde
// nivel 2; y algunos trucos raciales (alto elfo, tiefling, gnomo de las rocas cuando el catálogo
// los tenga). El Caballero Arcano y el Pícaro Arcano NO están en SRD 5.1, así que no cuentan.
// No hace falta mirar clase ni nivel aquí: `spellSlots` y los `labelKey` de rasgo ya son la
// consecuencia de esas reglas — las calcula el motor, no esta función.
export function lanzaConjuros(sheet: CalculatedSheet): boolean {
  return (
    sheet.spellSlots.length > 0 ||
    sheet.features.some((f) => f.labelKey.endsWith(".cantrip") || f.labelKey.endsWith(".spell"))
  );
}
