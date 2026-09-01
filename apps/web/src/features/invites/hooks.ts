import { useMutation } from "@tanstack/react-query";
import { createInvite } from "./api";

// There is no useAcceptInvite here: JoinPage.tsx calls acceptInvite (api.ts) directly instead
// of through useMutation. See the comment at the top of JoinPage.tsx for why — a mutation fired
// from a mount effect got orphaned by React 18 StrictMode's double render/effect pass in dev.
export function useCreateInvite(campaignId: string) {
  return useMutation({
    mutationFn: () => createInvite(campaignId),
  });
}
