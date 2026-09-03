import type { CreateDmTableInput, DmTableRoll, TableTrigger, Visibility } from "@dnd/shared";
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

export function deleteDmTable(campaignId: string, tableId: string): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`/campaigns/${campaignId}/tables/${tableId}`, {
    method: "DELETE",
    // Mismo escollo que las cinco DELETE de la tarea 1.16 (features/entities/api.ts): `apiFetch`
    // manda siempre `Content-Type: application/json`, y Fastify da 500 con eso y un cuerpo de
    // verdad vacío.
    body: JSON.stringify({}),
  });
}

/** Tirarla a mano. Sin cuerpo, pero con el `{}` por el mismo motivo que la DELETE de arriba. */
export function rollDmTable(campaignId: string, tableId: string): Promise<DmTableRoll> {
  return apiFetch<DmTableRoll>(`/campaigns/${campaignId}/tables/${tableId}/roll`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/**
 * El interruptor de la casa.
 *
 * **Hueco conocido:** ningún `GET` devuelve hoy el estado de `Campaign.houseTablesEnabled`, así
 * que la pantalla **no puede saber** si está encendido al entrar. Lo único honesto es reflejar lo
 * que devuelve este `PUT` y decir en pantalla que antes de tocarlo no se sabe — inventarse una
 * llamada que el servidor no ofrece, o pintar «apagado» por defecto, sería afirmar algo que no
 * consta. Reportado como dependencia fuera de la frontera de esta tarea.
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
