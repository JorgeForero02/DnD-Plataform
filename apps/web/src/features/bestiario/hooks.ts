import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateCampaignStatblockInput,
  InstantiateNpcInput,
  UpdateCampaignStatblockInput,
} from "@dnd/shared";
// El módulo se importa por su espacio de nombres para que las llamadas sigan siendo espiables
// desde las pruebas — la misma trampa de vitest que documenta docs/04-convenciones.md.
import * as bestiarioApi from "./api";

export const statblocksKey = (campaignId: string) =>
  ["campaigns", campaignId, "statblocks"] as const;
export const npcsKey = (campaignId: string) => ["campaigns", campaignId, "npcs"] as const;

export function useStatblocks(campaignId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: statblocksKey(campaignId),
    queryFn: () => bestiarioApi.fetchStatblocks(campaignId),
    enabled: options?.enabled,
  });
}

export function useNpcs(campaignId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: npcsKey(campaignId),
    queryFn: () => bestiarioApi.fetchNpcs(campaignId),
    enabled: options?.enabled,
  });
}

export function useCreateStatblock(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCampaignStatblockInput) =>
      bestiarioApi.createStatblock(campaignId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: statblocksKey(campaignId) }),
  });
}

export function useUpdateStatblock(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { statblockId: string; input: UpdateCampaignStatblockInput }) =>
      bestiarioApi.updateStatblock(campaignId, vars.statblockId, vars.input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: statblocksKey(campaignId) });
      // Los PNJ ya bajados a la mesa llevan `statblockRef` a esta plantilla: su CA, sus PG y sus
      // resistencias salen de ella, así que editarla cambia lo que la mesa ve de ellos.
      void qc.invalidateQueries({ queryKey: npcsKey(campaignId) });
    },
  });
}

export function useDeleteStatblock(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (statblockId: string) => bestiarioApi.deleteStatblock(campaignId, statblockId),
    onSuccess: () => qc.invalidateQueries({ queryKey: statblocksKey(campaignId) }),
  });
}

/**
 * Bajar un statblock a la mesa.
 *
 * **Invalida los PNJ y también los personajes.** Un PNJ instanciado es una fila de `Character`, y
 * si la lista de personajes no se refrescara, la pantalla de personajes seguiría enseñando la
 * mesa de antes hasta que alguien recargara. Es la consecuencia directa de la decisión de diseño
 * de la fase, y por eso vive aquí y no se descubre en la mesa.
 */
export function useInstantiateNpc(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InstantiateNpcInput) => bestiarioApi.instantiateNpc(campaignId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: npcsKey(campaignId) });
      qc.invalidateQueries({ queryKey: ["campaigns", campaignId, "characters"] });
    },
  });
}
