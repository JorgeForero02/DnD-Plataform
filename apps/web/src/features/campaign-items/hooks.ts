import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateCampaignItemInput, UpdateCampaignItemInput } from "@dnd/shared";
// Self-import so the query functions go through the module namespace, spyable in tests —
// mismo patrón que features/entities/hooks.ts y features/campaigns/members.ts.
import * as campaignItemsApi from "./api";

export const campaignItemsKey = (campaignId: string) => ["campaigns", campaignId, "items"] as const;

export const campaignItemKey = (campaignId: string, itemId: string) =>
  [...campaignItemsKey(campaignId), itemId] as const;

/**
 * El catálogo del SRD. **Una sola entrada de caché para toda la aplicación** —el SRD es el mismo
 * para cualquier mesa— y cada pantalla elige su vista con `select`, en vez de pedir lo mismo dos
 * veces con la misma clave y dos formas distintas, que es como una pantalla acaba leyendo los
 * datos de la otra y cayéndose.
 */
export const catalogItemsKey = ["catalog", "items"] as const;

export function useSrdResolvedItems(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: catalogItemsKey,
    queryFn: () => campaignItemsApi.fetchSrdItems(),
    enabled: options?.enabled,
    // El SRD no cambia mientras la pestaña está abierta: no tiene sentido revalidarlo.
    staleTime: Infinity,
  });
}

/** La misma consulta, vista como filas planas: es lo que pinta el catálogo de la campaña. */
export function useSrdItems(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: catalogItemsKey,
    queryFn: () => campaignItemsApi.fetchSrdItems(),
    enabled: options?.enabled,
    staleTime: Infinity,
    select: (items) => items.map(campaignItemsApi.aplanarItemSrd),
  });
}

export function useCampaignItems(campaignId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: campaignItemsKey(campaignId),
    queryFn: () => campaignItemsApi.fetchCampaignItems(campaignId),
    enabled: options?.enabled,
  });
}

export function useCampaignItem(
  campaignId: string,
  itemId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: campaignItemKey(campaignId, itemId ?? ""),
    queryFn: () => campaignItemsApi.fetchCampaignItem(campaignId, itemId as string),
    enabled: (options?.enabled ?? true) && !!itemId,
  });
}

export function useCreateCampaignItem(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCampaignItemInput) =>
      campaignItemsApi.createCampaignItem(campaignId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignItemsKey(campaignId) });
    },
  });
}

export function useUpdateCampaignItem(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { itemId: string; input: UpdateCampaignItemInput }) =>
      campaignItemsApi.updateCampaignItem(campaignId, vars.itemId, vars.input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: campaignItemsKey(campaignId) });
      qc.invalidateQueries({ queryKey: campaignItemKey(campaignId, vars.itemId) });
    },
  });
}

export function useDeleteCampaignItem(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => campaignItemsApi.deleteCampaignItem(campaignId, itemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: campaignItemsKey(campaignId) });
    },
  });
}
