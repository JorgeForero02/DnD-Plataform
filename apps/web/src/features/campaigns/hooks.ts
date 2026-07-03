import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCampaigns, fetchCampaign, createCampaign } from "./api";

export const campaignsKey = ["campaigns"] as const;

export function useCampaigns() {
  return useQuery({ queryKey: campaignsKey, queryFn: fetchCampaigns });
}

export const campaignKey = (id: string) => ["campaigns", id] as const;

export function useCampaign(id: string) {
  return useQuery({ queryKey: campaignKey(id), queryFn: () => fetchCampaign(id) });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignsKey }),
  });
}
