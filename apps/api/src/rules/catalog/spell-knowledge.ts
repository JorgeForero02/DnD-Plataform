// Tarea 3A.2 (Task 1) — las tablas del SRD 5.1 que 2A.8 dejó fuera a propósito: preparados
// contra conocidos, trucos que escalan, y el tamaño del libro del mago.
//
// **Fuente:** SRD 5.1 (© Wizards of the Coast LLC, CC BY 4.0), las tablas de clase «Cantrips
// Known» / «Spells Known» y las frases de *Preparing and Casting Spells* (PHB/SRD, sección de
// clérigo, druida, mago y paladín). Verificadas contra el `ScaleValue` de `classes/*.yml` de la
// copia de Foundry (rules 2014, solo datos, nunca se ejecuta su código).
//
// **Por qué esto no vive en `spell-slots.ts`.** Los espacios son el mismo mecanismo que la
// inspiración —un contador con máximo que un descanso repone—, y ese mecanismo no distingue
// preparar de conocer. Esto de aquí es la *interpretación*: cuántos conjuros puede tener a mano
// cada clase, y de qué forma los consigue. Confundir las dos tablas fue justo el error que
// `spell-slots.ts` avisa de no cometer con las progresiones.

/**
 * Cómo una clase llena su lista de conjuros disponibles.
 * - `PREPARA_DE_LISTA`: elige cada día de la lista entera de su clase (clérigo, druida, paladín).
 * - `LIBRO`: elige de lo que tiene copiado en su libro (mago).
 * - `CONOCIDOS`: tiene un número fijo de conjuros conocidos, sin preparar (bardo, hechicero,
 *   brujo, explorador).
 * - `NINGUNO`: no lanza conjuros (o la clase es desconocida).
 */
export type ModeloDePreparacion = "PREPARA_DE_LISTA" | "LIBRO" | "CONOCIDOS" | "NINGUNO";

const PREPARA_DE_LISTA = new Set(["cleric", "druid", "paladin"]);
const CONOCIDOS_CLASES = new Set(["bard", "sorcerer", "warlock", "ranger"]);

export function modeloDePreparacion(classKey: string | undefined): ModeloDePreparacion {
  if (!classKey) return "NINGUNO";
  if (classKey === "wizard") return "LIBRO";
  if (PREPARA_DE_LISTA.has(classKey)) return "PREPARA_DE_LISTA";
  if (CONOCIDOS_CLASES.has(classKey)) return "CONOCIDOS";
  return "NINGUNO";
}

/**
 * Columna «Cantrips Known» del SRD 5.1, por tramos: [nivel 1-3, nivel 4-9, nivel 10+].
 * Las clases que preparan de lista (clérigo, druida, paladín) no tienen trucos por esta tabla
 * — el clérigo y el druida sí tienen trucos, pero por su propia columna, y **el paladín no
 * tiene ninguno**: por eso solo aparecen aquí bardo, clérigo, druida, hechicero, brujo y mago.
 */
const TRUCOS: Record<string, [number, number, number]> = {
  bard: [2, 3, 4],
  cleric: [3, 4, 5],
  druid: [2, 3, 4],
  sorcerer: [4, 5, 6],
  warlock: [2, 3, 4],
  wizard: [3, 4, 5],
};

/** Columna «Cantrips Known» del SRD 5.1; 0 para quien no tiene. */
export function trucosConocidos(classKey: string, level: number): number {
  const fila = TRUCOS[classKey];
  if (!fila || level < 1) return 0;
  return level >= 10 ? fila[2] : level >= 4 ? fila[1] : fila[0];
}

/**
 * Columna «Spells Known», por tramos crecientes [nivel desde el que aplica, conocidos]. Solo
 * las cuatro clases que conocen conjuros en vez de prepararlos la tienen.
 */
const CONOCIDOS: Record<string, Array<[number, number]>> = {
  bard: [
    [1, 4],
    [2, 5],
    [3, 6],
    [4, 7],
    [5, 8],
    [6, 9],
    [7, 10],
    [8, 11],
    [9, 12],
    [10, 14],
    [11, 15],
    [13, 16],
    [14, 18],
    [15, 19],
    [17, 20],
    [18, 22],
  ],
  sorcerer: [
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [13, 13],
    [15, 14],
    [17, 15],
  ],
  warlock: [
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [11, 11],
    [13, 12],
    [15, 13],
    [17, 14],
    [19, 15],
  ],
  // El explorador no lanza al nivel 1 (ver `MEDIA` en `spell-slots.ts`): su fila empieza en el 2.
  ranger: [
    [2, 2],
    [3, 3],
    [5, 4],
    [7, 5],
    [9, 6],
    [11, 7],
    [13, 8],
    [15, 9],
    [17, 10],
    [19, 11],
  ],
};

/** Columna «Spells Known» (bardo, hechicero, brujo, explorador); `null` si la clase no la tiene. */
export function conjurosConocidos(classKey: string, level: number): number | null {
  const tramos = CONOCIDOS[classKey];
  if (!tramos) return null;
  let n = 0;
  for (const [desde, valor] of tramos) if (level >= desde) n = valor;
  return n;
}

/**
 * Cuántos conjuros puede tener preparados a la vez quien prepara de lista o de libro.
 *
 * «Preparing and Casting Spells» (clérigo/druida/mago): *the number of spells equal to your
 * spellcasting ability modifier + your level (minimum of one spell)*. El paladín usa la misma
 * frase pero con **la mitad de su nivel**: *«choose a number of paladin spells equal to your
 * Charisma modifier + half your paladin level, rounded down (minimum of one spell)»*.
 */
export function topeDePreparados(
  classKey: string,
  level: number,
  spellcastingMod: number,
): number | null {
  if (classKey === "cleric" || classKey === "druid" || classKey === "wizard") {
    return Math.max(1, spellcastingMod + level);
  }
  if (classKey === "paladin") {
    return Math.max(1, spellcastingMod + Math.floor(level / 2));
  }
  return null;
}

/**
 * El libro de conjuros del mago: empieza con 6 de nivel 1 y gana 2 más por cada nivel de
 * personaje después del primero (los que copia al subir, no los que prepara ese día).
 */
export function tamanoDelLibro(classKey: string, level: number): number | null {
  return classKey === "wizard" ? 6 + 2 * Math.max(0, level - 1) : null;
}
