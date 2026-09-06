import type { Encounter, SetInitiativeInput, SetSideInput, StartEncounterInput } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

// Tarea 2.5.6 — **la capa de combate de la mesa.**
//
// El servidor lleva desde 2.5.2 sabiendo llevar un encuentro y **ninguna pantalla lo consumía**:
// el propio controlador lo dice, «sin pantalla a propósito … esto lo consumirá la mesa de combate
// cuando exista». Esto es esa mesa, y no es una pantalla nueva sino **una capa sobre la que ya
// hay** — que es exactamente el motivo por el que el reseño la había aplazado: «si se construye
// ahora se construye dos veces».
//
// **Lo que el servidor NO manda, y por qué esta capa no lo echa de menos.** Un combatiente trae
// `characterId`, iniciativa y posición, y nada más: ni nombre, ni PG, ni condiciones. Todo eso ya
// viaja por `useCharacters` y por la hoja, filtrado por `canView`, y pedirlo otra vez por aquí
// sería abrir una segunda puerta a la misma información con una segunda regla de visibilidad. El
// elenco de la mesa es el que pone los nombres; esta lista pone el ORDEN.

const base = (campaignId: string, sessionId: string) =>
  `/campaigns/${campaignId}/sessions/${sessionId}/encounters`;

/**
 * El encuentro activo, o `null` si la mesa no está en combate.
 *
 * `null` no es un error: no estar en combate es el estado normal de una sesión. La base garantiza
 * como mucho uno activo por sesión, así que «el activo» tiene una sola respuesta.
 */
export function fetchCurrentEncounter(
  campaignId: string,
  sessionId: string,
): Promise<Encounter | null> {
  return apiFetch<Encounter | null>(`${base(campaignId, sessionId)}/current`);
}

export function startEncounter(
  campaignId: string,
  sessionId: string,
  input: StartEncounterInput,
): Promise<Encounter> {
  return apiFetch<Encounter>(base(campaignId, sessionId), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function setInitiative(
  campaignId: string,
  sessionId: string,
  encounterId: string,
  combatantId: string,
  input: SetInitiativeInput,
): Promise<Encounter> {
  return apiFetch<Encounter>(
    `${base(campaignId, sessionId)}/${encounterId}/combatants/${combatantId}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

/**
 * Tarea 10 (2026-09-05, iniciativa y bando) — el DM corrige el bando con el combate en marcha:
 * un aliado te traiciona en el segundo asalto. Hermana de `setInitiative`, misma ruta con
 * `/side` al final (`EncountersController.setSide`).
 */
export function setSide(
  campaignId: string,
  sessionId: string,
  encounterId: string,
  combatantId: string,
  input: SetSideInput,
): Promise<Encounter> {
  return apiFetch<Encounter>(
    `${base(campaignId, sessionId)}/${encounterId}/combatants/${combatantId}/side`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export function advanceTurn(
  campaignId: string,
  sessionId: string,
  encounterId: string,
): Promise<Encounter> {
  return apiFetch<Encounter>(`${base(campaignId, sessionId)}/${encounterId}/advance-turn`, {
    method: "POST",
  });
}

export function endEncounter(
  campaignId: string,
  sessionId: string,
  encounterId: string,
): Promise<{ id: string; status: string }> {
  return apiFetch<{ id: string; status: string }>(
    `${base(campaignId, sessionId)}/${encounterId}/end`,
    { method: "POST" },
  );
}

/**
 * Tarea 4 (2026-09-05, iniciativa y bando) — el DM empieza sin esperar a quien no ha tirado.
 * El servidor tira por cada petición de iniciativa pendiente y anula el resto de la petición
 * —no la responde en su nombre—, así que el registro no dice nunca que un jugador tiró algo
 * que no tiró.
 */
export function forceStartEncounter(
  campaignId: string,
  sessionId: string,
  encounterId: string,
): Promise<Encounter> {
  return apiFetch<Encounter>(`${base(campaignId, sessionId)}/${encounterId}/force-start`, {
    method: "POST",
  });
}

/**
 * Tarea 4 — cancelar un combate que nunca empezó a jugarse. Solo `PREPARING`; el servidor
 * responde **204** (`EncountersController.cancel`) y borra el `Encounter` y sus `RollRequest`,
 * **nunca sucesos** (`encounters.service.ts`, método `cancel`) — la tirada de iniciativa que el
 * DM ya lanzó al empezar el encuentro, y la de quien haya respondido antes de que se cancele,
 * quedan escritas en el registro para siempre. Por eso el gesto lleva su propio diálogo
 * explicando la consecuencia REAL (`TiraDeIniciativa.tsx`), no un «¿seguro?» genérico ni una
 * promesa de borrado total que el servidor no cumple.
 */
export function cancelEncounter(
  campaignId: string,
  sessionId: string,
  encounterId: string,
): Promise<void> {
  return apiFetch<void>(`${base(campaignId, sessionId)}/${encounterId}`, { method: "DELETE" });
}
