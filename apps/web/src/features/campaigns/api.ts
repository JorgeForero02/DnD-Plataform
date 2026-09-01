import type { CreateCampaignInput, UpdateCampaignInput } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
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
