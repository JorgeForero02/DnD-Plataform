import { useQuery } from "@tanstack/react-query";
import type { EntityType } from "@dnd/shared";
import { fetchEntities } from "./api";

export const entitiesKey = (campaignId: string, type: EntityType) =>
  ["campaigns", campaignId, "entities", type] as const;

export function useEntities(campaignId: string, type: EntityType) {
  return useQuery({
    queryKey: entitiesKey(campaignId, type),
    queryFn: () => fetchEntities(campaignId, type),
  });
}
