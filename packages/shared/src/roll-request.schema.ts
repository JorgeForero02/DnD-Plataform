import { z } from "zod";
import { rollAudienceSchema } from "./roll.schema";
import { damageTypeSchema } from "./item.schema";

// Tarea 2C.5 — **el DM pide una tirada y al jugador le aparece.**
//
// La pidió el DM asesor y es un patrón resuelto en las mesas virtuales, así que **se copia su
// forma en vez de inventarla**: el DM elige **a quién**, **qué** y **con qué CD**; a cada jugador
// le aparece un botón en su pantalla; al tirar, **el DM recibe el resultado**. Foundry lo tiene en
// varios módulos con esa misma forma (*Requestor*, *Roll Manager*, *Request Roll*) y Roll20 lo
// suple con macros.
//
// ## Se pide un VALOR de la hoja, no una expresión
//
// Y esta es la decisión que más cambia: el DM pide *«Percepción»*, no *«1d20+5»*. Tres motivos, y
// el tercero es el que la hace obligatoria:
//
//  1. **El DM no tiene por qué saberse el modificador de cada jugador.** Pedirle la expresión
//     montada es pedirle que consulte cinco hojas antes de decir «tirad percepción».
//  2. **Si el modificador cambia** —sube de nivel, se pone una armadura, le entra una
//     condición— entre que se pide y se tira, la expresión guardada estaría mintiendo.
//  3. **Componer la tirada es una regla del juego, y las reglas viven en el servidor.** Es la
//     misma línea que hizo que la ventaja se pidiera por nombre y no como `2d20kh1`.
//
// ## Y no se acumulan ventajas
//
// El contraste lo dejó dicho: **ventaja y desventaja no se acumulan y se cancelan entre sí** —«o
// tienes ventaja, o no la tienes» (Crawford)—, y nuestro modelo lo cumple por construcción porque
// se elige **un** modo, no se suman modificadores. La petición conserva eso: lleva `mode`, uno
// solo, y la pantalla que la crea no puede sumar ventajas.

/**
 * Qué se pide: **una clave de valor derivado de la hoja**, con la forma que ya usa el motor —
 * `skill.stealth`, `save.dex`, `ability.str`— o cualquier otra que la hoja derive.
 *
 * Se valida como texto con forma, no como enumeración cerrada, y a propósito: el catálogo puede
 * derivar valores nuevos —los tiene ya: `attack.spell`, `spellSaveDc`— y un enum aquí obligaría a
 * tocar dos sitios cada vez. Lo que sí se comprueba, **en el servidor y al tirar**, es que la hoja
 * de ese personaje tenga de verdad esa clave: pedir algo que no existe es un 400, no una tirada
 * inventada.
 */
export const derivedKeySchema = z
  .string()
  .min(1)
  .max(60)
  .regex(/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9-]*)?$/, "Eso no parece una clave de la hoja.");

export const createRollRequestSchema = z.object({
  /**
   * A quién se le pide. **Uno o varios**: «tirad todos percepción» es una petición por personaje,
   * no una petición con varios dueños — así cada uno tira lo suyo, con su modificador, y el
   * registro no tiene que desenredar después quién de los cinco falló.
   */
  characterIds: z.array(z.string().cuid()).min(1).max(12),
  /** Qué valor de la hoja se tira: `skill.perception`, `save.con`… */
  key: derivedKeySchema,
  /**
   * Cómo se llama en la pantalla de quien tira. **Lo escribe el DM**, y no se deriva de la clave:
   * la traducción de `skill.perception` a «Percepción» vive en la pantalla, y aquí el DM puede
   * además decir para qué —«Percepción para ver si oís al posadero»—, que es lo que convierte una
   * petición en algo que se entiende sin contexto.
   */
  label: z.string().min(1).max(120),
  dc: z.number().int().min(1).max(50).optional(),
  mode: z.enum(["NORMAL", "ADVANTAGE", "DISADVANTAGE"]).default("NORMAL"),
  /**
   * Quién verá el resultado. **Por defecto la ve la mesa**, como cualquier tirada; el DM puede
   * pedirla a ciegas, que es el caso clásico —«tirad percepción» sin que sepáis si habéis visto
   * algo— y la razón por la que 2C.1 cerró ese agujero antes de que esto existiera.
   */
  audience: rollAudienceSchema.default("PUBLIC"),
});
export type CreateRollRequestInput = z.infer<typeof createRollRequestSchema>;

