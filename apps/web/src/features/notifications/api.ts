import type { NotificationType } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

// Plan 12 · 12.2 — el cliente HTTP de la bandeja.
//
// `apps/api/src/notifications/` existía **entero** desde la tarea 2A.14 —tabla, servicio y dos
// rutas— y **ningún fichero de `apps/web/src` lo mencionaba**: nadie veía un aviso nunca. Esta
// feature es la puerta que faltaba, y **no toca la API**.
//
// `apiFetch` es el único que habla HTTP (docs/04-convenciones.md).

/**
 * Un aviso tal y como lo devuelve el servidor (`model Notification`, schema.prisma).
 *
 * **El `payload` lleva datos, nunca la frase.** El idioma es de la pantalla: guardar «Ana comentó
 * Gundren» en la base sería escribir español en una columna. La forma legible se compone una vez
 * en `vocabulario.ts` y todo lo demás la importa.
 */
export interface NotificationRow {
  id: string;
  type: NotificationType;
  campaignId: string | null;
  payload: Record<string, unknown>;
  subjectType: string | null;
  subjectId: string | null;
  createdAt: string;
  /** `null` = sin leer. Es lo único que distingue una del resto. */
  readAt: string | null;
}

export interface NotificationsPage {
  notifications: NotificationRow[];
  nextCursor: string | null;
  /** **Las no leídas de todas**, no las de esta página: es lo que pinta el distintivo. */
  unreadCount: number;
}

export function fetchNotifications(limit = 20): Promise<NotificationsPage> {
  return apiFetch<NotificationsPage>(`/notifications?limit=${limit}`);
}

/**
 * Marcar leídas. **Sin `ids`, todas**; con lista, solo esas — y el servidor filtra por `userId`
 * en el `where`, así que un identificador ajeno no coincide con ninguna fila.
 *
 * **No hay borrar, y su ausencia es la decisión**: un aviso leído se apaga; el historial se queda.
 */
export function markNotificationsRead(ids?: string[]): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>("/notifications/read", {
    method: "POST",
    body: JSON.stringify(ids && ids.length > 0 ? { ids } : {}),
  });
}
