import { z } from "zod";
import { visibilitySchema } from "./visibility.schema";

export const createSessionSchema = z.object({
  title: z.string().min(1).max(160),
  scheduledAt: z.coerce.date().optional(),
  notes: z.unknown().optional(),
  visibility: visibilitySchema.default("PLAYERS"),
  /**
   * **Dónde abre la escena**: el id de una ficha del mundo de esta misma campaña.
   *
   * `null` es un valor legítimo y distinto de ausente — es «quítalo», y por eso la actualización
   * parcial lo necesita. **Nunca se manda el nombre del lugar**: se queda viejo, no enlaza y no
   * respeta la visibilidad, que es justo lo que esta columna existe para no repetir.
   */
  openingEntityId: z.string().cuid().nullable().optional(),
});
export const updateSessionSchema = createSessionSchema.partial();

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

/**
 * La ficha por la que abre la escena, **tal y como se devuelve**: solo lo que hace falta para
 * pintar un enlace.
 *
 * **Y llega AUSENTE, no `null`, cuando el espectador no puede ver la ficha.** Ausente significa «no
 * hay nada que enseñarte aquí»; `null` significaría «esta sesión no abre en ningún sitio», que es
 * una afirmación distinta y a veces falsa. Quien pinta necesita poder distinguirlas.
 */
export const sessionOpeningEntitySchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  type: z.string(),
});
export type SessionOpeningEntity = z.infer<typeof sessionOpeningEntitySchema>;

// --- La sesión en juego (pantalla de mesa) ---

/**
 * Quién vino y con qué personaje. **Se declara al empezar**, no se deduce.
 *
 * Los VTT saben quién está porque hay un socket abierto; aquí no lo hay, así que la asistencia
 * es un dato que alguien dice. Y hace falta: de él cuelgan después «tu personaje no estaba en esa
 * escena» y el reparto de lo que se ganó.
 */
export const attendeeSchema = z.object({
  userId: z.string().cuid(),
  /** Con qué personaje vino. Ausente si vino sin jugar (un invitado, alguien de mirón). */
  characterId: z.string().cuid().optional(),
});
export type Attendee = z.infer<typeof attendeeSchema>;

/**
 * **`.default({})` y no un objeto a secas.** Empezar sin declarar quién vino es legítimo —el
 * botón no lo exige— y sin esto una petición sin cuerpo era un 400: Zod no sabe parsear
 * `undefined` como objeto. Lo destapó la suite e2e que ya existía, que arranca sesiones sin
 * mandar nada, y es exactamente el contrato que no se podía romper.
 */
export const startSessionSchema = z
  .object({
    attendance: z.array(attendeeSchema).max(20).optional(),
  })
  .default({});
export type StartSessionInput = z.infer<typeof startSessionSchema>;

/**
 * Los seis sellos rápidos. **Lista cerrada y corta a propósito**: escribir durante una partida
 * cuesta y por eso no se hace; pulsar no cuesta nada. Y como cada sello lleva su clase, el
 * resumen que se escribe al cerrar sale ya agrupado en vez de ser un muro de texto.
 */
export const SESSION_NOTE_KINDS = [
  "ITEM",
  "NPC",
  "DECISION",
  "COMBAT",
  "DISCOVERY",
  "NOTE",
] as const;
export const sessionNoteKindSchema = z.enum(SESSION_NOTE_KINDS);
export type SessionNoteKind = z.infer<typeof sessionNoteKindSchema>;

export const stampSessionNoteSchema = z.object({
  kind: sessionNoteKindSchema,
  text: z.string().max(500).optional(),
  entityId: z.string().cuid().optional(),
  /**
   * Quién lo ve. **Por defecto `PLAYERS`**, porque un sello es la crónica de la mesa, no el
   * cuaderno secreto del DM; para eso está `DM_ONLY`, elegido sello a sello.
   */
  visibility: visibilitySchema.default("PLAYERS"),
});
export type StampSessionNoteInput = z.infer<typeof stampSessionNoteSchema>;

/** Al cerrar: el resumen que el DM edita sobre las viñetas ya escritas, y a quién se publica. */
export const closeSessionSchema = z
  .object({
    recap: z.string().max(5000).optional(),
    recapVisibility: visibilitySchema.default("PLAYERS"),
  })
  .default({});
export type CloseSessionInput = z.infer<typeof closeSessionSchema>;
