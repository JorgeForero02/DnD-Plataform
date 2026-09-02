import { z } from "zod";
import { visibilitySchema } from "./visibility.schema";

// Tarea 2A.5 — el log de partida.
//
// **El log nunca es la fuente del estado.** El estado se lee de sus columnas; el log cuenta
// *qué lo cambió*. Es la línea que impide que este `payload` se convierta en la trampa que ya
// pisó el proyecto con `Entity.body` (`docs/05-datos.md`).
//
// De ahí la regla, que está escrita en `docs/04-convenciones.md` y no se deja implícita: **todo
// lo que haga falta consultar o filtrar es una columna real** —campaña, sesión, actor, tipo,
// sujeto, fecha, visibilidad—; el `payload` solo lleva el detalle que se pinta en una línea de
// la línea de tiempo. **Si algún día hace falta consultar por un campo del `payload`, ese campo
// se promociona a columna.** No se consulta dentro del JSON.
//
// La unión de abajo está **discriminada por `type`** y se valida al escribir, así que un evento
// mal formado no llega a la base. Añadir un tipo es añadir un valor al enum de Prisma y un
// miembro aquí: **no toca ninguna tabla**, y hay una prueba que comprueba que los dos lados no
// se separan.

/**
 * Los diez tipos que nacen en 2A. **Arranca corto a propósito.** 2C añadirá `DICE_ROLLED`,
 * `CONDITION_APPLIED`, `CONDITION_REMOVED` y `CLOCK_ADVANCED`; la fase 3, `TOKEN_MOVED`.
 *
 * Esta lista es **la fuente única**: el enum de `schema.prisma` se comprueba contra ella.
 */
export const GAME_EVENT_TYPES = [
  "SESSION_STARTED",
  "SESSION_CLOSED",
  "REST_DECLARED",
  "HP_CHANGED",
  "TEMP_HP_SET",
  "RESOURCE_SPENT",
  "RESOURCE_RESTORED",
  "LEVEL_CHANGED",
  "ABILITY_ROLL",
  "MANUAL_OVERRIDE_SET",
] as const;

export const gameEventTypeSchema = z.enum(GAME_EVENT_TYPES);
export type GameEventType = z.infer<typeof gameEventTypeSchema>;

/** A qué apunta un evento. Es columna, no `payload`, porque se consulta. */
export const gameEventSubjectTypeSchema = z.enum(["character", "campaign", "session"]);
export type GameEventSubjectType = z.infer<typeof gameEventSubjectTypeSchema>;

/** Un motivo escrito por una persona. Opcional siempre: obligar a explicarse molesta en la mesa. */
const reason = z.string().max(280).optional();

export const gameEventPayloadSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("SESSION_STARTED"), sessionTitle: z.string().min(1).max(160) }),
  z.object({
    type: z.literal("SESSION_CLOSED"),
    sessionTitle: z.string().min(1).max(160),
    /** Minutos entre `startedAt` y `endedAt`. Ausente si la sesión se cerró sin arrancar. */
    durationMinutes: z.number().int().nonnegative().optional(),
  }),
  z.object({ type: z.literal("REST_DECLARED"), rest: z.enum(["SHORT", "LONG"]) }),
  // **`from` y `to`, no solo `delta`.** Sin el antes y el después, la línea de tiempo no se
  // puede leer sin recalcular toda la historia, y deshacer es imposible.
  z.object({
    type: z.literal("HP_CHANGED"),
    delta: z.number().int(),
    from: z.number().int(),
    to: z.number().int(),
    reason,
  }),
  z.object({
    type: z.literal("TEMP_HP_SET"),
    from: z.number().int().nonnegative(),
    to: z.number().int().nonnegative(),
    reason,
  }),
  z.object({
    type: z.literal("RESOURCE_SPENT"),
    key: z.string().min(1).max(60),
    label: z.string().min(1).max(120),
    amount: z.number().int().positive(),
    remaining: z.number().int().nonnegative(),
    reason,
  }),
  z.object({
    type: z.literal("RESOURCE_RESTORED"),
    key: z.string().min(1).max(60),
    label: z.string().min(1).max(120),
    amount: z.number().int().positive(),
    remaining: z.number().int().nonnegative(),
    reason,
  }),
  z.object({
    type: z.literal("LEVEL_CHANGED"),
    from: z.number().int().min(1).max(20),
    to: z.number().int().min(1).max(20),
  }),
  z.object({
    type: z.literal("ABILITY_ROLL"),
    expression: z.string().min(1).max(120),
    /** Lo que salió, lo que se conservó y lo que se descartó. Los tres, o no se puede auditar. */
    rolls: z.array(z.number().int()).max(100),
    kept: z.array(z.number().int()).max(100),
    dropped: z.array(z.number().int()).max(100),
    modifier: z.number().int(),
    total: z.number().int(),
    dc: z.number().int().optional(),
    /**
     * **`natural20` y `success` son dos hechos distintos**, no uno: un 20 natural que no llega a
     * la CD sigue siendo un 20 natural. Guardarlos por separado es lo que evita el error.
     */
    natural: z.enum(["NONE", "ONE", "TWENTY"]).default("NONE"),
    outcome: z.enum(["NO_DC", "SUCCESS", "FAILURE"]).default("NO_DC"),
    reason,
  }),
  z.object({
    type: z.literal("MANUAL_OVERRIDE_SET"),
    /** Clave del valor derivado que el DM anula: `"ac"`, `"maxHp"`, `"speed.walk"`. */
    target: z.string().min(1).max(60),
    value: z.number().int(),
    previous: z.number().int().optional(),
    reason,
  }),
]);
export type GameEventPayload = z.infer<typeof gameEventPayloadSchema>;

/** Lo que un servicio pasa para escribir un evento. `sessionId` nulo = fuera de sesión. */
export const recordGameEventSchema = z.object({
  sessionId: z.string().cuid().nullable().optional(),
  subjectType: gameEventSubjectTypeSchema,
  subjectId: z.string().min(1),
  visibility: visibilitySchema.default("PLAYERS"),
  payload: gameEventPayloadSchema,
});
export type RecordGameEventInput = z.infer<typeof recordGameEventSchema>;

/**
 * Consulta del log. **Por defecto, la sesión en curso**, nunca «toda la campaña» de golpe
 * (§1.4 del plan): el log crece y una pantalla que lo pida entero envejece mal.
 */
export const listGameEventsSchema = z.object({
  sessionId: z.string().cuid().optional(),
  /** Identificador del último evento de la página anterior. */
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListGameEventsInput = z.infer<typeof listGameEventsSchema>;
