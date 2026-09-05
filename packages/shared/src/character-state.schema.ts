import { z } from "zod";

// Tareas 2A.8 y 2A.12 — recursos consumibles, descansos, y condiciones.

/**
 * Un recurso consumible. **Inspiración, furia, ki, dados de golpe y espacios de conjuro son el
 * mismo mecanismo**: un contador con máximo que un descanso repone. Por eso son una tabla y no
 * cinco funcionalidades.
 */
export const resourceResetSchema = z.enum(["NONE", "SHORT_REST", "LONG_REST"]);

/**
 * Quién puede subirlo. Es el **caso estrecho** de permisos por campo que 2A sí necesita —la
 * inspiración la concede el DM, la furia la gasta y la recupera su dueño—, y el único: los
 * permisos por campo generales quedan fuera de 2A.
 */
export const resourceGrantorSchema = z.enum(["DM_ONLY", "OWNER"]);

export const upsertResourceSchema = z.object({
  key: z.string().min(1).max(60),
  label: z.string().min(1).max(120),
  current: z.number().int().min(0).max(9999),
  max: z.number().int().min(0).max(9999).nullable().optional(),
  resetOn: resourceResetSchema.default("NONE"),
  grantedBy: resourceGrantorSchema.default("OWNER"),
});
export type UpsertResourceInput = z.infer<typeof upsertResourceSchema>;

/** Gastar o reponer. **Delta y no valor absoluto**, por el mismo motivo que los PG. */
export const spendResourceSchema = z.object({
  amount: z.number().int().min(1).max(9999),
  reason: z.string().max(280).optional(),
});
export type SpendResourceInput = z.infer<typeof spendResourceSchema>;

/**
 * **Regalar un recurso a otro personaje de la mesa** (plan 08, ficha I8).
 *
 * Del SRD, sobre la inspiración: *«you can give it to another player»*. No es un gasto seguido de
 * una reposición —eso serían dos peticiones y un momento en que la inspiracion esta en los dos o
 * en ninguno—, es **un solo gesto** que el servidor resuelve en una transaccion.
 */
export const giveResourceSchema = z.object({
  toCharacterId: z.string().min(1),
  amount: z.number().int().min(1).max(9999).default(1),
  reason: z.string().max(280).optional(),
});
export type GiveResourceInput = z.infer<typeof giveResourceSchema>;

/**
 * Declarar un descanso.
 *
 * **Corto**: repone lo marcado `SHORT_REST` y permite gastar dados de golpe para curarse.
 * **Largo**: repone todo lo consumible, devuelve los PG al máximo, recupera **la mitad de los
 * dados de golpe redondeando hacia arriba, mínimo uno** —no todos, que es el error clásico— y
 * baja un nivel de agotamiento.
 */
export const declareRestSchema = z.object({
  kind: z.enum(["SHORT", "LONG"]),
  /** Dados de golpe que se gastan en un descanso corto, con su curación. Solo en el corto. */
  spendHitDice: z.number().int().min(0).max(20).optional(),
  /**
   * **El descanso se interrumpió, y lo declara el DM** (2C.3, hueco H-2C-2).
   *
   * El SRD dice que una hora de actividad agotadora —andar, luchar, lanzar conjuros— obliga a
   * **empezar el descanso otra vez**: <https://5thsrd.org/adventuring/resting/>. La máquina **no
   * puede detectarlo** —no sabe que os atacaron a la tercera hora—, así que lo honesto es que lo
   * diga quien arbitra: «este descanso se interrumpió». La máquina ejecuta, el DM arbitra.
   *
   * **Y entonces no da nada**, que es lo que dice la fuente y no lo que decía nuestro plan. El
   * plan de 2C prometía «con una hora hecha, se cobran los beneficios de un corto»: eso **no está
   * en el SRD 5.1** —es un arbitraje de mesa, razonable pero de la casa—, y aquí manda la fuente.
   * Un DM que quiera darles el corto lo tiene a un botón: declarar un descanso corto.
   */
  interrupted: z.boolean().optional(),
  reason: z.string().max(280).optional(),
});
export type DeclareRestInput = z.infer<typeof declareRestSchema>;

