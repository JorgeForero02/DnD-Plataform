import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateDmTableInput, UpdateDmTableInput } from "@dnd/shared";
// El módulo se importa a sí mismo por su espacio de nombres para que las llamadas pasen por él y
// sigan siendo espiables desde las pruebas — misma trampa de vitest documentada en
// docs/04-convenciones.md y ya resuelta así en features/campaigns/members.ts.
import * as dmTablesApi from "./api";

export const dmTablesKey = (campaignId: string) => ["campaigns", campaignId, "tables"] as const;

export function useDmTables(campaignId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: dmTablesKey(campaignId),
    queryFn: () => dmTablesApi.fetchDmTables(campaignId),
    enabled: options?.enabled,
  });
}

export function useCreateDmTable(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDmTableInput) => dmTablesApi.createDmTable(campaignId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dmTablesKey(campaignId) });
    },
  });
}

/**
 * Editar una tabla. Invalida la lista igual que crear, porque el `PUT` **reemplaza las filas
 * enteras** y la copia en caché deja de valer entera, no por partes.
 */
export function useUpdateDmTable(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tableId, input }: { tableId: string; input: UpdateDmTableInput }) =>
      dmTablesApi.updateDmTable(campaignId, tableId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dmTablesKey(campaignId) });
    },
  });
}

export function useDeleteDmTable(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tableId: string) => dmTablesApi.deleteDmTable(campaignId, tableId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dmTablesKey(campaignId) });
    },
  });
}

/**
 * Tirar sobre una tabla. **No invalida la lista**: una tirada no cambia la tabla, y refrescarla
 * borraría el resultado recién pintado de la pantalla.
 */
export function useRollDmTable(campaignId: string) {
  return useMutation({
    mutationFn: (tableId: string) => dmTablesApi.rollDmTable(campaignId, tableId),
  });
}

/** El interruptor de la casa. Ver el hueco conocido en `api.ts`: no hay `GET` que lo lea. */
export function useSetHouseTables(campaignId: string) {
  return useMutation({
    mutationFn: (enabled: boolean) => dmTablesApi.setHouseTables(campaignId, enabled),
  });
}
