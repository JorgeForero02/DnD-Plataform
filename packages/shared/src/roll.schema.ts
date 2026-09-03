import { z } from "zod";
import { dmTableRollSchema } from "./dm-table.schema";
import type { Visibility } from "./visibility.schema";

// Tarea 2A.13 — tirar de verdad.
//
// **Por qué esto es una tarea y no un detalle.** 2A.1 solo *evalúa* una expresión; nadie la
// ejecutaba. De este endpoint dependen tres cosas: las tiradas de creación de personaje
// (2A.6), el disparador «una tirada falla» del motor de eventos, y la línea de tiempo de la
// sesión. Sin él, ninguna de las tres existe.
//
// **Quien tira elige quién lo ve.** Una tirada oculta del DM es `DM_ONLY`; la de un jugador en
// la mesa es `PLAYERS`. Es el mismo modelo de visibilidad de todo lo demás, y por eso no hay
// nada nuevo que aprender.

// ---------------------------------------------------------------------------------------------
// Tarea 2C.1 — **quién ve una tirada**, y el agujero de la tirada a ciegas.
//
// Hasta 2C, quien tiraba elegía un nivel de visibilidad crudo (`PLAYERS`, `OWNER_DM`,
// `DM_ONLY`). Eso tenía dos problemas: un valor de enumeración del modelo de datos no es
// vocabulario de mesa, y **el resultado se devolvía siempre a quien tiraba**, así que una
// tirada `DM_ONLY` quedaba escondida en el registro y visible en la respuesta de su autor. Es
// decir: la tirada a ciegas no existía aunque pareciera que sí.
//
// **La forma se copia de la industria en vez de inventarla.** Foundry lleva años con cuatro
// modos de tirada y son el vocabulario que la gente ya entiende
// (https://foundryvtt.com/article/dice/):
//
// | Modo de Foundry | Quién ve el resultado |
// |---|---|
// | `publicroll` | toda la mesa |
// | `gmroll` | quien tira **y** el DM |
// | `blindroll` | **solo el DM**; quien tira no ve su propio resultado |
// | `selfroll` | **solo quien tira** — «only the user who made the roll can choose to reveal it» |
//
// **Y aquí entran tres de los cuatro, no los cuatro, y conviene decir por qué.** El alcance de
// 2C daba por hecho que nuestro modelo expresaba tres con la visibilidad que ya existe y que solo
// faltaba el endpoint. Lo primero es cierto; lo segundo se quedó corto: **`selfroll` esconde el
// resultado también del DM**, y `canView` (`apps/api/src/common/visibility.ts`) le devuelve
// `true` al DM antes de mirar el nivel. O sea que «Propia» no es un nivel que falte: es una
// **excepción a la regla de que el DM lo ve todo**, que es una regla del proyecto y no un detalle
// de esta pantalla. Cambiarla afecta a todos los recursos, y filtrarla solo aquí sería
// reimplementar la matriz de visibilidad a mano, que está prohibido. Queda declarada como ficha
// (**C2C-1** en `docs/06-pendientes.md`) y es decisión del autor, no de quien programa.
// ---------------------------------------------------------------------------------------------

/**
 * A quién va dirigida una tirada. **Es el vocabulario de la mesa**, y el nivel de visibilidad se
 * deriva de él: nadie elige un `DM_ONLY` a mano.
 */
export const rollAudienceSchema = z.enum(["PUBLIC", "DM_PRIVATE", "BLIND"]);
export type RollAudience = z.infer<typeof rollAudienceSchema>;

/**
 * La traducción, **escrita una sola vez**. La pantalla enseña el nombre; la base guarda el nivel.
 *
 * - `PUBLIC` → `PLAYERS`: la mesa entera. No `PUBLIC` (el nivel), que en este proyecto significa
 *   *fuera de la campaña también*, y una tirada no se publica al mundo.
 * - `DM_PRIVATE` → `OWNER_DM`: quien tira y el DM.
 * - `BLIND` → `DM_ONLY`: solo el DM. Y **la respuesta del `POST` no lleva el resultado**, que es
 *   la mitad que faltaba.
 */
export const VISIBILIDAD_POR_AUDIENCIA = {
  PUBLIC: "PLAYERS",
  DM_PRIVATE: "OWNER_DM",
  BLIND: "DM_ONLY",
} as const satisfies Record<RollAudience, Visibility>;

