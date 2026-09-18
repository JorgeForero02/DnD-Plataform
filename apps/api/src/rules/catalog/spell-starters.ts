// Tarea 3A.2 (Task 1) — D-CF-125: con qué lista de conjuros nace un personaje nuevo, por clase.
//
// **Por qué existe una lista fija y no «lo que el jugador quiera».** Bardo, hechicero, brujo y
// explorador *conocen* un número fijo de conjuros (`spell-knowledge.ts`, `conjurosConocidos`):
// alguien tiene que elegir cuáles el día 1, y hasta que 3A.2 tenga una pantalla de elección esa
// decisión la toma esta lista — la misma función que ya usa `deriveCharacter` para el resto del
// catálogo. El mago siembra su libro completo porque `tamanoDelLibro` fija cuántos copia, no
// cuántos elige por sesión. Clérigo, druida y paladín preparan de la lista **entera** de su
// clase (`PREPARA_DE_LISTA`): no siembran nada porque no tienen un subconjunto que guardar.
//
// **Por qué el explorador no aparece hasta el nivel 2.** No conoce conjuros al nivel 1 (ver la
// fila vacía de `MEDIA` en `spell-slots.ts` y el tramo `ranger` en `CONOCIDOS`): `desdeNivel: 2`
// es la misma regla dicha en el vocabulario de esta tabla, y `arranqueDe` la hace cumplir.

/** Una fila del arranque: desde qué nivel se siembra, y con qué claves del catálogo. */
export interface ArranquePorClase {
  desdeNivel: number;
  conjuros: readonly string[];
}

/**
 * D-CF-125: claves del catálogo con las que nace la lista, por clase; nivel mínimo para
 * sembrar. Cada clave existe en `SRD_SPELL_POR_KEY`, pertenece a esa clase y es de nivel 1 —
 * `spell-starters.spec.ts` lo comprueba contra el catálogo generado, no de memoria.
 */
export const ARRANQUE_POR_CLASE: Readonly<Record<string, ArranquePorClase>> = {
  wizard: {
    desdeNivel: 1,
    conjuros: ["magic-missile", "shield", "mage-armor", "burning-hands", "detect-magic", "sleep"],
  },
  sorcerer: { desdeNivel: 1, conjuros: ["magic-missile", "shield"] },
  bard: { desdeNivel: 1, conjuros: ["cure-wounds", "healing-word", "thunderwave", "charm-person"] },
  warlock: { desdeNivel: 1, conjuros: ["hellish-rebuke", "charm-person"] },
  ranger: { desdeNivel: 2, conjuros: ["hunters-mark", "cure-wounds"] },
} as const;

/**
 * La lista con la que nace un personaje de esta clase y nivel. Vacía si la clase prepara de
 * lista (`PREPARA_DE_LISTA`), no lanza conjuros (`NINGUNO`), o el nivel es menor que
 * `desdeNivel` — un explorador de nivel 1 no tiene todavía conjuros que sembrar.
 */
export function arranqueDe(classKey: string, level: number): readonly string[] {
  const fila = ARRANQUE_POR_CLASE[classKey];
  return fila && level >= fila.desdeNivel ? fila.conjuros : [];
}
