import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EntityType } from "@dnd/shared";
import {
  fetchEntities,
  fetchAllEntities,
  fetchEntity,
  createEntity,
  updateEntity,
  deleteEntity,
} from "./api";

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

// Reseño 2026-09-02 — the reading page (EntityDetailPage) knows an entity's id from the URL
// but not its type, so it cannot build entityKey(campaignId, type, id). Its own branch:
// ["campaigns", id, "entities", "detalle", entityId]. Kept under the same "entities" segment
// so the broad predicate invalidation in useDeleteEntity below still reaches it, and refreshed
// explicitly by useUpdateEntity — otherwise saving an edit would leave the page you are
// looking at showing the old text for up to staleTime.
export const entityDetailKey = (campaignId: string, entityId: string) =>
  ["campaigns", campaignId, "entities", "detalle", entityId] as const;

export function useEntityDetail(campaignId: string, entityId: string) {
  return useQuery({
    queryKey: entityDetailKey(campaignId, entityId),
    queryFn: () => fetchEntity(campaignId, entityId),
    enabled: Boolean(campaignId && entityId),
  });
}

export function useUpdateEntity(campaignId: string, type: EntityType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { entityId: string; input: Parameters<typeof updateEntity>[2] }) =>
      updateEntity(campaignId, vars.entityId, vars.input),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: entitiesKey(campaignId, type) });
      qc.invalidateQueries({ queryKey: allEntitiesKey(campaignId) });
      // The reading page's own branch — without this, saving from the detail page leaves that
      // very page showing what you just changed away from.
      qc.invalidateQueries({ queryKey: entityDetailKey(campaignId, vars.entityId) });
    },
  });
}

export function useDeleteEntity(campaignId: string, type: EntityType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entityId: string) => deleteEntity(campaignId, entityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: entitiesKey(campaignId, type) });
      // Same trap as create/update (1.12b): allEntitiesKey is a sibling branch, not a
      // prefix of entitiesKey(campaignId, type) — without this, the link target picker
      // (useAllEntities) keeps offering the deleted entity for up to staleTime
      // (queryClient.ts, 30s) after it's gone.
      qc.invalidateQueries({ queryKey: allEntitiesKey(campaignId) });
      // A new bite of the same trap, found while testing this task: the schema cascades a
      // deleted entity's EntityLink rows in BOTH directions (schema.prisma — `to` also has
      // onDelete: Cascade), so some *other* entity's outgoing link list can point at the one
      // just deleted. Its query key is linksKey(otherEntityId) = ["entities", otherEntityId,
      // "links"] (features/links/hooks.ts) — a branch this hook has no way to name, because
      // it doesn't know which other entities linked to this one. Importing linksKey/
      // commentsKey here would only fix the two kinds of query that exist today; a predicate
      // over the shared "entities" root invalidates every entity-scoped query (both links and
      // comments, for every entity, not just this campaign's) instead — broader than strictly
      // necessary, but the alternative is exactly the stale-picker bug this comment is next
      // to, just for a panel instead of a picker.
      qc.invalidateQueries({ predicate: (query) => query.queryKey[0] === "entities" });
    },
  });
}
