// Tarea 2C.5 — **la guía de Clases de Dificultad**, transcrita del SRD 5.1.
//
// La pidió el DM asesor, y hasta el contraste del 2026-09-03 se creía que era una decisión de
// producto: **no lo es, está en el manual**. La tabla «Typical Difficulty Classes» vive en la
// sección de pruebas de característica del SRD 5.1
// (<https://5thsrd.org/rules/abilities/ability_checks/>), así que dejó de ser algo que inventar y
// pasó a ser algo que transcribir — seis filas, con su atribución como el resto del catálogo.
//
// **Van la clave y el número, no el rótulo en español.** Es la misma regla que gobierna razas y
// clases: el servidor manda datos y la forma legible se escribe una vez en la pantalla
// (`docs/04-convenciones.md`: ningún valor de enumeración llega a la pantalla, y la traducción
// vive una sola vez por dominio). Aquí, además, tiene una ventaja concreta: la escala es la misma
// para cualquier mesa, y quien quiera llamarla de otra forma en su idioma no tiene que tocar el
// servidor.
//
// **Qué NO hace esta tabla:** elegir la CD por ti. El SRD la ofrece como guía —«the DM sets the
// DC»—, así que la pantalla la enseña al lado del campo y el DM escribe el número que quiera;
// obligar a elegir una de las seis convertiría una ayuda en una jaula.

export interface SrdDifficultyClass {
  /** Clave estable. La forma legible la escribe la pantalla. */
  key: string;
  dc: number;
}

/** Las seis filas, **en el orden del SRD**. */
export const SRD_DIFFICULTY_CLASSES: readonly SrdDifficultyClass[] = [
  { key: "very-easy", dc: 5 },
  { key: "easy", dc: 10 },
  { key: "medium", dc: 15 },
  { key: "hard", dc: 20 },
  { key: "very-hard", dc: 25 },
  { key: "nearly-impossible", dc: 30 },
] as const;
