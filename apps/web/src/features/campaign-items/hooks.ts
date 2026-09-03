import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateCampaignItemInput, UpdateCampaignItemInput } from "@dnd/shared";
// Self-import so the query functions go through the module namespace, spyable in tests —
// mismo patrón que features/entities/hooks.ts y features/campaigns/members.ts.
import * as campaignItemsApi from "./api";

export const campaignItemsKey = (campaignId: string) => ["campaigns", campaignId, "items"] as const;

export const campaignItemKey = (campaignId: string, itemId: string) =>
  [...campaignItemsKey(campaignId), itemId] as const;

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
