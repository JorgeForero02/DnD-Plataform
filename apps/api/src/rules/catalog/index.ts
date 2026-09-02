// Tarea 2A.3 — la puerta del catálogo SRD 5.1.
//
// **Atribución:** todo lo que hay bajo este directorio procede del
// System Reference Document 5.1, © Wizards of the Coast LLC, bajo CC BY 4.0, traducido al
// español y reorganizado como datos estructurados. El aviso completo, con la nota de
// modificación, está en `NOTICE.md` de la raíz del repositorio y **también tiene que verse en
// la aplicación** (tarea 2A.10).
//
// **Por qué vive en `apps/api` y no en `packages/srd`.** El plan de 2A (§4.1) dejaba las dos
// abiertas. Se elige `apps/api/src/rules/catalog/` porque hoy el catálogo **solo lo consume el
// propio borde de la API, dentro de `apps/api`**; crear un paquete ahora costaría cableado de
// compilación por cero beneficio.
//
// (La frase anterior decía «un solo consumidor, el motor», y era al revés: la dirección real es
// `catalog → engine`. El motor no consume el catálogo, y de hecho no lo importa — eso es lo que
// hace útil la separación. Lo cazó la revisión del 2026-09-02.)
//
// Cuando la web necesite los nombres en español (2A.10), los pedirá por un endpoint —que hace
// falta igualmente, porque las elecciones se validan en el servidor— y si aun así conviene el
// paquete, mover una carpeta es un `git mv`, no un rediseño.

export * from "./types";
export * from "./races";
export * from "./classes";
export * from "./armor";
export * from "./choices";
export * from "./spell-slots";
export * from "./resolve";

import type { DerivationResult } from "@dnd/shared";
import { derive, type Modifier } from "../engine";
import { SRD_ARMOR } from "./armor";
import { SRD_CLASSES } from "./classes";
import { SRD_RACES } from "./races";
import {
  resolveBuild,
  type CharacterBuild,
  type PendingChoice,
  type ResolvedBuild,
  type ResolvedFeature,
} from "./resolve";

/** El catálogo entero, para los invariantes y para la futura exposición por HTTP. */
export const SRD_CATALOG = {
  races: SRD_RACES,
  classes: SRD_CLASSES,
  armor: SRD_ARMOR,
} as const;

export interface CharacterSheet extends DerivationResult {
  /** Lo que falta por decidir. La pantalla lo pinta como lista de tareas, no como error. */
  pendingChoices: PendingChoice[];
  /**
   * Rasgos y aptitudes que la hoja enseña pero el motor no suma: los raciales sin efecto
   * numérico y las de clase y subclase hasta el nivel actual.
   */
  features: ResolvedFeature[];
  /** Velocidades base **en pies**. 2A.12 les aplicará las condiciones. */
  speeds: ResolvedBuild["speeds"];
  /** Las claves de lo elegido, para que la pantalla no tenga que deducirlas de la traza. */
  raceKey: string;
  subraceKey?: string;
  classKey: string;
  /** Cuantos ataques da una accion de Ataque (hueco M2). */
  attacksPerAction: number;
  /** Espacios de conjuro y donde se reponen (hueco M3). */
  spellSlots: ResolvedBuild["spellSlots"];
  spellSlotResetOn: ResolvedBuild["spellSlotResetOn"];
}

/**
 * De ficha declarada a hoja calculada, en un solo paso: resuelve el catálogo, deriva con el
 * motor, y **junta los avisos de los dos**.
 *
 * Existe porque son dos listas de avisos con el mismo significado para quien mira la hoja —
 * «hay algo que querrías saber»— y dejar que cada pantalla las junte por su cuenta es cómo una
 * de ellas acaba sin pintarse. Los del catálogo van primero: un `unresolved_choice` explica por
 * qué los números de abajo son los que son.
 */
export function deriveCharacter(
  build: CharacterBuild,
  /**
   * Modificadores que no salen del catálogo: hoy, **las anulaciones manuales del DM**.
   *
   * Entran por aquí y no por un camino propio porque el motor ya sabe qué es un `override` —va
   * al final, sustituye el resultado, y **guarda el delta en la traza para que siga sumando**—
   * y reimplementar eso en el servicio sería tener dos versiones de la misma regla, una de ellas
   * sin las pruebas del motor.
   */
  extraModifiers: Modifier[] = [],
): CharacterSheet {
  const resuelto = resolveBuild(build);
  const derivado = derive({
    ...resuelto.input,
    modifiers: [...resuelto.input.modifiers, ...extraModifiers],
  });
  return {
    derived: derivado.derived,
    warnings: [...resuelto.warnings, ...derivado.warnings],
    pendingChoices: resuelto.pendingChoices,
    // Antes esto tiraba los rasgos, las velocidades y las claves de raza y clase, así que ni
    // 2A.10 ni 2A.12 podrían haber usado «la puerta de entrada»: habrían tenido que llamar a
    // `resolveBuild` aparte y derivar dos veces. Lo cazó la revisión, y sale gratis ahora que
    // no hay ningún consumidor que migrar.
    features: resuelto.features,
    speeds: resuelto.speeds,
    raceKey: resuelto.race.key,
    subraceKey: resuelto.subrace?.key,
    classKey: resuelto.characterClass.key,
    attacksPerAction: resuelto.attacksPerAction,
    spellSlots: resuelto.spellSlots,
    spellSlotResetOn: resuelto.spellSlotResetOn,
  };
}

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
