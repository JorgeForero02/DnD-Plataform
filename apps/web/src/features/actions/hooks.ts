import { useQuery } from "@tanstack/react-query";
import * as actionsApi from "./api";
import { SONDEO_DE_MESA_MS } from "../character-sheet/hooks";

// Task 4 de 3A.3 (T22) — el gancho de la barra de acciones. Misma convención que
// `character-sheet/hooks.ts`: las llamadas internas pasan por `actionsApi.xxx(...)` (no por el
// import nombrado) porque las pruebas espían el módulo por su espacio de nombres
// (docs/04-convenciones.md).

export const actionsKey = (campaignId: string, characterId: string) =>
  ["campaigns", campaignId, "characters", characterId, "actions"] as const;

/**
 * **El mismo intervalo que la hoja y el registro (`SONDEO_DE_MESA_MS`), no el de treinta segundos
 * del inventario.** La barra vive pegada al marco del tablero y a la tira de iniciativa —que ya
 * sondea a este ritmo—: un botón que sigue diciendo «disponible» quince segundos después de que
 * otro combatiente gastó su turno es la misma contradicción de pantalla que ya documenta
 * `useCharacterSheet`. Las mutaciones de la propia barra invalidan `actionsKey` al momento; el
 * sondeo es la red de seguridad para lo que gasta otra persona (el DM pasando turno).
 */
export function useAcciones(campaignId: string, characterId: string) {
  return useQuery({
    queryKey: actionsKey(campaignId, characterId),
    queryFn: () => actionsApi.fetchAcciones(campaignId, characterId),
    refetchInterval: SONDEO_DE_MESA_MS,
    enabled: Boolean(campaignId && characterId),
  });
}
