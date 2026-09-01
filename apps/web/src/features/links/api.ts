import type { CreateEntityLinkInput } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

export interface EntityLink {
  id: string;
  label?: string | null;
  to: { id: string; name: string; type: string };
}

export interface CreatedEntityLink {
  id: string;
  fromId: string;
  toId: string;
  label?: string | null;
}

export function fetchLinks(entityId: string): Promise<EntityLink[]> {
  return apiFetch<EntityLink[]>(`/entities/${entityId}/links`);
}

export function createLink(
  entityId: string,
  input: CreateEntityLinkInput,
): Promise<CreatedEntityLink> {
  return apiFetch<CreatedEntityLink>(`/entities/${entityId}/links`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteLink(linkId: string): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/links/${linkId}`, { method: "DELETE" });
}
