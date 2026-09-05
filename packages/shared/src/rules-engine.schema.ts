import { z } from "zod";
import { visibilitySchema } from "./visibility.schema";

// Tarea 2A.16 — el vocabulario del motor de eventos, **cerrado a propósito**.
//
// Cerrado significa cerrado: añadir un suceso, una condición o un efecto es una decisión con su
// ficha, no algo que se hace de paso. Un vocabulario que crece sin freno es exactamente cómo
// estos sistemas se vuelven imposibles de entender.
//
// **La frontera de seguridad, que ninguna funcionalidad futura puede cruzar sin justificarlo:**
// una regla fija **el identificador exacto** de lo que toca **al armarse**, nunca al dispararse.
// Es una «sentencia preparada»: su forma queda congelada cuando el DM la crea. Los objetivos
// dinámicos por etiqueta quedan fuera de la v1 porque **un jugador puede poner una etiqueta**, y
// eso convierte un dato que el jugador controla en una vía de escalada. Razonado entero en
// `docs/superpowers/specs/2026-09-02-autoridad-de-las-reglas-design.md`.

// ---------------------------------------------------------------------------------------------
// CUANDO — los sucesos
// ---------------------------------------------------------------------------------------------

/** Referencia a una ficha del mundo, **por identificador y fijada al armar**. */
const entityRef = z.object({ entityId: z.string().cuid() });

export const ruleTriggerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("SESSION_STARTED") }),
  z.object({ kind: z.literal("SESSION_CLOSED") }),
  /**
   * Un jugador **abre** una ficha. Registrar quién abre qué es vigilancia si nadie lo dice, así
   * que el suceso se guarda con visibilidad `DM_ONLY` **y la interfaz avisa al jugador de que
   * abrir una ficha puede disparar reglas** (hueco H3). Las dos mitades, o ninguna.
   */
  z.object({ kind: z.literal("ENTITY_OPENED"), ...entityRef.shape }),
  z.object({ kind: z.literal("ENTITY_COMMENTED"), ...entityRef.shape }),
  /** El que permite encadenar sin inventar nada: un efecto también es un suceso. */
  z.object({ kind: z.literal("ENTITY_REVEALED"), ...entityRef.shape }),
  z.object({ kind: z.literal("FLAG_SET"), key: z.string().min(1).max(60) }),
  /** La señal que inventa el DM: su propio vocabulario, sin tocar el nuestro. */
  z.object({ kind: z.literal("SIGNAL_RAISED"), key: z.string().min(1).max(60) }),
  /** La batuta literal: el DM lee el diálogo en voz alta, pulsa, y pasa lo que tenía que pasar. */
  z.object({ kind: z.literal("DM_EXECUTED"), ...entityRef.shape }),
  /** La llave en la ranura: `EntityLink` ya existe. */
  z.object({
    kind: z.literal("ENTITY_LINKED"),
    fromId: z.string().cuid(),
    toId: z.string().cuid(),
    label: z.string().max(120).optional(),
  }),
  /**
   * **Los cuatro resultados, no solo el éxito.** Un 20 natural que no llega a la CD sigue siendo
   * un 20 natural, y una regla puede querer justamente eso.
   */
  z.object({
    kind: z.literal("ABILITY_ROLL"),
    skill: z.string().min(1).max(60).optional(),
    outcome: z.enum(["FAILURE", "SUCCESS", "NATURAL_ONE", "NATURAL_TWENTY"]),
  }),
  z.object({ kind: z.literal("ENTITY_ATTACKED"), ...entityRef.shape }),
  z.object({ kind: z.literal("MEMBER_JOINED") }),
]);
export type RuleTrigger = z.infer<typeof ruleTriggerSchema>;

