import type { ChangeSetMemberInput, CreateSetInput, RaiseSignalInput } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

// Tarea 2A.15, conectada el 2026-09-04 — **marcas, conjuntos y señales del mundo**.
//
// El servidor las tiene desde la fase 2A: cinco rutas en `apps/api/src/world-state/
// world-state.controller.ts`, con su servicio, sus pruebas y su despliegue. La auditoría de la
// mesa (§8.1) contó las llamadas desde la web: **cero**. La consecuencia en una partida es
// exacta — *el DM no puede poner la primera marca de una cadena de reglas*. Una marca solo
// existía si otra regla la producía, y una regla que espera una marca que nadie puede poner no
// se dispara nunca.
//
// `apiFetch` es el único que habla HTTP (docs/04-convenciones.md); este fichero es la única
// puerta de esta feature hacia `apps/api/src/world-state/`. **No se toca la API.**
//
// **Quién puede qué lo impone el servidor**: escribir es `requireDM`, leer es `requireMember`.
// Que esta pantalla esconda los botones a un jugador es cortesía, no control de acceso.

/** Una marca con nombre: «el puente está caído». Un booleano que la campaña recuerda. */
export interface FlagRow {
  id: string;
  campaignId: string;
  key: string;
  value: boolean;
  setById: string;
  updatedAt: string;
}

export interface SetMemberRow {
  id: string;
  setId: string;
  /** `user`, `character` o `entity` — nunca llega crudo a pantalla (`vocabulario.ts`). */
  memberType: ChangeSetMemberInput["memberType"];
  memberId: string;
  addedById: string;
  createdAt: string;
}

/** Un conjunto con nombre: «los que saben lo del posadero», con sus miembros. */
export interface SetRow {
  id: string;
  campaignId: string;
  key: string;
  label: string;
  members: SetMemberRow[];
}

export function fetchFlags(campaignId: string): Promise<FlagRow[]> {
  return apiFetch<FlagRow[]>(`/campaigns/${campaignId}/flags`);
}

/**
 * Poner o quitar una marca. **Es un `PUT` sobre la clave**, no un `POST` de creación: la marca
 * es el recurso y su clave la identifica, así que ponerla dos veces deja el mismo mundo. El
 * servidor hace `upsert` y escribe un `FLAG_SET` visible para los jugadores.
 */
export function setFlag(campaignId: string, key: string, value: boolean): Promise<FlagRow> {
  return apiFetch<FlagRow>(`/campaigns/${campaignId}/flags/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  });
}

export function fetchSets(campaignId: string): Promise<SetRow[]> {
  return apiFetch<SetRow[]>(`/campaigns/${campaignId}/sets`);
}

export function createSet(campaignId: string, input: CreateSetInput): Promise<SetRow> {
  return apiFetch<SetRow>(`/campaigns/${campaignId}/sets`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function addSetMember(
  campaignId: string,
  key: string,
  input: ChangeSetMemberInput,
): Promise<{ added: boolean }> {
  return apiFetch(`/campaigns/${campaignId}/sets/${encodeURIComponent(key)}/members`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function removeSetMember(
  campaignId: string,
  key: string,
  input: ChangeSetMemberInput,
): Promise<{ removed: boolean }> {
  return apiFetch(
    `/campaigns/${campaignId}/sets/${encodeURIComponent(key)}/members/${input.memberType}/${encodeURIComponent(input.memberId)}`,
    {
      method: "DELETE",
      // `apiFetch` manda siempre `Content-Type: application/json` y Fastify rechaza esa
      // cabecera con un cuerpo de verdad vacío. Hay ficha para quitarlo; hasta entonces, hace
      // falta (auditoría §7, trampa 7).
      body: JSON.stringify({}),
    },
  );
}

/**
 * Una señal: **el DM dispara reglas sin cambiar nada del mundo**.
 *
 * El suceso que escribe es `DM_ONLY` a propósito (`world-state.service.ts`): no es un hecho del
 * mundo, es una palanca de mesa. Por eso no hay lista de señales que consultar — no se guardan,
 * se levantan.
 */
export function raiseSignal(
  campaignId: string,
  input: RaiseSignalInput,
): Promise<{ raised: boolean }> {
  return apiFetch(`/campaigns/${campaignId}/signals`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
