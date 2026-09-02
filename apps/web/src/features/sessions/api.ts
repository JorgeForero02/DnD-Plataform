import type {
  CloseSessionInput,
  CreateSessionInput,
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
}

export function fetchSessions(campaignId: string): Promise<Session[]> {
  return apiFetch<Session[]>(`/campaigns/${campaignId}/sessions`);
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
    // See the same comment in features/entities/api.ts: apiFetch always sends a JSON
    // Content-Type, and Fastify rejects that paired with a truly empty body.
    body: JSON.stringify({}),
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
