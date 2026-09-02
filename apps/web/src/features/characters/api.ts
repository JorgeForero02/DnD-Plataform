import type { CreateCharacterInput, UpdateCharacterInput, Visibility } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

export interface Character {
  id: string;
  campaignId: string;
  ownerId: string;
  name: string;
  // Texto libre **heredado**. Ya no lo escribe nadie: la hoja escribe las claves de abajo.
  // Se sigue leyendo para no perder de vista a los personajes escritos a mano antes del
  // catálogo — ver `descriptor.ts`, que decide cuál de los dos gana.
  race: string | null;
  class: string | null;
  raceKey: string | null;
  subraceKey: string | null;
  classKey: string | null;
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

export function deleteCharacter(
  campaignId: string,
  characterId: string,
): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/campaigns/${campaignId}/characters/${characterId}`, {
    method: "DELETE",
    // See the same comment in features/entities/api.ts: apiFetch always sends a JSON
    // Content-Type, and Fastify rejects that paired with a truly empty body.
    body: JSON.stringify({}),
  });
}
