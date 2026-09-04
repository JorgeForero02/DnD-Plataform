import { z } from "zod";
import { abilityKeySchema } from "./rules/trace.schema";

// Tarea 2.5.5 — **la sugerencia de ventaja y desventaja**, con su porqué.
//
// Hasta aquí las condiciones tenían un solo consumidor de verdad —la velocidad efectiva— y el
// modo de una tirada lo elegía a mano quien tiraba. Eso deja media 5.ª edición en la cabeza del
// jugador: envenenado, apresado, derribado, asustado y el agotamiento cambian casi todas las
// tiradas del turno, y olvidarlos no lo detecta nadie.
//
// **Sugiere, no impone**, y esa es la decisión de forma que gobierna todo este fichero:
//
//  · La 5.ª edición hace depender media tabla de circunstancias que el servidor **no puede
//    saber**: `frightened` solo penaliza «while the source of its fear is within line of sight»,
//    `invisible` solo mientras el atacante no te vea, y `prone` cambia según la distancia del
//    atacante. Imponer el modo con esos datos ausentes sería inventar la mitad del contexto.
//  · Y el contrato de la tirada (`createRollSchema.mode`) ya existe y es de quien tira. Esto
//    **no lo sustituye**: le pone un aviso al lado.
//
// **El servidor nunca devuelve prosa en español**, igual que la traza de derivación: `sourceKey`
// es la clave de la condición (la misma que guarda `CharacterCondition`, así que la pantalla
// reutiliza el vocabulario que ya tiene) y `labelKey` la clave del texto.

/** Qué se está tirando. **Tres, no dieciocho**: la habilidad concreta no cambia ninguna regla de aquí. */
export const ROLL_KINDS = ["ATTACK", "CHECK", "SAVE"] as const;
export const rollKindSchema = z.enum(ROLL_KINDS);
export type RollKind = z.infer<typeof rollKindSchema>;

/**
 * Qué le hace una condición a esa tirada.
 *
 * **`AUTO_FAIL` está aquí y no es un modo**, y por eso el resultado lo separa en su propio campo:
 * paralizado, petrificado, aturdido e inconsciente **fallan automáticamente** las salvaciones de
 * Fuerza y Destreza (SRD 5.1: *"It automatically fails Strength and Dexterity saving throws"*).
 * Devolver eso como «desventaja» sería suavizar una regla: con desventaja aún se puede sacar la
 * CD, con fallo automático no. Y omitirlo sería peor — la pantalla diría «sin sugerencia» sobre
 * una tirada que ya está decidida.
 */
export const rollModeEffectSchema = z.enum(["ADVANTAGE", "DISADVANTAGE", "AUTO_FAIL"]);
export type RollModeEffect = z.infer<typeof rollModeEffectSchema>;

/** Una causa, con su clave estable. **Nunca la frase**: la compone la pantalla. */
export const rollModeReasonSchema = z.object({
  effect: rollModeEffectSchema,
  /** `"poisoned"`, `"restrained"`, `"exhaustion:3"` — la clave de la condición que lo causa. */
  sourceKey: z.string().min(1),
  labelKey: z.string().min(1),
});
export type RollModeReason = z.infer<typeof rollModeReasonSchema>;

/**
 * La sugerencia para **una** tirada.
 *
 * `cancelled` no es redundante con `mode: "NORMAL"`: son dos hechos distintos y la mesa los lee
 * distinto. «Nada te afecta» y «te afectan una ventaja y una desventaja, así que tiras un solo
 * d20» dan el mismo modo y no son la misma frase — el SRD las distingue explícitamente
 * (*"If circumstances cause a roll to have both advantage and disadvantage, you are considered to
 * have neither of them, and you roll one d20"*), y con un solo campo la pantalla no podría.
 */
export const suggestedRollModeSchema = z.object({
  kind: rollKindSchema,
  /** Solo en las salvaciones, y solo si se sabe cuál: hay reglas que dependen de ella. */
  ability: abilityKeySchema.optional(),
  /** El modo que se sugiere. Los mismos tres valores que `createRollSchema.mode`. */
  mode: z.enum(["NORMAL", "ADVANTAGE", "DISADVANTAGE"]),
  /** Hay ventaja **y** desventaja: se anulan y se tira un solo d20. */
  cancelled: z.boolean(),
  /** La tirada se falla automáticamente. No es un modo; es que no hay tirada. */
  autoFail: z.boolean(),
  /** Todas las causas, en el orden en que llegaron las condiciones. */
  reasons: z.array(rollModeReasonSchema),
});
export type SuggestedRollMode = z.infer<typeof suggestedRollModeSchema>;

/**
 * Lo que la hoja publica: el ataque, la prueba de característica y **una salvación por
 * característica**, porque `restrained` penaliza solo las de Destreza y el fallo automático de
 * paralizado solo alcanza Fuerza y Destreza. Una sola entrada «salvación» tendría que elegir
 * entre mentir en cuatro características o callarse en dos.
 */
export const rollSuggestionsSchema = z.object({
  attack: suggestedRollModeSchema,
  check: suggestedRollModeSchema,
  saves: z.record(abilityKeySchema, suggestedRollModeSchema),
});
export type RollSuggestions = z.infer<typeof rollSuggestionsSchema>;
