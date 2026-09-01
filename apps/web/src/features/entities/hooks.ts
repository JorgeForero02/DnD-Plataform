import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EntityType } from "@dnd/shared";
import { fetchEntities, fetchAllEntities, fetchEntity, createEntity, updateEntity } from "./api";

export const entitiesKey = (campaignId: string, type: EntityType) =>
  ["campaigns", campaignId, "entities", type] as const;

// Separate branch from entitiesKey(campaignId, type): this list isn't scoped to one type,
// so it doesn't belong under any single per-type key.
export const allEntitiesKey = (campaignId: string) =>
  ["campaigns", campaignId, "entities", "all"] as const;

// Hangs off the same branch as entitiesKey: invalidating entitiesKey(campaignId, type)
// (done on create/update) also invalidates every entity detail of that type.
export const entityKey = (campaignId: string, type: EntityType, entityId: string) =>
  [...entitiesKey(campaignId, type), entityId] as const;

export function useEntities(campaignId: string, type: EntityType) {
  return useQuery({
    queryKey: entitiesKey(campaignId, type),
    queryFn: () => fetchEntities(campaignId, type),
  });
}

// Every entity of the campaign, any type. Used by the link target picker.
export function useAllEntities(campaignId: string) {
  return useQuery({
    queryKey: allEntitiesKey(campaignId),
    queryFn: () => fetchAllEntities(campaignId),
  });
}

// Only asked for in edit mode (`enabled`): the create form has nothing to preload.
export function useEntity(
  campaignId: string,
  type: EntityType,
  entityId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: entityKey(campaignId, type, entityId ?? ""),
    queryFn: () => fetchEntity(campaignId, entityId as string),
    enabled: enabled && !!entityId,
  });
}

export function useCreateEntity(campaignId: string, type: EntityType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createEntity>[1]) => createEntity(campaignId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: entitiesKey(campaignId, type) });
      // allEntitiesKey is a separate branch (see comment above), not a prefix of
      // entitiesKey(campaignId, type): invalidating the typed key alone leaves the link
      // target picker (useAllEntities) stale for up to staleTime (queryClient.ts:4).
      qc.invalidateQueries({ queryKey: allEntitiesKey(campaignId) });
    },
  });
}

export function useUpdateEntity(campaignId: string, type: EntityType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { entityId: string; input: Parameters<typeof updateEntity>[2] }) =>
      updateEntity(campaignId, vars.entityId, vars.input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: entitiesKey(campaignId, type) });
      qc.invalidateQueries({ queryKey: allEntitiesKey(campaignId) });
    },
  });
}
