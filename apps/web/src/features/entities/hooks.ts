import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EntityType } from "@dnd/shared";
import { fetchEntities, createEntity, updateEntity } from "./api";

export const entitiesKey = (campaignId: string, type: EntityType) =>
  ["campaigns", campaignId, "entities", type] as const;

export function useEntities(campaignId: string, type: EntityType) {
  return useQuery({
    queryKey: entitiesKey(campaignId, type),
    queryFn: () => fetchEntities(campaignId, type),
  });
}

export function useCreateEntity(campaignId: string, type: EntityType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createEntity>[1]) => createEntity(campaignId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: entitiesKey(campaignId, type) }),
  });
}

export function useUpdateEntity(campaignId: string, type: EntityType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { entityId: string; input: Parameters<typeof updateEntity>[2] }) =>
      updateEntity(campaignId, vars.entityId, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: entitiesKey(campaignId, type) }),
  });
}
