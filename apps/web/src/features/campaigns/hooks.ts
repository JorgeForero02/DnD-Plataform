import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdateCampaignInput } from "@dnd/shared";
import {
  fetchCampaigns,
  fetchCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from "./api";
import { membersKey, removeMember } from "./members";
import { useAuthStore } from "../../store/auth.store";

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

export function useUpdateCampaign(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCampaignInput) => updateCampaign(id, input),
    onSuccess: () => {
      // campaignsKey (["campaigns"]) is a PREFIX of campaignKey(id) (["campaigns", id]), NOT
      // a sibling like entitiesKey/allEntitiesKey in entities/hooks.ts. TanStack Query's
      // default partial-match invalidation means this one call already covers campaignKey(id)
      // — invalidating campaignKey(id) too would be redundant, so it isn't done here. It also
      // covers the campaign list on "/" (which needs to learn of the rename) and, being a
      // prefix, everything else under ["campaigns", …] for every campaign the user has —
      // members, entities, sessions, characters — which is broader than this mutation
      // strictly needs. Splitting that out into a narrower, single-campaign invalidation
      // would take more code for a rename that already isn't expensive to over-invalidate.
      qc.invalidateQueries({ queryKey: campaignsKey });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: campaignsKey }),
  });
}

// Covers both kicking (userId of someone else) and leaving (userId === your own) — same
// single endpoint, see members.ts. onSuccess always invalidates the member list; when the
// person removed is the caller themselves, campaignsKey also goes stale, because the
// campaign just disappeared from "Mis campañas".
export function useRemoveMember(campaignId: string) {
  const qc = useQueryClient();
  const myUserId = useAuthStore((s) => s.user?.id);
  return useMutation({
    mutationFn: (userId: string) => removeMember(campaignId, userId),
    onSuccess: (_result, userId) => {
      qc.invalidateQueries({ queryKey: membersKey(campaignId) });
      if (userId === myUserId) {
        qc.invalidateQueries({ queryKey: campaignsKey });
      }
    },
  });
}
