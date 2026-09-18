import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateEntityLinkInput } from "@dnd/shared";
import { fetchLinks, fetchCampaignLinks, createLink, deleteLink } from "./api";

export const linksKey = (entityId: string) => ["entities", entityId, "links"] as const;

/**
 * La clave del listado por campaña (Task 22). Cuelga bajo `["campaigns", id, ...]`, como el
 * resto de lo que es de nivel de campaña — no bajo `["entities", ...]`, que es la raíz jerárquica
 * de lo que es de una ficha.
 */
export const campaignLinksKey = (campaignId: string) => ["campaigns", campaignId, "links"] as const;

export function useLinks(entityId: string) {
  return useQuery({
    queryKey: linksKey(entityId),
    queryFn: () => fetchLinks(entityId),
  });
}

/**
 * Todos los enlaces de la campaña en una sola consulta (Task 22). La consume el taller para no
 * pedir uno por ficha; comparte caché con cualquier otra pantalla que la use igual.
 */
export function useCampaignLinks(campaignId: string) {
  return useQuery({
    queryKey: campaignLinksKey(campaignId),
    queryFn: () => fetchCampaignLinks(campaignId),
  });
}

export function useCreateLink(entityId: string, campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEntityLinkInput) => createLink(entityId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: linksKey(entityId) });
      // El listado por campaña también queda desactualizado: un enlace nuevo no aparecería en
      // el tablero hasta refrescar la página.
      qc.invalidateQueries({ queryKey: campaignLinksKey(campaignId) });
    },
  });
}

export function useDeleteLink(entityId: string, campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (link: { id: string; otherEntityId: string }) => deleteLink(link.id),
    onSuccess: (_data, link) => {
      qc.invalidateQueries({ queryKey: linksKey(entityId) });
      // **Y el otro extremo**: el hilo es de dos fichas; sin esto la de enfrente se quedaba con el
      // hilo fantasma hasta recargar (revisión final 2026-09-13, cerrada el 2026-09-17).
      qc.invalidateQueries({ queryKey: linksKey(link.otherEntityId) });
      qc.invalidateQueries({ queryKey: campaignLinksKey(campaignId) });
    },
  });
}
