import type {
  AddInventoryItemInput,
  ChangeMoneyInput,
  CoinPurse,
  EquipSlot,
  ItemLocation,
  ResolvedItem,
  UpdateInventoryItemInput,
} from "@dnd/shared";
import { apiFetch } from "../../lib/api";

// Carril B1 — el cliente HTTP del inventario. `apiFetch` es el único que habla HTTP
// (docs/04-convenciones.md); este fichero es la única puerta de esta feature hacia
// `apps/api/src/inventory/`. **No se toca la API.**

export interface InventoryRow {
  id: string;
  quantity: number;
  location: ItemLocation;
  slot: EquipSlot | null;
  attuned: boolean;
  storedAt: string | null;
  note: string | null;
  item: ResolvedItem;
}

export interface InventoryResponse {
  items: InventoryRow[];
  purse: CoinPurse;
  totalWeightOz: number;
  carryCapacityOz: number | null;
}

export function fetchInventory(
  campaignId: string,
  characterId: string,
): Promise<InventoryResponse> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/inventory`);
}

/**
 * Carril B4 — el catálogo entero del SRD, para el selector de "añadir objeto". Autenticado pero
 * no por campaña (`CatalogController`): mismo objeto para todas las mesas.
 */
export function fetchCatalogItems(): Promise<{ items: ResolvedItem[] }> {
  return apiFetch("/catalog/items");
}

export function addInventoryItem(
  campaignId: string,
  characterId: string,
  input: AddInventoryItemInput,
): Promise<InventoryRow> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/inventory`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateInventoryItem(
  campaignId: string,
  characterId: string,
  rowId: string,
  input: UpdateInventoryItemInput,
): Promise<InventoryRow> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/inventory/${rowId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function removeInventoryItem(
  campaignId: string,
  characterId: string,
  rowId: string,
): Promise<{ deleted: boolean }> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/inventory/${rowId}`, {
    method: "DELETE",
    // Mismo motivo que `character-sheet/api.ts`: `apiFetch` siempre manda un Content-Type
    // JSON, y Fastify rechaza esa cabecera con un cuerpo de verdad vacío.
    body: JSON.stringify({}),
  });
}

export function changeMoney(
  campaignId: string,
  characterId: string,
  input: ChangeMoneyInput,
): Promise<CoinPurse> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/money`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/**
 * Solo la Clase de Armadura calculada, para el aviso de confirmación al equipar
 * ("CA 13 -> 14"). **No se reimplementa la fórmula de CA aquí**: es la regla de siempre
 * (`canView`/el motor son el dueño único de sus cálculos), así que se le pregunta a la hoja de
 * verdad y se lee un único número. `null` cuando la hoja no está calculada todavía (una elección
 * pendiente, por ejemplo) — el aviso simplemente no se enseña en ese caso.
 */
export async function fetchAc(campaignId: string, characterId: string): Promise<number | null> {
  const respuesta = await apiFetch<{
    sheet: { derived: Record<string, { total: number }> } | null;
  }>(`/campaigns/${campaignId}/characters/${characterId}/sheet`);
  return respuesta.sheet?.derived.ac?.total ?? null;
}
