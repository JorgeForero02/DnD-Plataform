import { z } from "zod";
import { visibilitySchema } from "./visibility.schema";
import { damageTypeSchema } from "./item.schema";

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
  // La condicion que vence sola (2C.4). **Existe para que el jugador vea POR QUE** dejo de estar
  // envenenado: sin este suceso, el numero cambia y nadie sabe que paso.
  "CONDITION_EXPIRED",
  // Tirar sobre una tabla del DM (2C.6). **Regla de la casa, y por eso deja rastro**: una tabla
  // que se dispara sin dejar constancia convierte una partida de 5.a edicion en otra cosa sin que
  // los jugadores se enteren.
  "TABLE_ROLLED",
  // La iniciativa y el orden de turnos (2.5.2). Los tres momentos que la mesa quiere ver en la
  // línea de tiempo: empezar el encuentro, pasar turno, subir de asalto.
  "ENCOUNTER_STARTED",
  "TURN_ADVANCED",
  "ENCOUNTER_ENDED",
  "ROUND_ADVANCED",
  // Archivar un personaje en vez de borrarlo (2.5.8, ficha M9). **Dos tipos y no uno con una
  // bandera**: la línea de tiempo cuenta "qué pasó", y "se archivó" y "se recuperó" son dos
  // hechos distintos con su propio momento, igual que CONDITION_APPLIED/CONDITION_REMOVED.
  // 2.5.3 — **la propuesta del ataque**. Existe porque el §2.5.3 paso 5 dice «el DM confirma o
  // corrige» y §4 lo resume en «el sistema propone; el DM dispone»: sin un suceso, el veredicto
  // solo vivía en la respuesta HTTP del atacante y **no había nada que confirmar**.
  "ATTACK_RESOLVED",
  "CHARACTER_ARCHIVED",
  "CHARACTER_RESTORED",
] as const;

export const gameEventTypeSchema = z.enum(GAME_EVENT_TYPES);
export type GameEventType = z.infer<typeof gameEventTypeSchema>;

