import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AddInventoryItemInput,
  ChangeMoneyInput,
  UpdateInventoryItemInput,
} from "@dnd/shared";
import * as inventoryApi from "./api";
import type { InventoryRow } from "./api";
import { useSrdResolvedItems } from "../campaign-items/hooks";

// Carril B4 — la clave del catálogo SRD, sin `campaignId`: el mismo catálogo sirve a cualquier
// mesa (`CatalogController`), así que cachearlo por campaña solo lo pediría dos veces sin motivo.
export { catalogItemsKey } from "../campaign-items/hooks";

/**
 * El catálogo del SRD tal cual, para el selector. **La consulta es la misma que la del catálogo
 * de la campaña** (`useSrdResolvedItems`): dos consultas con la misma clave y formas distintas
 * hacían que la segunda pantalla leyera la caché de la primera y la aplicación se cayera.
 */
export function useCatalogItems(options?: { enabled?: boolean }) {
  return useSrdResolvedItems(options);
}

// Carril B1 — los hooks del inventario. Misma convención que `character-sheet/hooks.ts`: las
// llamadas internas pasan por `inventoryApi.xxx(...)` (no por el import nombrado) porque las
// pruebas espían el módulo por su espacio de nombres.

export const inventoryKey = (campaignId: string, characterId: string) =>
  ["campaigns", campaignId, "characters", characterId, "inventory"] as const;

// La misma clave que usa `character-sheet/hooks.ts` (`sheetKey`), escrita literal a propósito:
// esta feature no importa de `features/character-sheet` (frontera del carril), y equipar o
// desequipar un objeto cambia lo que esa consulta calcula (la CA, entre otras cosas). Si la
// pantalla de la hoja está abierta a la vez, se refresca sola.
const sheetKeyLiteral = (campaignId: string, characterId: string) =>
  ["campaigns", campaignId, "characters", characterId, "sheet"] as const;

export function useInventory(campaignId: string, characterId: string) {
  return useQuery({
    // **Se sondea, como la sesión en curso y el registro de la partida.** El DM entrega el botín
    // desde su portátil y, sin esto, a los jugadores no les aparecía hasta volver a la pestaña:
    // la invalidación solo alcanza al navegador que hizo el cambio. Treinta segundos es lo que
    // ya usan las sesiones, y de momento se juega presencialmente — el tiempo real es la fase 4.
    refetchInterval: 30_000,
    queryKey: inventoryKey(campaignId, characterId),
    queryFn: () => inventoryApi.fetchInventory(campaignId, characterId),
    enabled: Boolean(campaignId && characterId),
  });
}

function invalidarTrasCambio(
  qc: ReturnType<typeof useQueryClient>,
  campaignId: string,
  characterId: string,
) {
  void qc.invalidateQueries({ queryKey: inventoryKey(campaignId, characterId) });
  void qc.invalidateQueries({ queryKey: sheetKeyLiteral(campaignId, characterId) });
}

export function useAddInventoryItem(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddInventoryItemInput) =>
      inventoryApi.addInventoryItem(campaignId, characterId, input),
    onSuccess: () => invalidarTrasCambio(qc, campaignId, characterId),
  });
}

export interface ResultadoDeUbicacion {
  row: InventoryRow;
  /** CA antes de la mutación, o `null` si la hoja no estaba calculada. */
  acAntes: number | null;
  /** CA después, con el mismo `null` posible. */
  acDespues: number | null;
}

/**
 * Mover, equipar, desequipar, sintonizar: **una sola mutación**, como en el servidor
 * (`updateInventoryItemSchema`, "una sola frase"). Además captura la Clase de Armadura antes y
 * después del cambio, porque el aviso de confirmación del prototipo ("CA 13 -> 14") es la
 * conexión que hace único al producto: el objeto que te pones y el número que sube.
 */
export function useCambiarUbicacion(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      rowId: string;
      input: UpdateInventoryItemInput;
    }): Promise<ResultadoDeUbicacion> => {
      const acAntes = await inventoryApi.fetchAc(campaignId, characterId);
      const row = await inventoryApi.updateInventoryItem(
        campaignId,
        characterId,
        vars.rowId,
        vars.input,
      );
      const acDespues = await inventoryApi.fetchAc(campaignId, characterId);
      return { row, acAntes, acDespues };
    },
    onSuccess: () => invalidarTrasCambio(qc, campaignId, characterId),
  });
}

export function useRemoveInventoryItem(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rowId: string) => inventoryApi.removeInventoryItem(campaignId, characterId, rowId),
    onSuccess: () => invalidarTrasCambio(qc, campaignId, characterId),
  });
}

export function useConsumeInventoryItem(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rowId, amount }: { rowId: string; amount?: number }) =>
      inventoryApi.consumeInventoryItem(campaignId, characterId, rowId, amount),
    onSuccess: () => invalidarTrasCambio(qc, campaignId, characterId),
  });
}

export function useChangeMoney(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ChangeMoneyInput) =>
      inventoryApi.changeMoney(campaignId, characterId, input),
    onSuccess: () => invalidarTrasCambio(qc, campaignId, characterId),
  });
}
