import type {
  AwardXpInput,
  CreateCharacterInput,
  UpdateCharacterInput,
  Visibility,
} from "@dnd/shared";
import { apiFetch } from "../../lib/api";

export interface Character {
  id: string;
  campaignId: string;
  ownerId: string;
  name: string;
  raceKey: string | null;
  subraceKey: string | null;
  classKey: string | null;
  level: number;
  bio: string | null;
  visibility: Visibility;
  /**
   * **El color de su voz en el hilo y de su retrato en el elenco** (plan 05, decisión D3).
   *
   * Una **clave** de `CHARACTER_COLORS`, nunca un hexadecimal, y `null` cuando su jugador no ha
   * elegido: entonces el color lo deriva `vozDePersonaje` del `id`. Se lee y se escribe, pero
   * **nunca se guarda el valor derivado** — un defecto escrito dejaría de ser un defecto.
   */
  color: string | null;
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
  /**
   * **A qué statblock refiere, si este `Character` es un PNJ** (D-2D-2). `GET .../characters`
   * filtra `statblockRef: null` en el servidor —«quién se sienta a la mesa»—, así que en la
   * práctica esta lista nunca trae uno distinto de `null`; el campo es opcional en el tipo para
   * no obligar a los mocks de otras pantallas a conocerlo, y para que «Dar XP» (Puerta de
   * efectos §5 bis) pueda marcar como no seleccionable el elenco que sí lo traiga.
   */
  statblockRef?: string | null;
  /**
   * **La experiencia acumulada** (Puerta de efectos §5 bis, D-CF-68). Opcional por la misma
   * razón que `statblockRef`: los mocks que no la necesitan no tienen que declararla.
   */
  xp?: number;
  /**
   * **La ficha del mundo de la que este cuerpo es** (PNJ del mundo y la mesa, spec §3.1). `null`
   * si no tiene o si quien mira no puede ver la ficha — el servidor la redacta (spec §4).
   */
  entityId?: string | null;
}

export function fetchCharacters(campaignId: string): Promise<Character[]> {
  return apiFetch<Character[]>(`/campaigns/${campaignId}/characters`);
}

// --- XP (Puerta de efectos §5 bis, D-CF-68/D-CF-69) ----------------------------------------
//
// `POST /campaigns/:campaignId/xp` (`XpController`) es la única puerta HTTP para «Dar XP»: solo
// el DM, y el servidor responde 400 si algún personaje es un PNJ de statblock — esta pantalla no
// reimplementa esa regla, solo evita ofrecerla (checkbox `disabled` en `DarXp.tsx`).
export function awardXp(
  campaignId: string,
  input: AwardXpInput,
): Promise<{ awarded: { characterId: string; xp: number }[] }> {
  return apiFetch(`/campaigns/${campaignId}/xp`, {
    method: "POST",
    body: JSON.stringify(input),
  });
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
  });
}

export function unarchiveCharacter(campaignId: string, characterId: string): Promise<Character> {
  return apiFetch<Character>(`/campaigns/${campaignId}/characters/${characterId}/unarchive`, {
    method: "POST",
  });
}
