import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChangeHpInput,
  CreateRollInput,
  SetHpInput,
  UpdateCharacterSheetInput,
} from "@dnd/shared";
import * as characterSheetApi from "./api";

// Tarea 2A.10. Claves jerárquicas bajo la raíz `["campaigns", campaignId, ...]`
// (docs/04-convenciones.md): invalidar `sheetKey` invalida solo la hoja de este personaje, y
// las mutaciones de PG/recursos/condiciones/descanso todas terminan invalidando la misma raíz
// porque todas pueden cambiar lo que `GET .../sheet` calcula (un descanso cambia PG y recursos
// a la vez, por ejemplo).
//
// Trampa de vitest documentada en 04-convenciones.md: los tests espían `characterSheetApi.fetchSheet`
// etc. por su espacio de nombres, así que las llamadas internas de este módulo pasan por
// `characterSheetApi.xxx(...)` y no por el import nombrado directo.

export const sheetKey = (campaignId: string, characterId: string) =>
  ["campaigns", campaignId, "characters", characterId, "sheet"] as const;
export const resourcesKey = (campaignId: string, characterId: string) =>
  ["campaigns", campaignId, "characters", characterId, "resources"] as const;
export const conditionsKey = (campaignId: string, characterId: string) =>
  ["campaigns", campaignId, "characters", characterId, "conditions"] as const;

/**
 * El catálogo SRD. **Fuera de la raíz de campaña a propósito**: es el mismo para todas, no
 * cambia mientras la aplicación esté abierta, y meterlo bajo `["campaigns", id]` haría que
 * cambiar de campaña lo volviera a pedir sin motivo.
 */
export const catalogKey = ["catalog"] as const;

export function useCatalog() {
  return useQuery({
    queryKey: catalogKey,
    queryFn: () => characterSheetApi.fetchCatalog(),
    staleTime: Infinity,
  });
}

export function useCharacterSheet(campaignId: string, characterId: string) {
  return useQuery({
    queryKey: sheetKey(campaignId, characterId),
    queryFn: () => characterSheetApi.fetchSheet(campaignId, characterId),
    enabled: Boolean(campaignId && characterId),
  });
}

export function useUpdateSheet(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCharacterSheetInput) =>
      characterSheetApi.updateSheet(campaignId, characterId, input),
    onSuccess: (data) => qc.setQueryData(sheetKey(campaignId, characterId), data),
  });
}

export function useChangeHp(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangeHpInput) =>
      characterSheetApi.changeHp(campaignId, characterId, input),
    onSuccess: (data) => qc.setQueryData(sheetKey(campaignId, characterId), data),
  });
}

export function useSetHp(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SetHpInput) => characterSheetApi.setHp(campaignId, characterId, input),
    onSuccess: (data) => qc.setQueryData(sheetKey(campaignId, characterId), data),
  });
}

export function useRollDeathSave(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => characterSheetApi.rollDeathSave(campaignId, characterId),
    onSuccess: (data) => qc.setQueryData(sheetKey(campaignId, characterId), data),
  });
}

export function useResources(campaignId: string, characterId: string) {
  return useQuery({
    queryKey: resourcesKey(campaignId, characterId),
    queryFn: () => characterSheetApi.fetchResources(campaignId, characterId),
    enabled: Boolean(campaignId && characterId),
  });
}

export function useSpendResource(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { key: string; amount: number; reason?: string }) =>
      characterSheetApi.spendResource(campaignId, characterId, vars.key, vars.amount, vars.reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: resourcesKey(campaignId, characterId) }),
  });
}

export function useRestoreResource(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { key: string; amount: number; reason?: string }) =>
      characterSheetApi.restoreResource(
        campaignId,
        characterId,
        vars.key,
        vars.amount,
        vars.reason,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: resourcesKey(campaignId, characterId) }),
  });
}

export function useDeclareRest(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { kind: "SHORT" | "LONG"; spendHitDice?: number }) =>
      characterSheetApi.declareRest(campaignId, characterId, vars.kind, vars.spendHitDice),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sheetKey(campaignId, characterId) });
      qc.invalidateQueries({ queryKey: resourcesKey(campaignId, characterId) });
      qc.invalidateQueries({ queryKey: conditionsKey(campaignId, characterId) });
    },
  });
}

export function useConditions(campaignId: string, characterId: string) {
  return useQuery({
    queryKey: conditionsKey(campaignId, characterId),
    queryFn: () => characterSheetApi.fetchConditions(campaignId, characterId),
    enabled: Boolean(campaignId && characterId),
  });
}

export function useApplyCondition(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { key: string; level?: number; note?: string }) =>
      characterSheetApi.applyCondition(campaignId, characterId, vars.key, vars.level, vars.note),
    onSuccess: () => qc.invalidateQueries({ queryKey: conditionsKey(campaignId, characterId) }),
  });
}

export function useRemoveCondition(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => characterSheetApi.removeCondition(campaignId, characterId, key),
    onSuccess: () => qc.invalidateQueries({ queryKey: conditionsKey(campaignId, characterId) }),
  });
}

export function useCreateRoll(campaignId: string) {
  return useMutation({
    mutationFn: (input: CreateRollInput) => characterSheetApi.createRoll(campaignId, input),
  });
}
