import type {
  AddInventoryItemInput,
  ChangeMoneyInput,
  CoinPurse,
  EquipSlot,
  ItemLocation,
  ResolvedItem,
  UpdateInventoryItemInput,
  UpdateInventoryItemResponse,
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

/**
 * Mover, equipar, desequipar, sintonizar o cambiar la cantidad. Devuelve `{ item, acBefore, ac }`
 * (M2B-11): las dos CA las calcula el servidor en la misma transacción que el cambio, así que la
 * pantalla no tiene que volver a preguntar por ellas con una segunda petición ni depender de
 * tener la hoja ya cargada en otro sitio.
 */
export function updateInventoryItem(
  campaignId: string,
  characterId: string,
  rowId: string,
  input: UpdateInventoryItemInput,
): Promise<UpdateInventoryItemResponse> {
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
  });
}

/**
 * Gastar unidades de un consumible: la poción que se bebe, el paquete de flechas que se acaba.
 * Al llegar a cero el servidor se lleva la fila, y lo dice en `deleted`.
 */
export function consumeInventoryItem(
  campaignId: string,
  characterId: string,
  rowId: string,
  amount = 1,
): Promise<{ remaining: number; deleted: boolean }> {
  return apiFetch(`/campaigns/${campaignId}/characters/${characterId}/inventory/${rowId}/consume`, {
    method: "POST",
    body: JSON.stringify({ amount }),
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
