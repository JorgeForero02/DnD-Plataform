import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateEntityLinkInput } from "@dnd/shared";
import { fetchLinks, createLink, deleteLink } from "./api";

export const linksKey = (entityId: string) => ["entities", entityId, "links"] as const;

export function useLinks(entityId: string) {
  return useQuery({
    queryKey: linksKey(entityId),
    queryFn: () => fetchLinks(entityId),
  });
}

export function useCreateLink(entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEntityLinkInput) => createLink(entityId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: linksKey(entityId) }),
  });
}

export function useDeleteLink(entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => deleteLink(linkId),
    onSuccess: () => qc.invalidateQueries({ queryKey: linksKey(entityId) }),
  });
}