export const createRollSchema = z.object({
  /** `d20`, `2d20kh1`, `4d6kh3`, `1d8+3`… Lo valida el evaluador de 2A.1. */
  expression: z.string().min(1).max(120),
  /** Qué se está tirando, en palabras: «Percepción», «Salvación de Destreza». */
  label: z.string().min(1).max(120).optional(),
  /**
   * Clase de Dificultad, si la había. **Opcional a propósito:** en la mesa se tira muchas veces
   * sin CD —daño, iniciativa, una tirada de dados a secas— y obligar a poner una convertiría
   * cada tirada en una pregunta.
   */
  dc: z.number().int().min(1).max(50).optional(),
  /** El personaje que tira, si es de alguien. Sin él, la tirada es de la campaña. */
  characterId: z.string().cuid().optional(),
  /**
   * La sesión a la que pertenece. **Si no se dice, se usa la que esté en curso**, que es lo que
   * quiere quien tira durante una partida; y si no hay ninguna, la tirada queda fuera de sesión
   * en vez de fallar.
   */
  sessionId: z.string().cuid().optional(),
  /**
   * **A quién va dirigida.** Ver `rollAudienceSchema`: el nivel de visibilidad se deriva, no se
   * elige a mano.
   */
  audience: rollAudienceSchema.default("PUBLIC"),
  /**
   * **Ventaja y desventaja como concepto de juego, no como sintaxis.**
   *
   * El plan de 2A las dejó fuera explícitamente —«aquí `kh1` es solo sintaxis»— y esa decisión
   * se tomó cuando no había pantalla. Con pantalla es insostenible: salen en casi todos los
   * turnos de 5.ª edición (ataque furtivo, ayuda, estar derribado, asustado, invisible), y sin
   * esto el jugador tiene que salir de la hoja y escribir `2d20kh1+3` a mano — que es la imagen
   * del papel al lado del portátil que esta herramienta existe para quitar.
   *
   * **Lo compone el servidor**, no el cliente: la regla es «dos d20, te quedas el mejor (o el
   * peor)», y esa es una regla del juego. Un cliente que mandara la expresión ya montada podría
   * decir que tira con ventaja y mandar `3d20kh1`.
   */
  mode: z.enum(["NORMAL", "ADVANTAGE", "DISADVANTAGE"]).default("NORMAL"),
});
export type CreateRollInput = z.infer<typeof createRollSchema>;
export type RollMode = CreateRollInput["mode"];

/**
 * **`natural` y `outcome` son dos hechos distintos, y por eso son dos campos.**
 *
 * Un 20 natural que no llega a la CD **sigue siendo un 20 natural**; un 1 natural que la supera
 * sigue siendo un 1. Guardarlos en un solo campo obliga a elegir cuál se pierde, y en la mesa
 * los dos se cantan.
 */
export const rollNaturalSchema = z.enum(["NONE", "ONE", "TWENTY"]);
export const rollOutcomeSchema = z.enum(["NO_DC", "SUCCESS", "FAILURE"]);

/**
 * El desglose. **Nunca un número suelto**: un total sin los dados que lo produjeron no se puede
 * discutir en una mesa, y discutir una tirada es la mitad de la gracia.
 */
const desglose = {
  /** Todos los dados que cayeron, en el orden en que salieron. */
  rolls: z.array(z.number().int()),
  /** Los que cuentan, y los que descartó un `kh`/`kl`. **Lo descartado no se pierde.** */
  kept: z.array(z.number().int()),
  dropped: z.array(z.number().int()),
  /** La parte que no son dados: el `+3` de `1d8+3`. */
  modifier: z.number().int(),
  total: z.number().int(),
  dc: z.number().int().optional(),
  natural: rollNaturalSchema,
  outcome: rollOutcomeSchema,
} as const;

/**
 * Lo que devuelve el servidor: el evento que quedó escrito y, **solo si quien tiró puede verlo**,
 * el resultado.
 *
 * **Es una unión discriminada y no un puñado de campos opcionales**, y esa es la diferencia entre
 * cerrar el agujero y taparlo: con campos opcionales, una pantalla que se olvide de comprobar
 * pinta `undefined` donde había un total y nadie se entera; con la unión, el compilador no deja
 * leer `total` sin haber mirado `revealed`. La tirada a ciegas es una regla, no un detalle de
 * presentación.
 */
export const rollResultSchema = z.discriminatedUnion("revealed", [
  z.object({
    revealed: z.literal(true),
    eventId: z.string(),
    expression: z.string(),
    audience: rollAudienceSchema,
    ...desglose,
    /**
     * **La tabla de la casa que disparó este natural** (2C.6), si la campaña las tiene
     * encendidas. Ausente en todo lo demás, que es el caso por defecto: el SRD no trae ninguna
     * tabla de críticos ni de pifias, y con el interruptor apagado un crítico duplica dados y nada
     * más.
     */
    houseTable: dmTableRollSchema.optional(),
  }),
  z.object({
    /**
     * Tirado, y quien lo pidió **no** puede verlo: es una tirada a ciegas hecha por un jugador.
     * La pantalla dice «tirado, el DM lo sabe» — que es exactamente lo que pasa en la mesa cuando
     * el DM tira detrás de la pantalla.
     */
    revealed: z.literal(false),
    eventId: z.string(),
    expression: z.string(),
    audience: rollAudienceSchema,
  }),
]);
export type RollResult = z.infer<typeof rollResultSchema>;
export type RollResultRevealed = Extract<RollResult, { revealed: true }>;

/**
 * El registro de tiradas de una campaña: `GET /campaigns/:id/rolls`.
 *
 * **No es un segundo camino de lectura con su propia matriz de visibilidad.** Por dentro es el
 * log de partida filtrado por su columna `type`, servido por `GameEventsService.list`, que es el
 * único sitio donde vive `canView` para los sucesos. Lo que este endpoint añade es el filtro y el
 * nombre: «las tiradas de esta sesión» es una pregunta que la mesa hace al terminar, y hasta 2C
 * había que responderla leyendo el log entero a mano.
 */
export const listRollsSchema = z.object({
  /** Solo las de una sesión. */
  sessionId: z.string().cuid().optional(),
  /** Solo las de un personaje. Es la columna `subjectId` del suceso, no un campo del `payload`. */
  characterId: z.string().cuid().optional(),
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListRollsInput = z.infer<typeof listRollsSchema>;