/**
 * **Los sucesos que el editor ofrece y el motor NO puede cumplir todavia.**
 *
 * Vive aqui, en la forma compartida, y no en cada lado: hasta la Ola 3 la misma lista estaba
 * escrita dos veces —`DISPARADORES_SIN_MOTOR` en la web y `UNREACHABLE_TRIGGER_KINDS` en la
 * API—, y dos listas que tienen que coincidir divergen en cuanto una se toca sin la otra. Es la
 * ficha C6-1, y su cierre escrito era exactamente esto.
 *
 * Quedan dos, y cada uno por su motivo, que **no es pereza**:
 *
 * - `DM_EXECUTED` es «la batuta»: el DM lee el dialogo en voz alta, pulsa, y pasa lo que tenia
 *   que pasar. **No existe ese gesto en ninguna pantalla**, asi que el suceso no tendria quien
 *   lo escribiera. Es una funcion que falta, no un cable suelto.
 * - `ENTITY_ATTACKED` apunta a una **ficha del mundo**, y en esta aplicacion se ataca a un
 *   **personaje** (`Character`), no a una entidad. Conectarlo pide antes decidir que significa
 *   atacar un lugar o un PNJ sin hoja, y esa decision es del autor.
 *
 * Una regla ya guardada con uno de estos se pinta **marcada y no seleccionable**, que es la regla
 * de interfaz vinculante: un valor guardado que el selector no ofrece se ensena, no se esconde.
 */
export const DISPARADORES_SIN_MOTOR = ["DM_EXECUTED", "ENTITY_ATTACKED"] as const;

/** Si un suceso guardado llegara alguna vez al motor. `false` = se pinta marcado. */
export function elMotorDispara(kind: RuleTrigger["kind"]): boolean {
  return !(DISPARADORES_SIN_MOTOR as readonly string[]).includes(kind);
}

// ---------------------------------------------------------------------------------------------
// SI — las condiciones
// ---------------------------------------------------------------------------------------------

export const ruleConditionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("FLAG_IS"), key: z.string().min(1).max(60), value: z.boolean() }),
  z.object({
    kind: z.literal("SET_SIZE_AT_LEAST"),
    setKey: z.string().min(1).max(60),
    count: z.number().int().min(1).max(999),
  }),
  z.object({
    kind: z.literal("IS_IN_SET"),
    setKey: z.string().min(1).max(60),
    memberType: z.enum(["user", "character", "entity"]),
    memberId: z.string().min(1).max(60),
  }),
  /** Exige sesión en curso, y por eso 2A.5 iba antes que esto. */
  z.object({ kind: z.literal("ALL_PLAYERS_PRESENT") }),
  z.object({ kind: z.literal("SUBJECT_HAS_TAG"), tag: z.string().min(1).max(60) }),
  z.object({
    kind: z.literal("REVEALED_WITH_TAG_AT_LEAST"),
    tag: z.string().min(1).max(60),
    count: z.number().int().min(1).max(999),
  }),
  z.object({ kind: z.literal("SESSION_NUMBER_AT_LEAST"), count: z.number().int().min(1).max(999) }),
  /** El «once» de Ink: la puerta que se abre una vez. */
  z.object({ kind: z.literal("NEVER_FIRED") }),
]);
export type RuleCondition = z.infer<typeof ruleConditionSchema>;

// ---------------------------------------------------------------------------------------------
// ENTONCES — los efectos
// ---------------------------------------------------------------------------------------------

