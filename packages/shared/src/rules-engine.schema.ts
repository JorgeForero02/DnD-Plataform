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
  /**
   * **Retirado de la oferta, conservado en el esquema** (plan 09, ficha I20). Ver
   * `DISPARADORES_SIN_MOTOR`: se atacan criaturas, no fichas del mundo, y lo que si sirve es
   * `CHARACTER_ATTACKED`. No se borra para que una regla guardada con el se siga pudiendo leer.
   */
  z.object({ kind: z.literal("ENTITY_ATTACKED"), ...entityRef.shape }),
  /**
   * **«Cuando ataquen a este personaje»** (plan 09, ficha I20). Lo alimenta `ATTACK_RESOLVED`, que
   * se escribe desde 2.5.3, asi que no hace falta ningun suceso nuevo: solo leerlo.
   *
   * Es el disparador que `ENTITY_ATTACKED` prometia y no podia cumplir: aqui se ataca a un
   * `Character`, y un PNJ es una fila de `Character` desde 2D.
   */
  z.object({ kind: z.literal("CHARACTER_ATTACKED"), characterId: z.string().min(1).max(60) }),
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
 Queda UNO, y por su motivo, que **no es pereza**:
 *
 * - `ENTITY_ATTACKED` apunta a una **ficha del mundo**, y en esta aplicacion se ataca a un
 *   **personaje** (`Character`) — un PNJ es una fila de `Character` desde 2D—, no a una entidad.
 *   **No hay forma honesta de conectarlo**: un lugar o un documento no se atacan. Y lo que la mesa
 *   quiere de verdad —«cuando ataquen a este PNJ, dispara esto»— ya existe: es
 *   `CHARACTER_ATTACKED`, alimentado por `ATTACK_RESOLVED`, que se escribe desde 2.5.3.
 *
 *   **Se queda en el esquema para siempre, y esa es la decision** (plan 09, ficha I20, 2026-09-06).
 *   Quitarlo del esquema Zod haria que una regla guardada con el **dejara de poder leerse**, y la
 *   regla de interfaz vinculante dice lo contrario: un valor guardado que el selector no ofrece se
 *   ensena marcado, no se esconde. Medido antes de decidir: **244 reglas guardadas, ninguna lo
 *   usa** — pero un esquema que se rompe con un dato viejo se rompe una sola vez y ya es tarde.
 *
 * `DM_EXECUTED` **salio de esta lista el 2026-09-06** (plan 09, ficha I19): ya tiene su gesto, su
 * suceso y su boton en la ficha del mundo.
 *
 * Una regla ya guardada con uno de estos se pinta **marcada y no seleccionable**, que es la regla
 * de interfaz vinculante: un valor guardado que el selector no ofrece se ensena, no se esconde.
 */
export const DISPARADORES_SIN_MOTOR = ["ENTITY_ATTACKED"] as const;

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

/**
 * `GET .../traces` — paginación por cursor. **Tarea 7 (S12)**: vivía como una constante local en
 * `rules-engine.controller.ts`; se mueve aquí porque el contrato es de `@dnd/shared`, no de la
 * API.
 */
export const listTracesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().cuid().optional(),
});
export type ListTracesQuery = z.infer<typeof listTracesQuerySchema>;
