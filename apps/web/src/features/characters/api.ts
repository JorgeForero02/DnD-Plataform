import type { CreateCharacterInput, UpdateCharacterInput, Visibility } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

export interface Character {
  id: string;
  campaignId: string;
  ownerId: string;
  name: string;
  race: string | null;
  class: string | null;
  level: number;
  bio: string | null;
  visibility: Visibility;
  createdAt: string;
}

export function fetchCharacters(campaignId: string): Promise<Character[]> {
  return apiFetch<Character[]>(`/campaigns/${campaignId}/characters`);
}

export function createCharacter(
  campaignId: string,
  input: CreateCharacterInput,
): Promise<Character> {
  return apiFetch<Character>(`/campaigns/${campaignId}/characters`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCharacter(
  campaignId: string,
  characterId: string,
  input: UpdateCharacterInput,
): Promise<Character> {
  return apiFetch<Character>(`/campaigns/${campaignId}/characters/${characterId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
