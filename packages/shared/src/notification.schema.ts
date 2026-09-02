import { z } from "zod";

// Tarea 2A.14 — la bandeja de notificaciones.
//
// **Sin tiempo real**: se pide al cargar y al cambiar de pantalla. Los jugadores dijeron que ver
// las tiradas en el momento no hace falta, así que no se paga por empujar nada.
//
// **El payload lleva datos, nunca la frase.** El idioma es de la pantalla: guardar
// «Ana te invitó a Ceniza» en la base es escribir español en una columna y perder la posibilidad
// de cambiarlo. Es la misma regla de `labelKey` en el motor.

export const NOTIFICATION_TYPES = [
  "CAMPAIGN_MEMBER_JOINED",
  "ENTITY_CREATED",
  "ENTITY_REVEALED",
  "SESSION_STARTED",
  "SESSION_SCHEDULED",
  "COMMENT_ADDED",
  "RULE_PROPOSAL",
] as const;
export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const listNotificationsSchema = z.object({
  /** Solo las no leídas. Por defecto vienen todas, más recientes primero. */
  unreadOnly: z.coerce.boolean().optional(),
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;

/** Marcar leídas. Sin cuerpo = todas; con lista = solo esas. */
export const markReadSchema = z.object({
  ids: z.array(z.string().cuid()).max(200).optional(),
});
export type MarkReadInput = z.infer<typeof markReadSchema>;
