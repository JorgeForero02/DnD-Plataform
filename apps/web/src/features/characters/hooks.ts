import { useQuery } from "@tanstack/react-query";
import { fetchCharacters } from "./api";

export const charactersKey = (campaignId: string) =>
  ["campaigns", campaignId, "characters"] as const;

export function useCharacters(campaignId: string) {
  return useQuery({
    queryKey: charactersKey(campaignId),
    queryFn: () => fetchCharacters(campaignId),
  });
}
