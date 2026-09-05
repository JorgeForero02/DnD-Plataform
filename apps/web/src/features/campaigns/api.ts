import type { CreateCampaignInput, UpdateCampaignInput } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  // Reseño 2026-09-02 — only present on the LIST endpoint (campaigns.service.ts#listForUser),
  // which is why both are optional: /campaigns/:id returns the campaign on its own. `members`
  // holds the VIEWER's membership row and nobody else's, so it says what you are at this
  // table without listing who else is at it. No entity/session counts here on purpose — see
  // the comment in listForUser: counting objects that carry five visibility levels would leak
  // the existence of the ones you cannot see.
  members?: { role: string }[];
  _count?: { members: number };
  /**
   * **Dónde se quedó la partida** (D-OP-17): la crónica de la última sesión cerrada, **ya filtrada
   * por el servidor** con la visibilidad propia de la crónica.
   *
   * **Ausente y `null` no son lo mismo, y por eso esto es opcional y nunca `null`.** Ausente
   * significa «no hay nada que enseñarte»: o la campaña no ha cerrado ninguna sesión, o su última
   * crónica no la puedes leer. Las dos se pintan igual —no se dice cuál de las dos es—, porque
   * distinguirlas contaría que hay una crónica escondida.
   */
  lastRecap?: { text: string; sessionTitle: string; endedAt: string | null };
}

export function fetchCampaigns(): Promise<Campaign[]> {
  return apiFetch<Campaign[]>("/campaigns");
}

export function fetchCampaign(id: string): Promise<Campaign> {
  return apiFetch<Campaign>(`/campaigns/${id}`);
}

export function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  return apiFetch<Campaign>("/campaigns", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCampaign(id: string, input: UpdateCampaignInput): Promise<Campaign> {
  return apiFetch<Campaign>(`/campaigns/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCampaign(id: string): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/campaigns/${id}`, {
    method: "DELETE",
    // apiFetch (lib/api.ts) always sends Content-Type: application/json; Fastify 500s on
    // that combined with a genuinely empty body — the trap paid twice already (1.14, 1.16).
    // See features/entities/api.ts:58-66.
    body: JSON.stringify({}),
  });
}
