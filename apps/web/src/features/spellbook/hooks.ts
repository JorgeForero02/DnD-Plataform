import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CharacterSpellState } from "@dnd/shared";
import * as spellbookApi from "./api";
import { SONDEO_DE_RED_DE_SEGURIDAD_MS } from "../../lib/sondeo";

// Tarea 6 de 3A.2 — los hooks del libro de conjuros. Misma convención que
// `features/character-sheet/hooks.ts` e `features/inventory/hooks.ts`: las llamadas internas
// pasan por `spellbookApi.xxx(...)` (no por el import nombrado) porque las pruebas espían el
// módulo por su espacio de nombres (docs/04-convenciones.md).

export const spellbookKey = (campaignId: string, characterId: string) =>
  ["campaigns", campaignId, "characters", characterId, "spellbook"] as const;

export function useSpellbook(campaignId: string, characterId: string) {
  return useQuery({
    queryKey: spellbookKey(campaignId, characterId),
    queryFn: () => spellbookApi.fetchSpellbook(campaignId, characterId),
    // Se sondea, como el inventario y el resto de lo que el DM puede cambiar desde otro
    // navegador: preparar o desaprender un conjuro no cambia solo la pantalla de quien lo hace.
    refetchInterval: SONDEO_DE_RED_DE_SEGURIDAD_MS,
    enabled: Boolean(campaignId && characterId),
  });
}

/**
 * El detalle de un conjuro (su prosa del SRD), pedido solo cuando la fila lo despliega —
 * `enabled` lo mantiene apagado hasta entonces, igual que `useTiradasCitables`.
 */
export function useSpellDetail(
  campaignId: string,
  characterId: string,
  spellKey: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...spellbookKey(campaignId, characterId), spellKey] as const,
    queryFn: () => spellbookApi.fetchSpellDetail(campaignId, characterId, spellKey),
    enabled: Boolean(campaignId && characterId && spellKey) && (options?.enabled ?? true),
  });
}

export function useSetSpellState(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { spellKey: string; estado: CharacterSpellState | null }) =>
      spellbookApi.setSpellState(campaignId, characterId, vars.spellKey, { estado: vars.estado }),
    onSuccess: (data) => {
      qc.setQueryData(spellbookKey(campaignId, characterId), data);
    },
  });
}
