import { useQuery } from "@tanstack/react-query";
import { fetchSessions } from "./api";

export const sessionsKey = (campaignId: string) => ["campaigns", campaignId, "sessions"] as const;

export function useSessions(campaignId: string) {
  return useQuery({
    queryKey: sessionsKey(campaignId),
    queryFn: () => fetchSessions(campaignId),
  });
}
