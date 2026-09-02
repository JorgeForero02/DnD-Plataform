// Hueco M3, cerrado el 2026-09-02 — los espacios de conjuro del SRD 5.1.
//
// **Atribución:** tablas del System Reference Document 5.1, © Wizards of the Coast LLC, bajo
// CC BY 4.0. Ver `NOTICE.md` de la raíz.
//
// **Por qué esto entra en 2A cuando la spec excluía los conjuros.** Los jugadores lo pidieron
// por su nombre —*«inventario de hechizos… y todas las cosas que se hacen manuales molestas»*—
// y el documento de respuestas ya falló que entran. Lo que entra es **la tabla**, no la
// matemática de conjuros: un espacio de conjuro es **el mismo mecanismo que la inspiración**,
// un contador con máximo que un descanso repone, y ese mecanismo lo construye 2A.8 igual. Lo
// que sigue fuera es la *interpretación* de cada conjuro: preparados contra conocidos, trucos
// que escalan, y la lista por clase.
//
// **Hay tres progresiones y confundirlas es el error obvio.** Meter al brujo en la tabla
// completa le daría espacios que no tiene; olvidar que el paladín empieza al nivel 2 le daría
// magia un nivel antes de tenerla.

/** Cuántos espacios tiene, y de qué nivel de conjuro. */
export interface SpellSlot {
  /** Nivel del conjuro, 1 a 9. */
  spellLevel: number;
  slots: number;
}

export type SpellProgression = "FULL" | "HALF" | "PACT";

/**
 * Lanzadores completos: bardo, clérigo, druida, hechicero y mago. Índice = nivel de personaje
 * menos uno; cada fila son los espacios de nivel 1 a 9.
 */
const COMPLETA: number[][] = [
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/**
 * Medios lanzadores: paladín y explorador. **La primera fila está vacía a propósito**: no
 * lanzan al nivel 1, y esa fila vacía es la que evita el error de darles magia antes de tiempo.
 */
const MEDIA: number[][] = [
  [],
  [2],
  [3],
  [3],
  [4, 2],
  [4, 2],
  [4, 3],
  [4, 3],
  [4, 3, 2],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2],
];

/**
 * Magia de pacto (brujo). **No es una tabla de nueve columnas**: son pocos espacios, todos del
 * mismo nivel, y —lo que de verdad la distingue— **se reponen en descanso CORTO**, no largo.
 * Por eso lleva su propia forma en vez de encajarse a la fuerza en las otras dos.
 */
const PACTO: { slots: number; spellLevel: number }[] = [
  { slots: 1, spellLevel: 1 },
  { slots: 2, spellLevel: 1 },
  { slots: 2, spellLevel: 2 },
  { slots: 2, spellLevel: 2 },
  { slots: 2, spellLevel: 3 },
  { slots: 2, spellLevel: 3 },
  { slots: 2, spellLevel: 4 },
  { slots: 2, spellLevel: 4 },
  { slots: 2, spellLevel: 5 },
  { slots: 2, spellLevel: 5 },
  { slots: 3, spellLevel: 5 },
  { slots: 3, spellLevel: 5 },
  { slots: 3, spellLevel: 5 },
  { slots: 3, spellLevel: 5 },
  { slots: 3, spellLevel: 5 },
  { slots: 3, spellLevel: 5 },
  { slots: 4, spellLevel: 5 },
  { slots: 4, spellLevel: 5 },
  { slots: 4, spellLevel: 5 },
  { slots: 4, spellLevel: 5 },
];

/**
 * Los espacios de una clase a un nivel. Lista vacía = no lanza todavía, que es un estado
 * legítimo (paladín de nivel 1) y no un error.
 */
export function spellSlotsFor(
  progression: SpellProgression | undefined,
  level: number,
): SpellSlot[] {
  if (!progression || level < 1 || level > 20) return [];
  if (progression === "PACT") {
    const fila = PACTO[level - 1];
    return [{ spellLevel: fila.spellLevel, slots: fila.slots }];
  }
  const fila = (progression === "FULL" ? COMPLETA : MEDIA)[level - 1];
  return fila.map((slots, i) => ({ spellLevel: i + 1, slots }));
}

/**
 * Dónde se reponen. **El brujo en descanso corto** es la diferencia que 2A.8 necesita saber
 * para no darle sus espacios solo al dormir.
 */
export function spellSlotResetOn(
  progression: SpellProgression | undefined,
): "SHORT_REST" | "LONG_REST" | "NONE" {
  if (!progression) return "NONE";
  return progression === "PACT" ? "SHORT_REST" : "LONG_REST";
}
