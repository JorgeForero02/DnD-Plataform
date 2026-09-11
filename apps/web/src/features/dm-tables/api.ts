import type {
  CreateDmTableInput,
  DmTableRoll,
  EntregaInput,
  TableTrigger,
  UpdateDmTableInput,
  Visibility,
} from "@dnd/shared";
import { apiFetch } from "../../lib/api";

// Tarea 2C.6 — la puerta de datos de **las tablas del DM**.
//
// El servidor ya filtra la lista por `canView` (`apps/api/src/dm-tables/dm-tables.service.ts`):
// una tabla `DM_ONLY` **no viaja**. Aquí no se esconde nada — lo que llega, se pinta.

export interface DmTableEntry {
  id: string;
  min: number;
  max: number;
  text: string;
  /**
   * **Lo que esta fila entrega, si entrega algo** (ficha P2-2). El servidor la manda desde que la
   * columna existe —las entradas viajan por `include`— y **este tipo no la declaraba**, así que la
   * pantalla no podía ni leerla ni devolverla.
   *
   * No era un campo de más: editar una tabla **reemplaza sus filas enteras** (`updateDmTableSchema`,
   * y el servicio hace `deleteMany` y las vuelve a crear), así que una fila reconstruida sin
   * `entrega` no dejaba la entrega vacía — la borraba. Abrir el formulario de una tabla con botín y
   * pulsar «Guardar cambios» se lo llevaba por delante.
   */
  entrega?: EntregaInput;
}

export interface DmTable {
  id: string;
  name: string;
  description?: string | null;
  visibility: Visibility;
  trigger: TableTrigger;
  entries: DmTableEntry[];
}

/**
 * Las tablas **y el estado del interruptor**, en la misma respuesta.
 *
 * El interruptor viaja aquí porque nadie necesita lo uno sin lo otro, y porque hasta que llegó
 * esta lectura la pantalla podía escribirlo y no saber en qué posición estaba: pintar «Apagada»
 * sin que conste es una interfaz afirmando un estado del servidor que no conoce.
 */
export interface DmTablesResponse {
  tables: DmTable[];
  houseTablesEnabled: boolean;
}

export function fetchDmTables(campaignId: string): Promise<DmTablesResponse> {
  return apiFetch<DmTablesResponse>(`/campaigns/${campaignId}/tables`);
}

export function createDmTable(campaignId: string, input: CreateDmTableInput): Promise<DmTable> {
  return apiFetch<DmTable>(`/campaigns/${campaignId}/tables`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/**
 * Editar una tabla (ficha C2C-6). **Mismo cuerpo que crearla, y las filas se reemplazan enteras**
 * — el porqué está escrito una sola vez, en `updateDmTableSchema`
 * (`packages/shared/src/dm-table.schema.ts`): las filas se validan **como conjunto**, así que
 * tocar una sola dejaría a las demás en un estado que nadie ha comprobado. Por eso aquí no hay
 * ninguna función de «editar una fila»: no existe tal cosa.
 */
export function updateDmTable(
  campaignId: string,
  tableId: string,
  input: UpdateDmTableInput,
): Promise<DmTable> {
  return apiFetch<DmTable>(`/campaigns/${campaignId}/tables/${tableId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteDmTable(campaignId: string, tableId: string): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/campaigns/${campaignId}/tables/${tableId}`, {
    method: "DELETE",
  });
}

/** Tirarla a mano. Sin cuerpo. */
export function rollDmTable(campaignId: string, tableId: string): Promise<DmTableRoll> {
  return apiFetch<DmTableRoll>(`/campaigns/${campaignId}/tables/${tableId}/roll`, {
    method: "POST",
  });
}

/**
 * El interruptor de la casa.
 *
 * **El hueco que este comentario describía ya no existe, y el comentario sobrevivió al arreglo.**
 * Decía que ningún `GET` devolvía `Campaign.houseTablesEnabled` y que la pantalla no podía saber
 * la posición del interruptor al entrar. Hoy sí puede: el estado viaja **con la lista**
 * (`dm-tables.service.ts:94`, `DmTablesResponse.houseTablesEnabled`) y `PanelDeTablas` se lo pasa
 * a `InterruptorDeLaCasa`. Se deja dicho en vez de borrarlo a secas porque un comentario caducado
 * costó que una auditoría diera por abierta una ficha ya cerrada.
 */
export function setHouseTables(
  campaignId: string,
  enabled: boolean,
): Promise<{ enabled: boolean }> {
  return apiFetch<{ enabled: boolean }>(`/campaigns/${campaignId}/tables/house-rule`, {
    method: "PUT",
    body: JSON.stringify({ enabled }),
  });
}
