import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCharacters,
  fetchArchivedCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  archiveCharacter,
  unarchiveCharacter,
} from "./api";

export const charactersKey = (campaignId: string) =>
  ["campaigns", campaignId, "characters"] as const;

export function useCharacters(campaignId: string) {
  return useQuery({
    queryKey: charactersKey(campaignId),
    queryFn: () => fetchCharacters(campaignId),
  });
}

export function useCreateCharacter(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createCharacter>[1]) =>
      createCharacter(campaignId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: charactersKey(campaignId) }),
  });
}

export function useUpdateCharacter(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { characterId: string; input: Parameters<typeof updateCharacter>[2] }) =>
      updateCharacter(campaignId, vars.characterId, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: charactersKey(campaignId) }),
  });
}

export function useDeleteCharacter(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (characterId: string) => deleteCharacter(campaignId, characterId),
    onSuccess: () => qc.invalidateQueries({ queryKey: charactersKey(campaignId) }),
  });
}

// --- Archivar (plan 06, ficha M9) -----------------------------------------------------------

/**
 * La clave del archivo **cuelga de la de personajes a propósito**: `["campaigns", id,
 * "characters", "archived"]`. Invalidar `charactersKey` invalida también esta, que es justo lo
 * que hace falta — archivar y devolver mueven una fila **entre las dos listas**, así que las dos
 * quedan viejas a la vez y refrescar solo una enseñaría al personaje en ninguna o en las dos.
 */
export const archivedCharactersKey = (campaignId: string) =>
  [...charactersKey(campaignId), "archived"] as const;

export function useArchivedCharacters(campaignId: string) {
  return useQuery({
    queryKey: archivedCharactersKey(campaignId),
    queryFn: () => fetchArchivedCharacters(campaignId),
  });
}

/**
 * Además de las dos listas, se invalida el registro: archivar **escribe su suceso**
 * (`characters.service.ts:157`, `CHARACTER_ARCHIVED`), y la línea de tiempo que lo pinta cuelga
 * de `["campaigns", id, "events", …]` — otra raíz, que invalidar la de personajes no toca.
 */
function invalidarArchivo(qc: ReturnType<typeof useQueryClient>, campaignId: string) {
  void qc.invalidateQueries({ queryKey: charactersKey(campaignId) });
  void qc.invalidateQueries({ queryKey: ["campaigns", campaignId, "events"] });
}

export function useArchiveCharacter(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (characterId: string) => archiveCharacter(campaignId, characterId),
    onSuccess: () => invalidarArchivo(qc, campaignId),
  });
}

export function useUnarchiveCharacter(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (characterId: string) => unarchiveCharacter(campaignId, characterId),
    onSuccess: () => invalidarArchivo(qc, campaignId),
  });
}
