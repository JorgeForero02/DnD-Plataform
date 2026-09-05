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
  /**
   * **Cuándo se archivó, o `null` si está en la mesa.**
   *
   * El servidor lo manda desde 2.5.8 —`get` devuelve la fila entera— y hasta el 2026-09-05 este
   * tipo no lo declaraba, así que la hoja de un personaje archivado se pintaba **idéntica a la de
   * uno vivo, con su botón de borrar puesto**. Un enlace viejo más un borrado era exactamente la
   * pérdida que archivar existe para impedir. Lo encontró la revisión del plan 06.
   */
  archivedAt: string | null;
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

// --- Archivar (plan 06, ficha M9) -----------------------------------------------------------
//
// El servidor sabe archivar desde 2.5.8 (`characters.controller.ts`: `POST :id/archive`,
// `POST :id/unarchive`, `GET archived`) y **nada de la web llamaba a ninguna de las tres**. Las
// tres se añaden juntas a propósito: un archivo sin listado por el que salir es un borrado con
// otro nombre.
//
// `GET archived` es **una ruta aparte**, no un filtro de cliente sobre la lista normal: esa lista
// ya excluye a los archivados en el servidor (`characters.service.ts:57`), así que el cliente no
// los recibe y no tendría nada que filtrar.

/** Los personajes archivados de la campaña, ya filtrados por `canView` en el servidor. */
export function fetchArchivedCharacters(campaignId: string): Promise<Character[]> {
  return apiFetch<Character[]>(`/campaigns/${campaignId}/characters/archived`);
}

export function archiveCharacter(campaignId: string, characterId: string): Promise<Character> {
  return apiFetch<Character>(`/campaigns/${campaignId}/characters/${characterId}/archive`, {
    method: "POST",
    // Mismo motivo que en `deleteCharacter`: `apiFetch` manda siempre un Content-Type de JSON y
    // Fastify rechaza esa cabecera con el cuerpo realmente vacío.
    body: JSON.stringify({}),
  });
}

export function unarchiveCharacter(campaignId: string, characterId: string): Promise<Character> {
  return apiFetch<Character>(`/campaigns/${campaignId}/characters/${characterId}/unarchive`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
