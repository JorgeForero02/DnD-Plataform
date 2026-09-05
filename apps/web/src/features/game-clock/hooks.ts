import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdvanceClockInput } from "@dnd/shared";
import * as clockApi from "./api";
import { SONDEO_DE_RED_DE_SEGURIDAD_MS } from "../../lib/sondeo";

/** Clave jerárquica, como todo lo de una campaña. */
export const clockKey = (campaignId: string) => ["campaigns", campaignId, "clock"] as const;

/**
 * La hora del mundo. **Se sondea**, porque el reloj lo mueve el DM y los demás tienen que
 * enterarse sin recargar — es el mismo criterio del inventario y de la sesión en curso, y sigue
 * sin ser tiempo real, que es la fase 4.
 */
export function useGameClock(campaignId: string) {
  return useQuery({
    queryKey: clockKey(campaignId),
    queryFn: () => clockApi.fetchClock(campaignId),
    refetchInterval: SONDEO_DE_RED_DE_SEGURIDAD_MS,
  });
}

export function useAdvanceClock(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdvanceClockInput) => clockApi.advanceClock(campaignId, input),
    onSuccess: () => {
      // **Avanzar el reloj mueve media campaña**, y por eso invalida más de una cosa: la hora,
      // las condiciones que acaban de vencer, las hojas que las aplicaban y la línea de tiempo,
      // donde queda el rastro. Invalidar solo el reloj dejaría la pantalla diciendo una hora nueva
      // con los efectos viejos, que es la clase de discrepancia que 2C.4 existe para no tener.
      void qc.invalidateQueries({ queryKey: ["campaigns", campaignId] });
    },
  });
}
