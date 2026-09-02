import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as levelUpApi from "./api";
import { sheetKey } from "../character-sheet/hooks";
import { charactersKey } from "../characters/hooks";

// Tarea 2A.11. Claves jerárquicas bajo `["campaigns", campaignId, ...]`
// (docs/04-convenciones.md).
//
// Trampa de vitest documentada en 04-convenciones.md: las pruebas espían
// `levelUpApi.fetchLevelUpPreview` por su espacio de nombres, así que las llamadas de este
// módulo pasan por `levelUpApi.xxx(...)` y no por el import nombrado directo.
//
// **Pedir el previo con `roll` es una mutación, no una consulta.** El servidor escribe un
// `ABILITY_ROLL` en el registro de la campaña cuando se le pide (`level-up.service.ts`,
// `preview`), y ese es justo el punto: la mesa no puede repetir la tirada hasta que le guste el
// número. Una `useQuery` la repetiría sola al reenfocar la ventana o al remontar el diálogo, y
// cada repetición dejaría otra tirada en el registro. Por eso la media es `useQuery` (lectura
// pura) y la tirada es `useMutation` (acción explícita, una por clic).

export const levelUpPreviewKey = (campaignId: string, characterId: string) =>
  ["campaigns", campaignId, "characters", characterId, "level-up-preview"] as const;

export function useLevelUpPreview(campaignId: string, characterId: string, enabled: boolean) {
  return useQuery({
    queryKey: levelUpPreviewKey(campaignId, characterId),
    queryFn: () => levelUpApi.fetchLevelUpPreview(campaignId, characterId),
    enabled,
    // El previo depende del estado del personaje ahora mismo; los 30 s de `staleTime` de
    // producción (lib/queryClient.ts) enseñarían un diff calculado antes de la última curación.
    staleTime: 0,
    gcTime: 0,
  });
}

export function useRollHitPoints(campaignId: string, characterId: string) {
  return useMutation({
    mutationFn: () => levelUpApi.fetchLevelUpPreview(campaignId, characterId, true),
  });
}

export function useApplyLevelUp(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => levelUpApi.applyLevelUp(campaignId, characterId),
    onSuccess: () => {
      // La hoja calculada cambia entera con el nivel (PG máximos, competencia, espacios,
      // aptitudes), y el nivel que pinta la cabecera de la página sale de la lista de
      // personajes. `charactersKey` es prefijo de `sheetKey`, así que la primera invalidación
      // bastaría; se escriben las dos porque cada una nombra una pantalla concreta que tiene
      // que refrescarse, y depender de un solapamiento de prefijos es lo que hizo fallar 1.16.
      qc.invalidateQueries({ queryKey: sheetKey(campaignId, characterId) });
      qc.invalidateQueries({ queryKey: charactersKey(campaignId) });
      // El previo guardado describe una subida que ya ocurrió: si el diálogo se reabre, tiene
      // que pedirle al servidor el diff del nivel nuevo, no reenseñar el viejo.
      qc.invalidateQueries({ queryKey: levelUpPreviewKey(campaignId, characterId) });
    },
  });
}