export const ruleEffectSchema = z.discriminatedUnion("kind", [
  /**
   * **Fijado al armar.** `entityId` y `visibility` son valores concretos, no una consulta que se
   * resuelva al dispararse. Ahí está la frontera de seguridad entera.
   */
  z.object({
    kind: z.literal("REVEAL_ENTITY"),
    entityId: z.string().cuid(),
    visibility: visibilitySchema,
  }),
  z.object({
    kind: z.literal("HIDE_ENTITY"),
    entityId: z.string().cuid(),
    visibility: visibilitySchema,
  }),
  z.object({ kind: z.literal("SET_FLAG"), key: z.string().min(1).max(60), value: z.boolean() }),
  z.object({
    kind: z.literal("CHANGE_SET_MEMBER"),
    setKey: z.string().min(1).max(60),
    action: z.enum(["ADD", "REMOVE"]),
    memberType: z.enum(["user", "character", "entity"]),
    memberId: z.string().min(1).max(60),
  }),
  /**
   * El radio **solo actúa con mapa**, que es la fase 3. Hasta entonces la señal se lanza y
   * alcanza a quien una regla diga explícitamente, no a quien esté cerca: se puede *escribir*
   * la regla del barril, no *resolverla*.
   */
  z.object({
    kind: z.literal("RAISE_SIGNAL"),
    key: z.string().min(1).max(60),
    originEntityId: z.string().cuid().optional(),
    radiusFeet: z.number().int().min(0).max(1000).optional(),
  }),
  z.object({
    kind: z.literal("NOTIFY"),
    audience: z.enum(["PLAYERS", "DM"]),
    message: z.string().min(1).max(280),
  }),
  z.object({ kind: z.literal("ADD_SESSION_NOTE"), note: z.string().min(1).max(1000) }),
  z.object({
    kind: z.literal("SET_RULE_ARMED"),
    ruleId: z.string().cuid(),
    armed: z.boolean(),
  }),
]);
export type RuleEffect = z.infer<typeof ruleEffectSchema>;

// ---------------------------------------------------------------------------------------------
// La regla entera
// ---------------------------------------------------------------------------------------------

export const ruleModeSchema = z.enum(["AUTOMATIC", "PROPOSAL"]);
export type RuleMode = z.infer<typeof ruleModeSchema>;

export const ruleStatusSchema = z.enum(["ARMED", "DISARMED", "BROKEN"]);
export type RuleStatus = z.infer<typeof ruleStatusSchema>;

/** El estado de un disparo. Espeja el enum de Prisma; una prueba comprueba que no se separan. */
export const ruleTraceStatusSchema = z.enum([
  "APPLIED",
  "PROPOSED",
  "REJECTED",
  "STOPPED",
  "CONFLICT",
]);
export type RuleTraceStatus = z.infer<typeof ruleTraceStatusSchema>;

export const createRuleSchema = z.object({
  name: z.string().min(1).max(160),
  trigger: ruleTriggerSchema,
  /** Sin condiciones, la regla se dispara siempre que llegue su suceso. Es legítimo. */
  conditions: z.array(ruleConditionSchema).max(10).default([]),
  effects: z.array(ruleEffectSchema).min(1).max(10),
  mode: ruleModeSchema.default("AUTOMATIC"),
  /** Tope de disparos. `null` = sin tope; existe como contención, no como regla del juego. */
  maxFires: z.number().int().min(1).max(9999).nullable().optional(),
});
export type CreateRuleInput = z.infer<typeof createRuleSchema>;

export const updateRuleSchema = createRuleSchema.partial().extend({
  status: ruleStatusSchema.optional(),
});
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;

/**
 * **El tope de saltos, y por qué es diez.** El encadenamiento es lo que hace potente el sistema
 * —diez barriles se propagan solos— y también lo que lo puede colgar. Diez es suficiente para
 * cualquier cadena que una mesa escriba a mano y corto para que una recursión accidental se
 * corte **dejándolo escrito en la traza**, en vez de en silencio.
 */
export const MAX_RULE_CHAIN_DEPTH = 10;

/** Aplicar o rechazar una propuesta. **En modo propuesta no ha cambiado nada todavía.** */
export const resolveProposalSchema = z.object({
  action: z.enum(["APPLY", "REJECT"]),
  reason: z.string().max(280).optional(),
});
export type ResolveProposalInput = z.infer<typeof resolveProposalSchema>;

/** El ensayo en seco: qué haría, sin hacer nada. */
export const dryRunRuleSchema = z.object({
  trigger: ruleTriggerSchema,
});
export type DryRunRuleInput = z.infer<typeof dryRunRuleSchema>;
