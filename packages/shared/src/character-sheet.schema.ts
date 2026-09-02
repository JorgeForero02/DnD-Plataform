import { z } from "zod";
import {
  abilityScoresSchema,
  characterChoicesSchema,
  contentRefSchema,
} from "./character-build.schema";

// Tareas 2A.6 y 2A.7 — la hoja persistida y su estado mutable.
//
// **Se guarda lo decidido; se calcula lo derivado.** Características base, raza, subraza, clase,
// nivel, elecciones resueltas, PG actuales, PG temporales y anulaciones manuales **se guardan**.
// Modificadores, bonificador de competencia, CA, **PG máximos**, CD de conjuro, bonos de ataque
// y competencias heredadas **se calculan siempre y nunca se persisten**.
//
// El motivo, textual de la especificación: guardar lo calculado significa que el día que se
// corrija una fórmula habrá mil filas mintiendo sin forma de saber cuáles.

/** Lo que se escribe en la hoja. Todo opcional: una hoja se rellena a trozos, no de golpe. */
export const updateCharacterSheetSchema = z.object({
  abilities: abilityScoresSchema.partial().optional(),
  race: contentRefSchema.optional(),
  subrace: contentRefSchema.nullable().optional(),
  class: contentRefSchema.optional(),
  level: z.number().int().min(1).max(20).optional(),
  choices: characterChoicesSchema.optional(),
});
export type UpdateCharacterSheetInput = z.infer<typeof updateCharacterSheetSchema>;

/**
 * Un cambio **relativo** de PG: el caso normal de la mesa.
 *
 * En la mesa nadie dice «tengo 12»: dice «recibo 5». El servidor aplica el delta dentro de una
 * transacción, así que **dos jugadores aplicando −5 y −3 aterrizan los dos**. No hay conflicto
 * que resolver porque no hay nada que sobrescribir — y perder una curación porque dos personas
 * escribieron a la vez es el fallo que nadie reproduce y todo el mundo recuerda.
 */
export const changeHpSchema = z.object({
  delta: z.number().int().min(-9999).max(9999),
  /**
   * Si el golpe fue crítico. **Existe desde el principio a propósito, aunque hoy solo lo use una
   * regla:** recibir daño estando a 0 PG suma **un** fracaso de salvación de muerte, y **dos** si
   * el golpe fue crítico. Sin este campo, esa segunda mitad no se puede aplicar — y añadirlo
   * después es migrar el payload del evento que más veces se escribe en una sesión.
   */
  critical: z.boolean().optional(),
  reason: z.string().max(280).optional(),
});
export type ChangeHpInput = z.infer<typeof changeHpSchema>;

/**
 * Un cambio **absoluto**: la corrección del DM, y ahí sí hace falta un conflicto.
 *
 * Concurrencia optimista: si `version` ya no es la que se envió, **409** con el valor actual.
 * Es la única forma honesta — un DM corrigiendo a mano **quiere** pisar, pero quiere saber qué
 * pisa.
 */
export const setHpSchema = z.object({
  currentHp: z.number().int().min(0).max(9999).optional(),
  tempHp: z.number().int().min(0).max(9999).optional(),
  expectedVersion: z.number().int().min(0),
  reason: z.string().max(280).optional(),
});
export type SetHpInput = z.infer<typeof setHpSchema>;

/**
 * Una tirada de salvación contra muerte.
 *
 * **Cuatro resultados y no dos**, porque el SRD los distingue: un 20 natural devuelve al
 * personaje a 1 PG y un 1 natural cuenta como **dos** fracasos. Tres éxitos estabilizan; tres
 * fracasos matan. El servidor tira: es una tirada como cualquier otra.
 */
export const deathSaveSchema = z.object({
  visibility: z.enum(["PUBLIC", "PLAYERS", "SPECIFIC_PLAYERS", "OWNER_DM", "DM_ONLY"]).optional(),
});
export type DeathSaveInput = z.infer<typeof deathSaveSchema>;

/** El estado de muerte de una hoja, para que la pantalla no lo deduzca. */
export const deathStateSchema = z.object({
  successes: z.number().int().min(0).max(3),
  failures: z.number().int().min(0).max(3),
  /** `alive` con PG > 0, `dying` a 0, `stable` con tres éxitos, `dead` con tres fracasos. */
  status: z.enum(["alive", "dying", "stable", "dead"]),
});
export type DeathState = z.infer<typeof deathStateSchema>;

// --- Anulaciones manuales del DM sobre valores derivados ---

/**
 * Las claves que se pueden anular a mano. **Cerrada a propósito**: una anulación es la válvula
 * de escape del catálogo, no una puerta abierta a inventar campos derivados. Si falta una,
 * añadirla es una decisión con su ficha.
 *
 * Son las que una mesa necesita corregir de verdad: la CA (un objeto mágico, una regla de la
 * casa), los PG máximos (un don, un PNJ que el DM decide), la iniciativa, la velocidad de
 * caminar y la percepción pasiva.
 */
export const OVERRIDABLE_KEYS = [
  "ac",
  "maxHp",
  "initiative",
  "speed.walk",
  "passivePerception",
] as const;
export const overridableKeySchema = z.enum(OVERRIDABLE_KEYS);
export type OverridableKey = z.infer<typeof overridableKeySchema>;

/**
 * Fijar una anulación. **El motivo es opcional**, como en todo este dominio: obligar a
 * explicarse en mitad de una sesión molesta más de lo que documenta.
 */
export const setOverrideSchema = z.object({
  value: z.number().int().min(-999).max(999),
  reason: z.string().max(280).optional(),
});
export type SetOverrideInput = z.infer<typeof setOverrideSchema>;

/** El mapa guardado: clave derivada → número. */
export const overridesSchema = z.record(overridableKeySchema, z.number().int());
export type Overrides = z.infer<typeof overridesSchema>;
