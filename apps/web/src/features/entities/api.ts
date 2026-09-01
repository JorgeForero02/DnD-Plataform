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

export interface EntityGrant {
  id: string;
  entityId: string;
  userId: string;
}

export interface EntityDetail extends Entity {
  grants: EntityGrant[];
}

export function fetchEntities(campaignId: string, type: EntityType): Promise<Entity[]> {
  return apiFetch<Entity[]>(`/campaigns/${campaignId}/entities?type=${type}`);
}

// No `type` query param: GET /campaigns/:id/entities treats it as optional
// (entities.controller.ts) and returns every type in the campaign. Used by the link
// target picker, which — unlike the per-tab lists — needs to offer any entity type.
export function fetchAllEntities(campaignId: string): Promise<Entity[]> {
  return apiFetch<Entity[]>(`/campaigns/${campaignId}/entities`);
}

export function fetchEntity(campaignId: string, entityId: string): Promise<EntityDetail> {
  return apiFetch<EntityDetail>(`/campaigns/${campaignId}/entities/${entityId}`);
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

export function deleteEntity(campaignId: string, entityId: string): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/campaigns/${campaignId}/entities/${entityId}`, {
    method: "DELETE",
    // apiFetch (lib/api.ts) always sends Content-Type: application/json; Fastify 500s on
    // that combined with a genuinely empty body ("Body cannot be empty…") — the exact bug
    // 1.14 hit and fixed for invites' POST calls. A DELETE has nothing to say, but it still
    // needs a body to match its own header.
    body: JSON.stringify({}),
  });
}
