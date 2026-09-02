import type { GameEventPayload, Visibility } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

// El cliente del log de partida (2A.5). **Hasta hoy no lo consumía ninguna pantalla**: existía
// por HTTP, se probaba por e2e, y solo se podía leer con un cliente HTTP. Era la ficha D9 de
// `docs/06-pendientes.md`.

export interface GameEventRow {
  id: string;
  campaignId: string;
  sessionId: string | null;
  actorUserId: string;
  type: GameEventPayload["type"];
  subjectType: "character" | "campaign" | "session";
  subjectId: string;
  payload: GameEventPayload;
  visibility: Visibility;
  createdAt: string;
}

export interface GameEventPage {
  events: GameEventRow[];
  nextCursor: string | null;
}

/**
 * `as` es **ver el log por los ojos de otro jugador**: solo el DM, y solo sobre un miembro.
 *
 * No relaja nada — el servidor sigue filtrando por `canView`, con otro espectador. Un DM no ve
 * *más* con esto: ve *menos*, que es exactamente el punto. Todos los VTT acabaron construyendo
 * esta función y ninguno la tuvo el primer día; Roll20 la lanzó en 2026 porque sus DMs se
 * estaban creando segundas cuentas para comprobar qué se veía.
 */
export function fetchGameEvents(
  campaignId: string,
  query: { sessionId?: string; as?: string; limit?: number } = {},
): Promise<GameEventPage> {
  const p = new URLSearchParams();
  if (query.sessionId) p.set("sessionId", query.sessionId);
  if (query.as) p.set("as", query.as);
  p.set("limit", String(query.limit ?? 50));
  return apiFetch<GameEventPage>(`/campaigns/${campaignId}/events?${p.toString()}`);
}
