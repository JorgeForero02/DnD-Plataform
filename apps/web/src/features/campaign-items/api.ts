import type {
  ResolvedItem,
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

/**
 * Los objetos del SRD 5.1, **traducidos a la misma forma de fila que los de la campaña**.
 *
 * El catálogo del SRD viaja como `ResolvedItem` (bloques `weapon`/`armor` anidados) y la tabla
 * de la campaña llega con columnas planas. La pantalla pinta **una sola lista con las dos
 * procedencias** —así lo decide la pantalla 22 del prototipo, y con motivo: cuando algo se
 * comporta raro, lo primero que se pregunta es de dónde salió—, así que alguien tiene que
 * aplanar. Se hace aquí, en la puerta de datos, y no en el componente: una pantalla que además
 * traduce formas acaba teniendo dos maneras de leer un objeto.
 *
 * `id` es la `ref` (`SRD:long-sword`), que es estable y no choca con ningún `cuid` de campaña.
 */
export async function fetchSrdItems(): Promise<ResolvedItem[]> {
  const { items } = await apiFetch<{ items: ResolvedItem[] }>("/catalog/items");
  return items;
}

/**
 * Aplana un objeto del SRD a la forma de fila de la campaña, para pintarlos en la misma lista.
 *
 * **Va aparte de la petición a propósito.** Las dos pantallas que usan el catálogo del SRD
 * comparten una sola entrada de caché —`["catalog","items"]`— y cada una elige su vista con
 * `select`: el inventario quiere el objeto tal cual, y el catálogo lo quiere aplanado. Cuando
 * esto eran **dos peticiones con la misma clave y formas distintas**, la segunda pantalla en
 * montarse leía la caché de la primera y **la aplicación se caía** — con las dos pruebas de
 * componente en verde, porque cada una montaba su pantalla sola. Lo cazó el navegador.
 */
export function aplanarItemSrd(item: ResolvedItem): CampaignItem {
  return {
    id: item.ref,
    campaignId: "",
    name: item.name,
    kind: item.kind,
    description: item.description ?? null,
    weightOz: item.weightOz,
    costCp: item.costCp ?? null,
    effects: item.effects,
    requiresAttunement: item.requiresAttunement,
    slot: item.slot ?? null,
    weaponCategory: item.weapon?.category ?? null,
    weaponRange: item.weapon?.range ?? null,
    damageDice: item.weapon?.damageDice ?? null,
    damageType: item.weapon?.damageType ?? null,
    weaponProperties: item.weapon?.properties ?? [],
    versatileDice: item.weapon?.versatileDice ?? null,
    rangeNormalFt: item.weapon?.rangeNormalFt ?? null,
    rangeLongFt: item.weapon?.rangeLongFt ?? null,
    armorCategory: item.armor?.category ?? null,
    baseAc: item.armor?.baseAc ?? null,
    // **`dexCap: 0` tiene que sobrevivir**: es la armadura pesada, que no suma nada de Destreza.
    dexCap: item.armor?.dexCap ?? null,
    strengthRequirement: item.armor?.strengthRequirement ?? null,
    stealthDisadvantage: item.armor?.stealthDisadvantage ?? null,
    visibility: "PUBLIC",
    createdById: "",
    createdAt: "",
    grants: [],
  };
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
  });
}
