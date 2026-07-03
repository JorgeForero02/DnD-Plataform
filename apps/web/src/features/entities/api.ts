import type { CreateEntityInput, EntityType, Visibility } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

export interface Entity {
  id: string;
  campaignId: string;
  type: EntityType;
  name: string;
  tags: string[];
  visibility: Visibility;
  createdById: string;
  createdAt: string;
}

export function fetchEntities(campaignId: string, type: EntityType): Promise<Entity[]> {
  return apiFetch<Entity[]>(`/campaigns/${campaignId}/entities?type=${type}`);
}

export function createEntity(campaignId: string, input: CreateEntityInput): Promise<Entity> {
  return apiFetch<Entity>(`/campaigns/${campaignId}/entities`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateEntity(
  campaignId: string,
  entityId: string,
  input: Partial<CreateEntityInput>,
): Promise<Entity> {
  return apiFetch<Entity>(`/campaigns/${campaignId}/entities/${entityId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
