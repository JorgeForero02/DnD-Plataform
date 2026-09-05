import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/auth.store";
import * as notificationsApi from "./api";
import { SONDEO_DE_RED_DE_SEGURIDAD_MS } from "../../lib/sondeo";

// Plan 12 · 12.2 — los hooks de la bandeja. Misma convención que el resto de features: las
// llamadas internas pasan por `notificationsApi.xxx(...)` y no por el import nombrado, porque las
// pruebas espían el módulo por su espacio de nombres (docs/04-convenciones.md, «trampa de vitest»).

export const notificationsKey = ["notifications"] as const;

/**
 * **La red de seguridad, no el camino principal**: el camino es el canal en vivo
 * (`features/live/canal.ts`), que invalida esta consulta en cuanto pasa algo en la mesa.
 */
export const SONDEO_DE_AVISOS_MS = SONDEO_DE_RED_DE_SEGURIDAD_MS;

export function useNotifications(limit = 20) {
  // **Sin sesión no se pregunta.** La cabecera se pinta también en las pantallas públicas
  // (`/acerca-de`, la invitación, el 404): pedir la bandeja allí sería un 401 garantizado por
  // cada carga, y un error en la consola de quien no ha entrado todavía.
  const sesionIniciada = useAuthStore((s) => s.token !== null);
  return useQuery({
    queryKey: [...notificationsKey, limit] as const,
    queryFn: () => notificationsApi.fetchNotifications(limit),
    refetchInterval: SONDEO_DE_AVISOS_MS,
    enabled: sesionIniciada,
  });
}

/**
 * Marcar leído. **Sin `ids`, todas** —que es lo que la gente usa de verdad—; con lista, solo esas.
 *
 * No hay borrar: un aviso leído se apaga y el historial se queda.
 */
export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => notificationsApi.markNotificationsRead(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notificationsKey });
    },
  });
}
