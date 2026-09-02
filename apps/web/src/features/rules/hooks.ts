import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateRuleInput,
  ResolveProposalInput,
  RuleTrigger,
  UpdateRuleInput,
} from "@dnd/shared";
import * as rulesApi from "./api";

// Tarea 2A.17. Claves jerárquicas bajo la raíz `["campaigns", campaignId, ...]`
// (docs/04-convenciones.md): invalidar `rulesRootKey` invalida la lista, las propuestas y la
// traza a la vez, que es justo lo que hace falta tras aplicar o rechazar una propuesta.
//
// Trampa de vitest documentada en 04-convenciones.md: las pruebas espían
// `rulesApi.createRule` etc. por su espacio de nombres, así que las llamadas de este módulo
// pasan por `rulesApi.xxx(...)` y nunca por un import nombrado directo.

export const rulesRootKey = (campaignId: string) => ["campaigns", campaignId, "rules"] as const;
export const rulesKey = (campaignId: string) => [...rulesRootKey(campaignId), "list"] as const;
export const proposalsKey = (campaignId: string) =>
  [...rulesRootKey(campaignId), "proposals"] as const;
export const tracesKey = (campaignId: string) => [...rulesRootKey(campaignId), "traces"] as const;

/** Cuántas trazas pide cada página. El servidor admite hasta 100 (`listTracesQuerySchema`). */
export const TAMANO_DE_PAGINA_DE_TRAZA = 20;

export function useRules(campaignId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: rulesKey(campaignId),
    queryFn: () => rulesApi.fetchRules(campaignId),
    enabled: options?.enabled ?? Boolean(campaignId),
  });
}

export function useCreateRule(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRuleInput) => rulesApi.createRule(campaignId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: rulesKey(campaignId) }),
  });
}

export function useUpdateRule(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { ruleId: string; input: UpdateRuleInput }) =>
      rulesApi.updateRule(campaignId, vars.ruleId, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: rulesKey(campaignId) }),
  });
}

export function useDeleteRule(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: string) => rulesApi.deleteRule(campaignId, ruleId),
    // Borrar una regla se lleva sus trazas por cascada (`schema.prisma`, `onDelete: Cascade`),
    // así que se invalida la raíz entera y no solo la lista.
    onSuccess: () => qc.invalidateQueries({ queryKey: rulesRootKey(campaignId) }),
  });
}

/**
 * El ensayo en seco. **No invalida nada a propósito**: no ha cambiado nada que refrescar, y
 * ésa es exactamente la diferencia entre simular y disparar.
 */
export function useDryRun(campaignId: string) {
  return useMutation({
    mutationFn: (vars: { ruleId: string; trigger: RuleTrigger }) =>
      rulesApi.dryRunRule(campaignId, vars.ruleId, vars.trigger),
  });
}

export function useProposals(campaignId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: proposalsKey(campaignId),
    queryFn: () => rulesApi.fetchProposals(campaignId),
    enabled: options?.enabled ?? Boolean(campaignId),
  });
}

export function useResolveProposal(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { traceId: string; input: ResolveProposalInput }) =>
      rulesApi.resolveProposal(campaignId, vars.traceId, vars.input),
    // Aplicar una propuesta cambia el mundo de verdad: la lista (contadores de disparo), la
    // bandeja y la traza dejan de valer todas a la vez.
    onSuccess: () => qc.invalidateQueries({ queryKey: rulesRootKey(campaignId) }),
  });
}

/** La traza, paginada con el `cursor` que devuelve el propio servidor. */
export function useTraces(campaignId: string, options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: tracesKey(campaignId),
    queryFn: ({ pageParam }) =>
      rulesApi.fetchTraces(campaignId, {
        limit: TAMANO_DE_PAGINA_DE_TRAZA,
        cursor: pageParam as string | undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.nextCursor ?? undefined,
    enabled: options?.enabled ?? Boolean(campaignId),
  });
}
