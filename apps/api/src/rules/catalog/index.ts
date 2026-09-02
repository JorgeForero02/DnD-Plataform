// Tarea 2A.3 — la puerta del catálogo SRD 5.1.
//
// **Atribución:** todo lo que hay bajo este directorio procede del
// System Reference Document 5.1, © Wizards of the Coast LLC, bajo CC BY 4.0, traducido al
// español y reorganizado como datos estructurados. El aviso completo, con la nota de
// modificación, está en `NOTICE.md` de la raíz del repositorio y **también tiene que verse en
// la aplicación** (tarea 2A.10).
//
// **Por qué vive en `apps/api` y no en `packages/srd`.** El plan de 2A (§4.1) dejaba las dos
// abiertas. Se elige `apps/api/src/rules/catalog/` porque hoy el catálogo tiene **un solo
// consumidor**, el motor, que vive dos carpetas más arriba; crear un paquete ahora costaría
// cableado de compilación por cero beneficio. Cuando la web necesite los nombres en español
// (2A.10), los pedirá por un endpoint —que hace falta igualmente, porque las elecciones se
// validan en el servidor— y si aun así conviene el paquete, mover una carpeta es un `git mv`,
// no un rediseño.

export * from "./types";
export * from "./races";
export * from "./classes";
export * from "./armor";
export * from "./resolve";

import { SRD_ARMOR } from "./armor";
import { SRD_CLASSES } from "./classes";
import { SRD_RACES } from "./races";

/** El catálogo entero, para los invariantes y para la futura exposición por HTTP. */
export const SRD_CATALOG = {
  races: SRD_RACES,
  classes: SRD_CLASSES,
  armor: SRD_ARMOR,
} as const;

/**
 * La tabla de bonificador de competencia del SRD, **como tabla**: es lo que pinta la pantalla
 * de subida de nivel, que quiere las bandas y no un número suelto.
 *
 * **El dueño del cálculo sigue siendo el motor** (`proficiencyBonus`, `../engine.ts`). Esto es
 * la misma verdad escrita en otra forma, y por eso lleva un invariante que compara las dos en
 * los veinte niveles: dos representaciones del mismo dato discrepan sin remedio salvo que algo
 * las ate.
 */
export const PROFICIENCY_BONUS_TABLE = [
  { fromLevel: 1, toLevel: 4, bonus: 2 },
  { fromLevel: 5, toLevel: 8, bonus: 3 },
  { fromLevel: 9, toLevel: 12, bonus: 4 },
  { fromLevel: 13, toLevel: 16, bonus: 5 },
  { fromLevel: 17, toLevel: 20, bonus: 6 },
] as const;