/**
 * Las quince condiciones del SRD 5.1 que **el motor entiende**.
 *
 * La clave de la tabla es **libre**, no este enum: cualquier otra —«concentrándose en
 * Bendición»— se guarda, se enseña y no calcula nada. El informe de huecos avisó de que un enum
 * cerrado deja la concentración fuera y añadirla después es una migración; esta lista dice qué
 * se automatiza, no qué se puede escribir.
 */
export const SRD_CONDITIONS = [
  "blinded",
  "charmed",
  "deafened",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
  "exhaustion",
] as const;
export const srdConditionSchema = z.enum(SRD_CONDITIONS);
export type SrdCondition = z.infer<typeof srdConditionSchema>;

/**
 * **La marca que deja la accion Ayudar** (plan 08, ficha I8).
 *
 * **No es una condicion del SRD**, y por eso no esta en la lista de arriba: las quince de esa lista
 * son estados de la criatura, y esto es el rastro de una accion que alguien hizo por ti. Se guarda
 * en la misma tabla porque **es exactamente la misma forma** —una clave sobre un personaje, con
 * origen y con vencimiento (2C.4)—, y montar una tabla aparte para una fila con las mismas cuatro
 * columnas habria sido duplicar el mecanismo.
 *
 * SRD 5.1, accion Ayudar: *«you can aid a friendly creature in attacking a creature within 5 feet
 * of you... the first attack roll is made with advantage»*. **Da ventaja, no un +1d4** —el +1d4 es
 * `Bless`, que es un conjuro—, dura **una sola tirada** y **caduca al principio de tu siguiente
 * turno**.
 *
 * El motor SI la entiende, a diferencia de una clave libre cualquiera: entra en la sugerencia de
 * ventaja del ataque (`suggested-roll-mode.ts`). Esta escrita aqui, en `shared`, porque la usan el
 * servidor y la pantalla y una clave copiada en dos sitios acaba escrita de dos formas.
 */
export const CLAVE_AYUDA = "helped";

/**
 * Ayudar a alguien de la mesa.
 *
 * **Lo unico que se declara es a quien**, porque es lo unico que el servidor puede saber. El SRD
 * exige ademas que el enemigo este **a 5 pies de quien ayuda**, y eso son distancias: no las
 * tenemos, no se comprueban, y **la pantalla lo dice** en vez de fingir que si.
 */
export const helpSchema = z.object({
  targetCharacterId: z.string().min(1),
});
export type HelpInput = z.infer<typeof helpSchema>;

export const applyConditionSchema = z.object({
  key: z.string().min(1).max(60),
  /** Solo el agotamiento tiene nivel, de 1 a 6. */
  level: z.number().int().min(1).max(6).optional(),
  note: z.string().max(280).optional(),
  /**
   * **Cuánto dura, en segundos de juego** (2C.4). Sin esto la condición es indefinida y la quita
   * el DM a mano, que es como funcionaba hasta 2C y sigue siendo lo correcto para «envenenado
   * hasta que alguien te cure».
   *
   * **Segundos y no un vocabulario cerrado de duraciones**, y eso se decidió mirando la fuente:
   * las duraciones del SRD son 1 asalto, 1 minuto, 10 minutos, 1 hora, 8 horas, 24 horas, 7 días,
   * 10 días y 30 días — nueve valores que son todos **múltiplos de segundos** del mismo reloj. Un
   * enum con esos nueve obligaría a migrarlo el día que un objeto dure 3 días, y la pantalla
   * puede ofrecer los nueve botones igual.
   *
   * Lo que **no** entra aquí es «hasta el próximo descanso largo» ni «mientras te concentres»:
   * esas no son duraciones, son sucesos, y modelarlas como un número sería mentir. Están
   * declaradas como pendientes.
   *
   * El tope es un año, el mismo del reloj: más que eso no es una condición, es un cambio de
   * personaje.
   */
  durationSeconds: z.number().int().positive().max(31_536_000).optional(),
});
export type ApplyConditionInput = z.infer<typeof applyConditionSchema>;
