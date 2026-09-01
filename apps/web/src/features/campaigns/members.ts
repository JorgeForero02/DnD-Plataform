import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";
import { useAuthStore } from "../../store/auth.store";
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

export type MyRole = Member["role"] | undefined;

// "What am I in this campaign?" — the piece every honesty-of-the-interface check in this
// task (docs/06-pendientes.md) is built on. `role` is undefined before the answer is known
// (own user id not yet rehydrated, the members list still in flight, or the request failed)
// and also if the user turns out not to be a member at all — `isLoading` and `isError` are
// what tell those apart from "confirmed not a member". With `retry: false` (lib/queryClient.ts)
// a single failed GET never retries on its own, so `isError` has to be its own signal: a
// caller must treat it exactly like "still don't know" (disable, never "no permission"), and
// `retry` gives it a way out that doesn't depend on `refetchOnWindowFocus` happening to fire.
// See the editors and tabs that consume this. This does NOT replace canView/requireDM/
// requireMember/requireEditable (apps/api/src/common/visibility.ts and friends): the server
// keeps enforcing exactly the same rules whether or not this hook exists.
export function useMyRole(campaignId: string): {
  role: MyRole;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
} {
  const userId = useAuthStore((s) => s.user?.id);
  const members = useMembers(campaignId, { enabled: !!userId });
  const isLoading = !userId || members.isLoading;
  const role = members.data?.find((m) => m.userId === userId)?.role;
  return { role, isLoading, isError: members.isError, retry: () => void members.refetch() };
}
