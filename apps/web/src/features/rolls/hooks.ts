import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateRollInput } from "@dnd/shared";
import * as rollsApi from "./api";

// Tarea 2C.2 — los hooks de la pantalla de dados. Misma convención que `features/inventory`: las
// llamadas internas pasan por `rollsApi.xxx(...)` y no por el import nombrado, porque las
// pruebas espían el módulo por su espacio de nombres y un espía sobre el espacio de nombres no
// intercepta una llamada interna al propio módulo (docs/04-convenciones.md, «trampa de vitest»).

export interface FiltroDeTiradas {
  sessionId?: string;
  characterId?: string;
  limit?: number;
}

/**
 * Clave jerárquica, como todo lo que cuelga de una campaña (docs/04-convenciones.md).
 * `["campaigns", id, "rolls", filtro]`: invalidar el prefijo sin el filtro los alcanza todos,
 * que es justo lo que hace falta cuando se acaba de tirar.
 */
export const rollsKey = (campaignId: string, filtro: FiltroDeTiradas = {}) =>
  ["campaigns", campaignId, "rolls", filtro] as const;

export function useRollLog(campaignId: string, filtro: FiltroDeTiradas = {}) {
  return useQuery({
    // **Se sondea, igual que el inventario y la sesión en curso.** La mesa tira desde cinco
    // portátiles y la invalidación solo alcanza al navegador que hizo la petición: sin esto, las
    // tiradas de los demás no aparecen hasta volver a la pestaña. Treinta segundos es lo que ya
    // usan las otras dos pantallas; el tiempo real es la fase 4.
    refetchInterval: 30_000,
    queryKey: rollsKey(campaignId, filtro),
    queryFn: () => rollsApi.fetchRolls(campaignId, filtro),
    enabled: Boolean(campaignId),
  });
}

/**
 * Tirar. **Aquí no se genera azar**: el navegador manda la expresión, el modo y la audiencia, y
 * el servidor devuelve el resultado ya tirado y ya escrito en el log (`rolls.service.ts`).
 */
export function useCreateRoll(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRollInput) => rollsApi.createRoll(campaignId, input),
    onSuccess: () => {
      // Sin el filtro: la tirada que acaba de escribirse entra en el registro de esta pantalla y
      // en el de cualquier otra que esté mirando la misma campaña con otro filtro.
      void qc.invalidateQueries({ queryKey: ["campaigns", campaignId, "rolls"] });
    },
  });
}
