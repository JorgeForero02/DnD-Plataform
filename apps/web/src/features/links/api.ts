import type { CampaignLinkRow, CreateEntityLinkInput, EntityType } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

/**
 * De qué lado está el enlace **visto desde la ficha abierta**. `OUTGOING` es el que esa ficha
 * escribió; `INCOMING` es el retroenlace — el mismo registro leído desde el otro extremo, que
 * antes del bloque L no se devolvía y hacía que abrir la Torre Gris no dijera que Corvin vive
 * en ella.
 */
export type LinkDirection = "OUTGOING" | "INCOMING";

export interface EntityLink {
  id: string;
  label?: string | null;
  direction: LinkDirection;
  /**
   * Lo decide el servidor (`links.service.ts`), que es donde se comprueba de verdad: DM o
   * creador de la ficha **de origen** — y en un retroenlace el origen es la de enfrente, no la
   * que se está mirando. La pantalla solo deja de ofrecer lo que el `DELETE` rechazaría.
   */
  canRemove: boolean;
  // Reseño 2026-09-02: era `type: string`, así que la interfaz lo pintaba en crudo —un enlace
  // decía "Ciudad Ceniza (LOCATION)" en una interfaz en español. Tipado como EntityType para
  // poder traducirlo con la misma tabla que el resto de la aplicación.
  /** La ficha del **otro extremo**: el destino si sale, el origen si entra. */
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

/**
 * Todos los enlaces de la campaña, en **una sola llamada** (Task 22). El taller pedía uno por
 * ficha —hasta 18 al abrir, y `refetchOnWindowFocus` los repetía— porque hasta hoy la única ruta
 * era `/entities/:id/links`. El servidor ya filtra por `canView` en los dos extremos; aquí no se
 * filtra nada más.
 */
export function fetchCampaignLinks(campaignId: string): Promise<CampaignLinkRow[]> {
  return apiFetch<CampaignLinkRow[]>(`/campaigns/${campaignId}/links`);
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
  return apiFetch<{ deleted: boolean }>(`/links/${linkId}`, {
    method: "DELETE",
  });
}
