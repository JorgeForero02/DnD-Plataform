import type { EntityType, Visibility } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

export interface Entity {
  id: string;
  campaignId: string;
  type: EntityType;
  name: string;
  tags: string[];
  visibility: Visibility;
  createdById: string;
  createdAt: string;
}

export function fetchEntities(campaignId: string, type: EntityType): Promise<Entity[]> {
  return apiFetch<Entity[]>(`/campaigns/${campaignId}/entities?type=${type}`);
}
