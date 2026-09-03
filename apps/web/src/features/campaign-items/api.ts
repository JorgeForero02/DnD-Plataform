import type {
  ArmorCategory,
  CreateCampaignItemInput,
  DamageType,
  EquipSlot,
  ItemEffect,
  ItemKind,
  UpdateCampaignItemInput,
  Visibility,
  WeaponCategory,
  WeaponProperty,
  WeaponRange,
} from "@dnd/shared";
import { apiFetch } from "../../lib/api";

// Carril B2 — el catálogo de objetos de la campaña.
//
// **Los bloques `weapon` y `armor` van anidados en el cuerpo del POST/PATCH, pero llegan como
// columnas planas en la respuesta.** No es un despiste: `campaign-items.service.ts` los aplana
// al escribir en la base (columnas `weaponCategory`, `damageDice`… en la tabla `CampaignItem`) y
// los vuelve a anidar solo cuando hace falta alimentar el motor
// (`campaign-item-to-resolved.ts`). Esta interfaz describe la respuesta tal y como llega —plana—
// y el editor es quien vuelve a anidar `weapon`/`armor` al construir el cuerpo que manda.
export interface CampaignItemGrant {
  id: string;
  itemId: string;
  userId: string;
}

export interface CampaignItem {
  id: string;
  campaignId: string;
  name: string;
  kind: ItemKind;
  description?: string | null;
  weightOz: number;
  costCp?: number | null;
  effects: ItemEffect[];
  requiresAttunement: boolean;
  slot?: EquipSlot | null;
  weaponCategory?: WeaponCategory | null;
  weaponRange?: WeaponRange | null;
  damageDice?: string | null;
  damageType?: DamageType | null;
  weaponProperties: WeaponProperty[];
  versatileDice?: string | null;
  rangeNormalFt?: number | null;
  rangeLongFt?: number | null;
  armorCategory?: ArmorCategory | null;
  baseAc?: number | null;
  dexCap?: number | null;
  strengthRequirement?: number | null;
  stealthDisadvantage?: boolean | null;
  visibility: Visibility;
  createdById: string;
  createdAt: string;
  grants: CampaignItemGrant[];
}

export function fetchCampaignItems(campaignId: string): Promise<CampaignItem[]> {
  return apiFetch<CampaignItem[]>(`/campaigns/${campaignId}/items`);
}

export function fetchCampaignItem(campaignId: string, itemId: string): Promise<CampaignItem> {
  return apiFetch<CampaignItem>(`/campaigns/${campaignId}/items/${itemId}`);
}

export function createCampaignItem(
  campaignId: string,
  input: CreateCampaignItemInput,
): Promise<CampaignItem> {
  return apiFetch<CampaignItem>(`/campaigns/${campaignId}/items`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCampaignItem(
  campaignId: string,
  itemId: string,
  input: UpdateCampaignItemInput,
): Promise<CampaignItem> {
  return apiFetch<CampaignItem>(`/campaigns/${campaignId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteCampaignItem(
  campaignId: string,
  itemId: string,
): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/campaigns/${campaignId}/items/${itemId}`, {
    method: "DELETE",
    // Mismo escollo que las cinco DELETE de la tarea 1.16 (entities/api.ts): apiFetch siempre
    // manda Content-Type: application/json, y Fastify da 500 con eso y un cuerpo de verdad
    // vacío.
    body: JSON.stringify({}),
  });
}
