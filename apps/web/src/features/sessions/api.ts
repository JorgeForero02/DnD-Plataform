import type {
  AddDamageExtraInput,
  CloseSessionInput,
  CreateSessionInput,
  DamageExtra,
  DamagePreview,
  StampSessionNoteInput,
  StartSessionInput,
  UpdateSessionInput,
  Visibility,
} from "@dnd/shared";
import { apiFetch } from "../../lib/api";

export interface Session {
  id: string;
  campaignId: string;
  title: string;
  scheduledAt: string | null;
  // Session.notes is Json? in schema.prisma:126 and the schema accepts z.unknown() (session.schema.ts:7),
  // so it isn't guaranteed to be a string even though this UI only ever writes plain text into it.
  notes: unknown;
  visibility: Visibility;
  createdAt: string;
  // 2A.5 las guardaba y ninguna pantalla las leía: por eso nadie empezaba una sesión y todo el
  // combate se grababa fuera de ella.
  status: "PLANNED" | "IN_PROGRESS" | "CLOSED";
  startedAt: string | null;
  endedAt: string | null;
  attendance: { userId: string; characterId?: string }[] | null;
  /**
   * **La crónica de la sesión** (plan 02) y su nivel. **Puede no venir**, y eso no es un hueco: el
   * servidor **borra las dos** cuando quien mira no puede ver la crónica (`conCronica`), y borrar
   * solo el texto habría dicho «hay una crónica que no puedes leer», que ya es información.
   */
  recap?: string | null;
  recapVisibility?: Visibility;
}

export function fetchSessions(campaignId: string): Promise<Session[]> {
  return apiFetch<Session[]>(`/campaigns/${campaignId}/sessions`);
}

/** Una sesión, para su página de lectura (ficha U1). El servidor filtra la crónica por su nivel. */
export function fetchSession(campaignId: string, sessionId: string): Promise<Session> {
  return apiFetch<Session>(`/campaigns/${campaignId}/sessions/${sessionId}`);
}

export function createSession(campaignId: string, input: CreateSessionInput): Promise<Session> {
  return apiFetch<Session>(`/campaigns/${campaignId}/sessions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSession(
  campaignId: string,
  sessionId: string,
  input: UpdateSessionInput,
): Promise<Session> {
  return apiFetch<Session>(`/campaigns/${campaignId}/sessions/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteSession(
  campaignId: string,
  sessionId: string,
): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/campaigns/${campaignId}/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

// --- La sesión en juego (pantalla de mesa) ---

/** La sesión en curso es una `Session` normal; el alias existe para que se lea el intento. */
export type SessionEnCurso = Session;

/** `null` cuando no hay ninguna en curso, que es el caso normal fuera de partida. */
export function fetchCurrentSession(campaignId: string): Promise<SessionEnCurso | null> {
  return apiFetch<SessionEnCurso | null>(`/campaigns/${campaignId}/sessions/current`);
}

export function startSession(
  campaignId: string,
  sessionId: string,
  input: StartSessionInput = {},
): Promise<SessionEnCurso> {
  return apiFetch(`/campaigns/${campaignId}/sessions/${sessionId}/start`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function closeSession(
  campaignId: string,
  sessionId: string,
  input: CloseSessionInput,
): Promise<SessionEnCurso> {
  return apiFetch(`/campaigns/${campaignId}/sessions/${sessionId}/close`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * El sello rápido. **No lleva `sessionId`**: el servidor busca la sesión en curso, porque quien
 * sella en mitad de una partida no tiene por qué saber en cuál está.
 */
export function stampSessionNote(
  campaignId: string,
  input: StampSessionNoteInput,
): Promise<{ id: string }> {
  return apiFetch(`/campaigns/${campaignId}/sessions/notes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// --- La bandeja de daño (tarea 7 de la puerta de efectos, spec §4 bis §4b.5) ---

/**
 * El preview del daño pendiente de una tirada. **404 para quien no podría aplicarlo** (§4b.5):
 * el llamador lo trata como «no hay nada que enseñar», no como un error de red.
 */
export function fetchDamagePreview(
  campaignId: string,
  rollEventId: string,
): Promise<DamagePreview> {
  return apiFetch<DamagePreview>(`/campaigns/${campaignId}/rolls/${rollEventId}/damage-preview`);
}

/** El clic de «Aplicar». Sin cuerpo: todo lo que hace falta ya está en la tirada citada por la URL. */
export function applyDamage(campaignId: string, rollEventId: string): Promise<unknown> {
  return apiFetch(`/campaigns/${campaignId}/rolls/${rollEventId}/apply-damage`, {
    method: "POST",
  });
}

/**
 * Task 8 (3A.2) — marcar Ataque furtivo o Castigo divino sobre una tirada de daño pendiente
 * propia. Con cuerpo, a diferencia de `applyDamage`: la clave del extra viaja en el `body`.
 */
export function addDamageExtra(
  campaignId: string,
  rollEventId: string,
  input: AddDamageExtraInput,
): Promise<DamageExtra> {
  return apiFetch(`/campaigns/${campaignId}/rolls/${rollEventId}/damage-extra`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
