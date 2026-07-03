import type { Visibility } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

export interface Session {
  id: string;
  campaignId: string;
  title: string;
  scheduledAt: string | null;
  visibility: Visibility;
  createdAt: string;
}

export function fetchSessions(campaignId: string): Promise<Session[]> {
  return apiFetch<Session[]>(`/campaigns/${campaignId}/sessions`);
}
