import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCampaigns, createCampaign } from "./api";

export const campaignsKey = ["campaigns"] as const;

export function useCampaigns() {
  return useQuery({ queryKey: campaignsKey, queryFn: fetchCampaigns });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignsKey }),
  });
}
