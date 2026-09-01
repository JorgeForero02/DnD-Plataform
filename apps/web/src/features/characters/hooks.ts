import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCharacters, createCharacter, updateCharacter, deleteCharacter } from "./api";

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