/** A qué apunta un evento. Es columna, no `payload`, porque se consulta. */
export const gameEventSubjectTypeSchema = z.enum(["character", "campaign", "session", "encounter"]);
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
    type: z.literal("TABLE_ROLLED"),
    tableName: z.string().min(1).max(120),
    /** Caras del dado que se tiró: el resultado más alto de la tabla. */
    die: z.number().int().positive(),
    roll: z.number().int().positive(),
    text: z.string().min(1).max(500),
    /** Si la disparó un crítico o una pifia, en vez de tirarla el DM a mano. */
    trigger: z.enum(["CRITICAL", "FUMBLE"]).optional(),
  }),
  z.object({
    type: z.literal("CONDITION_EXPIRED"),
    key: z.string().min(1).max(60),
    level: z.number().int().min(1).max(6).optional(),
    /** El segundo del reloj en que vencía. La línea de tiempo dice cuándo, no solo qué. */
    expiredAtClock: z.number().int().nonnegative(),
  }),
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
    /**
     * Tarea 2.5.1. **Opcional**: los sucesos ya escritos no lo tienen, y una curación o un
     * ajuste manual del DM no tienen tipo de daño que contar. Cuando está, es lo que responde
     * *"¿de qué murió Elara?"* sin recalcular la línea de tiempo entera — por eso es columna y
     * no solo un campo de aquí (`schema.prisma`, `docs/04-convenciones.md`).
     */
    damageType: damageTypeSchema.optional(),
    /** Si el golpe fue crítico: cuenta **dos** fracasos de muerte en vez de uno. */
    critical: z.boolean().optional(),
    /**
     * **Muerte masiva**: el daño sobrante tras llegar a 0 igualó o superó los PG máximos, así
     * que el personaje muere en el acto. Se guarda porque es una muerte sin tiradas, y sin esto
     * la línea de tiempo no puede explicar por qué alguien murió sin fallar ninguna.
     */
    massive: z.boolean().optional(),
    /**
     * Tarea 2.5.4. **De qué tirada salió el daño.** Es el mismo patrón que `ATTACK_RESOLVED`
     * ya usa para el veredicto (ficha M15): sin esto, la tirada y el cambio de PG eran dos
     * hechos sin relación en el registro, y «¿de qué murió Elara?» no podía responder «de esta
     * tirada» — solo «de este tipo». **Opcional**: todo el historial ya escrito no lo tiene, y
     * un ajuste manual del DM (sin tirada de por medio) sigue sin tener uno.
     */
    rollEventId: z.string().min(1).optional(),
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

  // --- Iniciativa y orden de turnos (2.5.2) ---
  z.object({
    type: z.literal("ENCOUNTER_STARTED"),
    encounterId: z.string().cuid(),
    /**
     * **Sin conteos, y eso lo decidió una revisión de cierre.** Llevaba `combatantCount` y
     * `positionCount`, y los dos eran una fuga por deducción: este suceso es `PLAYERS`, así que
     * un jugador que ve dos combatientes suyos en la ficha del encuentro y lee «ocho» aquí sabe
     * que hay seis enemigos escondidos. La ficha ya los filtra por `canView`; el registro los
     * cantaba.
     *
     * `positionCount` además **describía algo que nunca ocurría**: decía «menos que
     * `combatantCount` si algún grupo actúa junto» y el servicio pasaba el mismo array a los
     * dos, así que eran siempre idénticos. Una mentira semántica con la sintaxis en regla —
     * justo la clase que `pnpm check:docs` no puede cazar.
     *
     * Lo que este suceso tiene que decir es **que empezó un encuentro**. Cuántos hay se ve
     * mirando, y lo que se ve lo decide `canView`.
     */
  }),
  z.object({
    type: z.literal("TURN_ADVANCED"),
    encounterId: z.string().cuid(),
    /** La posición de la que se sale y a la que se llega, no solo el `characterId`: dos
     * combatientes distintos pueden compartir personaje… salvo que aquí nunca pasa, pero la
     * posición es el dato que de verdad ordena el turno. */
    fromPosition: z.number().int().nonnegative(),
    toPosition: z.number().int().nonnegative(),
    round: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("ENCOUNTER_ENDED"),
    encounterId: z.string().cuid(),
    /**
     * Cuántos asaltos duró. **No cuántos combatientes había**, por la misma razón por la que
     * `ENCOUNTER_STARTED` se quedó sin conteos tras su revisión de cierre: este suceso es
     * `PLAYERS`, y un número de combatientes le dice a un jugador cuántos enemigos escondidos
     * hubo. Los asaltos no delatan a nadie y son lo que la mesa recuerda.
     */
    rounds: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("ATTACK_RESOLVED"),
    attackerId: z.string().min(1),
    attackName: z.string().max(120),
    verdict: z.enum(["HIT", "MISS", "CRITICAL"]),
    /**
     * De qué tirada salió el veredicto. **Atarlo a la tirada es la mitad del punto**: `critical`
     * viajaba suelto en el cuerpo de la petición, sin relación con el 20 que lo justificaba
     * (ficha R2C-2); aquí el veredicto cuelga del `eventId` de la tirada que lo produjo.
     *
     * **Y lo que NO lleva es la CA.** Ni con ese nombre ni con ningún otro: lo que sale es la
     * palabra —impacta, falla, crítico—, nunca el número contra el que se tiró.
     */
    rollEventId: z.string().min(1),
  }),
  z.object({
    type: z.literal("ROUND_ADVANCED"),
    encounterId: z.string().cuid(),
    from: z.number().int().positive(),
    to: z.number().int().positive(),
    /** El reloj de campaña tras el avance — un asalto son seis segundos (D-2C-1). */
    clockSeconds: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("CHARACTER_ARCHIVED"),
    characterName: z.string().max(120).optional(),
  }),
  z.object({
    type: z.literal("CHARACTER_RESTORED"),
    characterName: z.string().max(120).optional(),
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
