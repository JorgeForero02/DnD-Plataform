import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/auth.store";
import * as notificationsApi from "./api";

// Plan 12 · 12.2 — los hooks de la bandeja. Misma convención que el resto de features: las
// llamadas internas pasan por `notificationsApi.xxx(...)` y no por el import nombrado, porque las
// pruebas espían el módulo por su espacio de nombres (docs/04-convenciones.md, «trampa de vitest»).

export const notificationsKey = ["notifications"] as const;

/**
 * **Treinta segundos, y esto es la red de seguridad, no el camino principal.**
 *
 * El camino principal llega en 12.3 —el canal en vivo—, y entonces este número sube a los 60 s que
 * el plan pide. Mientras tanto medio minuto es lo que hay entre «te han comentado» y enterarte, y
 * es el mismo valor que ya usan el inventario y el reloj.
 */
export const SONDEO_DE_AVISOS_MS = 30_000;

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
