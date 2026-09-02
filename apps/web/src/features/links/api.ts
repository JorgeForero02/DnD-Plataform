import type { CreateEntityLinkInput, EntityType } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

export interface EntityLink {
  id: string;
  label?: string | null;
  // Reseño 2026-09-02: era `type: string`, así que la interfaz lo pintaba en crudo —un enlace
  // decía "Ciudad Ceniza (LOCATION)" en una interfaz en español. Tipado como EntityType para
  // poder traducirlo con la misma tabla que el resto de la aplicación.
  to: { id: string; name: string; type: EntityType };
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
  // Task 1.16: found while testing this task's own delete buttons and fixed here too, since
  // it's the same class of bug — apiFetch always sends a JSON Content-Type, and Fastify
  // rejects that paired with a truly empty body ("Body cannot be empty…", the exact error
  // 1.14 hit and fixed for invites' POST calls). A real click on "Quitar" against the real
  // API would have 500'd; no browser test had exercised it before this task.
  return apiFetch<{ deleted: boolean }>(`/links/${linkId}`, {
    method: "DELETE",
    body: JSON.stringify({}),
  });
}
