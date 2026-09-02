import { z } from "zod";

// Tarea 2A.15 — marcas, conjuntos y sucesos del mundo.
//
// Es lo que el motor de reglas (2A.16) escucha y sobre lo que escribe. Nada de esto decide
// permisos: **`canView` sigue siendo el dueño único de quién ve qué**, y una marca es un dato
// del mundo, no una llave.

/** Una marca con nombre: «el puente está caído». Un booleano que la campaña recuerda. */
export const setFlagSchema = z.object({
  key: z.string().min(1).max(60),
  value: z.boolean().default(true),
});
export type SetFlagInput = z.infer<typeof setFlagSchema>;

/** Un conjunto con nombre: «los que saben lo del posadero». */
export const createSetSchema = z.object({
  key: z.string().min(1).max(60),
  label: z.string().min(1).max(120),
});
export type CreateSetInput = z.infer<typeof createSetSchema>;

/**
 * Añadir o quitar un miembro. **Añadir dos veces el mismo no lo duplica**: los efectos del motor
 * tienen que ser idempotentes, o encadenar reglas produciría basura que crece sola.
 */
export const changeSetMemberSchema = z.object({
  memberType: z.enum(["user", "character", "entity"]),
  memberId: z.string().min(1).max(60),
});
export type ChangeSetMemberInput = z.infer<typeof changeSetMemberSchema>;

/** Una señal que el DM levanta a mano para disparar reglas sin cambiar nada del mundo. */
export const raiseSignalSchema = z.object({
  key: z.string().min(1).max(60),
  reason: z.string().max(280).optional(),
});
export type RaiseSignalInput = z.infer<typeof raiseSignalSchema>;
