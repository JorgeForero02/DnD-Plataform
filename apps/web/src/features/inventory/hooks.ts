import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AddInventoryItemInput,
  ChangeMoneyInput,
  InventoryItemRow,
  UpdateInventoryItemInput,
} from "@dnd/shared";
import * as inventoryApi from "./api";
import { useSrdResolvedItems } from "../campaign-items/hooks";
import { SONDEO_DE_RED_DE_SEGURIDAD_MS } from "../../lib/sondeo";

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
    refetchInterval: SONDEO_DE_RED_DE_SEGURIDAD_MS,
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
  row: InventoryItemRow;
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
 *
 * **Ya no hay dos `fetchAc`** (M2B-11): hasta esta ficha esto era `fetchAc` → `PATCH` →
 * `fetchAc`, y si el segundo fallaba la pantalla se quedaba enseñando la CA de antes aunque el
 * servidor ya hubiera escrito el cambio. **Las dos mitades viajan en la respuesta del `PATCH`**
 * (`{ item, acBefore, ac }`, las dos calculadas por el servidor dentro de la misma transacción) —
 * fix de ronda 1 (Q-2): la primera versión leía "el antes" de la caché de TanStack Query de la
 * hoja, y el diálogo "Tu bolsa" de la mesa (`MesaDeSesion`) monta este inventario **sin** haber
 * cargado esa hoja, así que la caché estaba vacía y el aviso desaparecía en silencio justo donde
 * más se usa. Ahora no depende de qué más se haya cargado antes.
 */
export function useCambiarUbicacion(campaignId: string, characterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      rowId: string;
      input: UpdateInventoryItemInput;
    }): Promise<ResultadoDeUbicacion> => {
      const {
        item,
        acBefore: acAntes,
        ac: acDespues,
      } = await inventoryApi.updateInventoryItem(campaignId, characterId, vars.rowId, vars.input);
      return { row: item, acAntes, acDespues };
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
    onSuccess: () => {
      invalidarTrasCambio(qc, campaignId, characterId);
      // Task 4 de 3A.3 (T22) — cada fila de OBJETOS en la barra es `item:<rowId>`; beber una
      // poción cambia su `recurso.actual` (o la borra, si era la última). Clave literal, mismo
      // motivo que `character-sheet/hooks.ts` (evita un ciclo entre `features/inventory` y
      // `features/actions`, que ya importa de character-sheet).
      void qc.invalidateQueries({
        queryKey: ["campaigns", campaignId, "characters", characterId, "actions"],
      });
    },
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
