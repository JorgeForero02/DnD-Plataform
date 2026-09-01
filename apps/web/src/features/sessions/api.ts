import type { CreateSessionInput, UpdateSessionInput, Visibility } from "@dnd/shared";
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
