import type { CreateEntityInput, EntityBody, EntityType, Visibility } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

export interface Entity {
  id: string;
  campaignId: string;
  type: EntityType;
  name: string;
  body?: EntityBody | null;
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

/**
 * Las fichas de un tipo. **`q` busca también dentro del cuerpo, y lo hace el servidor** (ficha U3):
 * el filtro del navegador solo miraba el nombre, así que una ficha que dice «la puerta de sal» en
 * su tercer párrafo era inencontrable. Y va en el servidor porque el resultado tiene que pasar por
 * `canView` antes que por el texto — si no, buscar sería un oráculo sobre fichas que no puedes ver.
 */
export function fetchEntities(campaignId: string, type: EntityType, q?: string): Promise<Entity[]> {
  const params = new URLSearchParams({ type });
  if (q && q.trim() !== "") params.set("q", q.trim());
  return apiFetch<Entity[]>(`/campaigns/${campaignId}/entities?${params.toString()}`);
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

/**
 * **Ejecutar una ficha** (plan 09, I19): el DM pulsa y las reglas que la esperaban se disparan.
 * Sin cuerpo — lo que se ejecuta lo dice la URL—, pero se manda `{}` por la trampa de siempre:
 * `apiFetch` pone `Content-Type: application/json` y Fastify responde 500 a esa cabecera con el
 * cuerpo realmente vacío.
 */
export function executeEntity(campaignId: string, entityId: string) {
  return apiFetch(`/campaigns/${campaignId}/entities/${entityId}/execute`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
