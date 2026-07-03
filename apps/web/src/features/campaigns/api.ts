import type { CreateCampaignInput } from "@dnd/shared";
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

export function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  return apiFetch<Campaign>("/campaigns", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
