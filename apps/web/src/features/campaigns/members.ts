import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";
// Self-import so useMembers calls fetchMembers through the module namespace,
// keeping it spyable in tests (same reason api.ts/hooks.ts are split elsewhere).
import * as membersApi from "./members";

export interface Member {
  userId: string;
  displayName: string;
  role: "DM" | "PLAYER";
}

export function fetchMembers(campaignId: string): Promise<Member[]> {
  return apiFetch<Member[]>(`/campaigns/${campaignId}/members`);
}

export const membersKey = (campaignId: string) => ["campaigns", campaignId, "members"] as const;

export function useMembers(campaignId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: membersKey(campaignId),
    queryFn: () => membersApi.fetchMembers(campaignId),
    enabled: options?.enabled,
  });
}
