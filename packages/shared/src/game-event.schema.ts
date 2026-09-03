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
 * Los tipos que nacen en 2A. Empezaron siendo diez y crecieron con la hoja persistida y el
 * mundo; 2C anadira `DICE_ROLLED` y `CLOCK_ADVANCED`, y la fase 3, `TOKEN_MOVED`.
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
  // Anadidos con la hoja persistida y el mundo (2A.7, 2A.12, 2A.15).
  "DEATH_SAVE",
  "CONDITION_APPLIED",
  "CONDITION_REMOVED",
  "ENTITY_OPENED",
  "ENTITY_REVEALED",
  "ENTITY_LINKED",
  "FLAG_SET",
  "SET_CHANGED",
  "SIGNAL_RAISED",
  // Sello rapido de mesa (pantalla de sesion). Es lo que el DM pulsa mientras dirige, y por eso
  // es un tipo propio y no una nota suelta: el resumen de la sesion se construye con ellos.
  "SESSION_NOTE",
  // La bolsa (2B). **Tipo propio y no una senal generica**: el reparto del botin es media
  // recompensa del juego, y un log donde «pago 20 po» aparece como un texto libre no se puede
  // sumar ni filtrar despues.
  "MONEY_CHANGED",
  // El inventario (auditoría de mecánica de 2B). **El dinero dejaba rastro y los objetos no**, y
  // con una semana entre sesiones eso significa que nadie puede responder «¿quién cogió la
  // gema?» ni «¿cuándo desapareció mi armadura?».
  "ITEM_ADDED",
  "ITEM_MOVED",
  "ITEM_REMOVED",
  // El reloj de la campana (2C.3). **Un solo tipo para el tiempo y el viaje**: viajar ES avanzar
  // el reloj, y separarlo en dos tipos obligaria a leer dos veces la misma linea de tiempo para
  // reconstruir cuanto tiempo ha pasado.
  "CLOCK_ADVANCED",
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
  z.object({
    type: z.literal("REST_DECLARED"),
    rest: z.enum(["SHORT", "LONG"]),
    /**
     * **El descanso largo se interrumpió** (2C.3). El SRD: una hora de actividad agotadora
     * —andar, luchar, lanzar conjuros— obliga a **empezar el descanso otra vez**, así que este
     * suceso registra un descanso que NO dio beneficios. Sin este campo, la línea de tiempo diría
     * «descansaron ocho horas» de una noche en la que no se recuperó nada.
     */
    interrupted: z.boolean().optional(),
  }),
  // El reloj (2C.3). `from` y `to` como en `HP_CHANGED`, y por el mismo motivo: sin el antes y el
  // después, la línea de tiempo no se puede leer sin recalcular toda la historia.
  z.object({
    type: z.literal("CLOCK_ADVANCED"),
    seconds: z.number().int().positive(),
    from: z.number().int().nonnegative(),
    to: z.number().int().nonnegative(),
    /** Solo si fue un viaje: el ritmo y las millas recorridas. */
    pace: z.enum(["FAST", "NORMAL", "SLOW"]).optional(),
    miles: z.number().optional(),
    reason,
  }),
  // **`from` y `to`, no solo `delta`.** Sin el antes y el después, la línea de tiempo no se
  // puede leer sin recalcular toda la historia, y deshacer es imposible.
  z.object({
    type: z.literal("HP_CHANGED"),
    delta: z.number().int(),
    from: z.number().int(),
    to: z.number().int(),
    /** Si el golpe fue crítico: cuenta **dos** fracasos de muerte en vez de uno. */
    critical: z.boolean().optional(),
    /**
     * **Muerte masiva**: el daño sobrante tras llegar a 0 igualó o superó los PG máximos, así
     * que el personaje muere en el acto. Se guarda porque es una muerte sin tiradas, y sin esto
     * la línea de tiempo no puede explicar por qué alguien murió sin fallar ninguna.
     */
    massive: z.boolean().optional(),
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
  // --- Muerte (2A.7) ---
  z.object({
    type: z.literal("DEATH_SAVE"),
    roll: z.number().int().min(1).max(20),
    /**
     * **Cuatro resultados y no dos.** Un 20 natural no es un exito: devuelve al personaje a 1
     * PG. Un 1 natural cuenta como **dos** fracasos. Meterlos en `SUCCESS`/`FAILURE` seria
     * perder justo lo que hace tensa esa tirada.
     */
    result: z.enum(["SUCCESS", "FAILURE", "CRIT_SUCCESS", "CRIT_FAILURE"]),
    successes: z.number().int().min(0).max(3),
    failures: z.number().int().min(0).max(3),
  }),

  // --- Condiciones (2A.12) ---
  z.object({
    type: z.literal("CONDITION_APPLIED"),
    key: z.string().min(1).max(60),
    /** Nivel de agotamiento, 1 a 6. Ausente en las condiciones que no lo tienen. */
    level: z.number().int().min(1).max(6).optional(),
    reason,
  }),
  z.object({
    type: z.literal("CONDITION_REMOVED"),
    key: z.string().min(1).max(60),
    reason,
  }),

  // --- Sucesos del mundo, los que el motor de reglas escucha (2A.15) ---
  z.object({
    type: z.literal("ENTITY_OPENED"),
    entityType: z.string().min(1).max(40),
    entityName: z.string().max(200).optional(),
  }),
  z.object({
    type: z.literal("ENTITY_REVEALED"),
    entityName: z.string().max(200).optional(),
    toUserId: z.string().optional(),
  }),
  z.object({
    type: z.literal("ENTITY_LINKED"),
    fromId: z.string().min(1),
    toId: z.string().min(1),
    label: z.string().max(120).optional(),
  }),
  z.object({
    type: z.literal("FLAG_SET"),
    key: z.string().min(1).max(60),
    value: z.boolean(),
  }),
  z.object({
    type: z.literal("SET_CHANGED"),
    setKey: z.string().min(1).max(60),
    action: z.enum(["ADDED", "REMOVED"]),
    memberType: z.string().min(1).max(40),
    memberId: z.string().min(1),
  }),
  z.object({
    type: z.literal("SIGNAL_RAISED"),
    key: z.string().min(1).max(60),
    reason,
  }),

  /**
   * **El sello rapido**: lo que el DM pulsa mientras dirige, sin dejar de mirar a la mesa.
   *
   * `kind` es una **lista cerrada y corta a proposito**. Escribir durante una partida cuesta y
   * por eso no se hace; pulsar no cuesta nada. Y como el sello lleva su clase, el resumen que se
   * escribe al cerrar la sesion sale **ya agrupado**, en vez de ser un muro de texto que nadie
   * relee. La idea viene de una herramienta de preparacion de partidas de Foundry, y es la mejor
   * que dio la investigacion de interfaces del 2026-09-02.
   */
  z.object({
    type: z.literal("SESSION_NOTE"),
    kind: z.enum(["ITEM", "NPC", "DECISION", "COMBAT", "DISCOVERY", "NOTE"]),
    /** Lo que se teclea al lado del sello. Opcional: el sello solo ya dice algo. */
    text: z.string().max(500).optional(),
    /** La ficha del mundo a la que apunta, si se selló desde una. */
    entityId: z.string().cuid().optional(),
  }),

  z.object({
    type: z.literal("MANUAL_OVERRIDE_SET"),
    /** Clave del valor derivado que el DM anula: `"ac"`, `"maxHp"`, `"speed.walk"`. */
    target: z.string().min(1).max(60),
    value: z.number().int(),
    previous: z.number().int().optional(),
    reason,
  }),

  /**
   * Un objeto entra en el inventario de alguien. **El nombre viaja en el suceso**, no solo su
   * referencia: la línea de tiempo se lee meses después, y para entonces el objeto puede haberse
   * borrado del catálogo de la campaña.
   */
  z.object({
    type: z.literal("ITEM_ADDED"),
    item: z.string().min(1).max(120),
    ref: z.string().min(1).max(80),
    quantity: z.number().int().min(1).max(9999),
    location: z.enum(["EQUIPPED", "CARRIED", "STORED"]),
  }),

  /** Se equipa, se guarda, se saca del cofre o se sintoniza. */
  z.object({
    type: z.literal("ITEM_MOVED"),
    item: z.string().min(1).max(120),
    ref: z.string().min(1).max(80),
    from: z.enum(["EQUIPPED", "CARRIED", "STORED"]),
    to: z.enum(["EQUIPPED", "CARRIED", "STORED"]),
    slot: z.string().max(20).optional(),
    attuned: z.boolean().optional(),
  }),

  z.object({
    type: z.literal("ITEM_REMOVED"),
    item: z.string().min(1).max(120),
    ref: z.string().min(1).max(80),
    quantity: z.number().int().min(1).max(9999),
  }),

  /**
   * Un movimiento de la bolsa. **Los deltas por denominación, no un total**: la mesa dice «tres
   * de plata», y guardar el total normalizado obliga a inventarse un cambio que nadie pidió.
   */
  z.object({
    type: z.literal("MONEY_CHANGED"),
    cp: z.number().int().optional(),
    sp: z.number().int().optional(),
    ep: z.number().int().optional(),
    gp: z.number().int().optional(),
    pp: z.number().int().optional(),
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
  /**
   * **Ver el log por los ojos de otro jugador.** Solo el DM, y solo sobre un miembro de la
   * campaña.
   *
   * No es una comodidad: es la única forma honesta de que el DM confíe en los cinco niveles de
   * visibilidad. Todos los VTT acabaron construyendo esto —Roll20 lo lanzó en 2026 porque sus
   * DMs se creaban segundas cuentas para comprobar qué se veía— y ninguno lo tuvo el primer día.
   *
   * **No relaja nada**: el filtro sigue siendo `canView`, solo que con otro espectador. Un DM no
   * ve *más* con esto, ve *menos*, que es justo el punto.
   */
  as: z.string().cuid().optional(),
});
export type ListGameEventsInput = z.infer<typeof listGameEventsSchema>;
