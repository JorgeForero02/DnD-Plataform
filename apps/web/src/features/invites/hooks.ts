import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createInvite, fetchInvites, revokeInvite } from "./api";

// There is no useAcceptInvite here: JoinPage.tsx calls acceptInvite (api.ts) directly instead
// of through useMutation. See the comment at the top of JoinPage.tsx for why — a mutation fired
// from a mount effect got orphaned by React 18 StrictMode's double render/effect pass in dev.

export const invitesKey = (campaignId: string) => ["campaigns", campaignId, "invites"] as const;

export function useCreateInvite(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    // `expiresInDays` opcional: sin él, el enlace no caduca (plan 11, ficha A3).
    mutationFn: (expiresInDays?: number) => createInvite(campaignId, expiresInDays),
    // El enlace nuevo tiene que aparecer en el listado sin recargar: es la mitad de lo que hace
    // útil el listado, porque el DM acaba de generarlo y quiere verlo ahí.
    onSuccess: () => qc.invalidateQueries({ queryKey: invitesKey(campaignId) }),
  });
}

/**
 * **Los enlaces repartidos** (plan 11, ficha D3b). Solo el DM: para el resto el servidor responde
 * 403, así que ni se pide — `enabled` evita una petición que se sabe que va a fallar.
 */
export function useInvites(campaignId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: invitesKey(campaignId),
    queryFn: () => fetchInvites(campaignId),
    enabled: (options?.enabled ?? true) && Boolean(campaignId),
  });
}

export function useRevokeInvite(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteId: string) => revokeInvite(inviteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: invitesKey(campaignId) }),
  });
}