/** Al responderla, quien tira solo elige si la hace: el resto ya lo dijo el DM. */
/**
 * Responder a una petición del DM. El cuerpo estaba **vacío a propósito** —qué se tira lo decidió
 * quien lo pidió—, y sigue siéndolo salvo por una cosa que sí decide quien tira:
 *
 * **gastar su inspiración** (plan 08, ficha I8). SRD 5.1: se gasta *«when you make an attack roll,
 * saving throw, or ability check»*, y una petición del DM es exactamente una salvación o una
 * prueba: dos de las tres. Dejarlo fuera habría hecho que la inspiración no sirviera justo donde
 * el DM te pone a prueba.
 *
 * **El modo lo sigue fijando la petición**, no esto: si el DM pidió desventaja, la inspiración se
 * anularía con ella y se perdería para nada, así que el servidor lo rechaza en vez de quemarla.
 */
export const answerRollRequestSchema = z.object({
  spendInspiration: z.boolean().default(false),
});
export type AnswerRollRequestInput = z.infer<typeof answerRollRequestSchema>;

// Puerta de efectos §4.2 (2026-09-13) — el daño (o la curación) de una actividad de salvación se
// tira UNA sola vez, en `ActivitiesService.usar`, y viaja aquí hasta que cada objetivo responde su
// petición. SRD 5.1, *Damage Rolls*: «If a spell or other effect deals damage to more than one
// target at the same time, roll the damage once for all of them» — el mismo dado sirve para todos los
// objetivos de un `fireball`, así que se tira antes de saber quién de ellos va a salvar.
//
// **No es del esquema PÚBLICO de crear una petición** (`createRollRequestSchema`, spec §6): nadie
// que llame a `POST /campaigns/:id/roll-requests` puede inventarse un daño pendiente para otro
// personaje. Solo lo escribe `RollRequestsService.createFromEffect`, y solo con lo que la
// actividad ya calculó dentro de su propia transacción.
export const pendingSaveEffectSchema = z.object({
  /** La cantidad YA tirada (o ya calculada, si `dados` era un bono fijo): siempre un entero ≥ 0. */
  amount: z.number().int().min(0),
  /** `-1` daña, `1` cura — el mismo vocabulario que `dados.signo` en `activity.schema.ts`. */
  signo: z.union([z.literal(1), z.literal(-1)]),
  /** Solo tiene sentido cuando `signo` es `-1`: una curación no tiene tipo de daño. */
  tipoDeDano: damageTypeSchema.optional(),
  /**
   * Qué le pasa a `amount` si la salvación tiene éxito. SRD 5.1, *Fireball*: «half as much damage
   * on a successful one» — la otra mitad de los casos es que la salvación deje el efecto entero
   * en nada (`"ninguno"`), como una condición sin componente de daño.
   */
  siSalva: z.enum(["ninguno", "mitad"]),
  /** Con qué actividad se cita en el `reason` de `changeHpFromEffect` y en la traza. */
  actividadKey: z.string().min(1),
  /** Quién firma el `changeHpFromEffect` cuando se aplique: el actor que usó la actividad. */
  actorCharacterId: z.string().min(1),
});
export type PendingSaveEffect = z.infer<typeof pendingSaveEffectSchema>;

/** Lo que `RollRequestsService.answer` aplicó al cerrar una petición con `pendingEffect`. */
export type EffectApplied = { delta: number; saved: boolean };

/**
 * Lo que `answer` devuelve en vez de `effectApplied` cuando la tirada quedó escrita y la petición
 * cerrada pero el efecto NO se pudo aplicar (ola de arreglos 1 de la puerta de efectos). La
 * pantalla lo enseña tal cual: el jugador ya tiró, no debe volver a tirar, y el DM aplica el daño a
 * mano.
 */
export type EffectWarning = { code: "EFECTO_NO_APLICADO"; message: string };

export const listRollRequestsSchema = z.object({
  /**
   * Por defecto **solo las pendientes**, que es lo que una pantalla que sondea necesita. Con
   * `includeResolved` salen también las respondidas, para repasar al terminar la sesión.
   */
  includeResolved: z.coerce.boolean().default(false),
  /**
   * **Filtra por encuentro**, y existe porque el corte de la página mentía (paso 1, tarea 17).
   *
   * La lista sale con `take: 50` por fecha descendente. Una campaña con más de cincuenta
   * peticiones pendientes de otro tipo empujaría fuera del corte las de iniciativa del combate
   * recién abierto, y la sala de espera leería **«todos han tirado»** sin que nadie hubiera
   * tirado: el `[]` de la página cincuenta es indistinguible de «cero pendientes de verdad».
   *
   * **No se sube el `take`**: un tope más alto solo mueve el problema más lejos.
   */
  encounterId: z.string().cuid().optional(),
});
export type ListRollRequestsInput = z.infer<typeof listRollRequestsSchema>;
