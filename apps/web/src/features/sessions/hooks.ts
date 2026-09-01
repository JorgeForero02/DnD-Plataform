import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSessions, createSession, updateSession } from "./api";

export const sessionsKey = (campaignId: string) => ["campaigns", campaignId, "sessions"] as const;

export function useSessions(campaignId: string) {
  return useQuery({
    queryKey: sessionsKey(campaignId),
    queryFn: () => fetchSessions(campaignId),
  });
}

export function useCreateSession(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createSession>[1]) => createSession(campaignId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionsKey(campaignId) }),
  });
}

export function useUpdateSession(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { sessionId: string; input: Parameters<typeof updateSession>[2] }) =>
      updateSession(campaignId, vars.sessionId, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionsKey(campaignId) }),
  });
}
