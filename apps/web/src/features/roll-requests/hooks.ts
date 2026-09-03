import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateRollRequestInput } from "@dnd/shared";
import * as rollRequestsApi from "./api";

// Tarea 2C.5 — los hooks de las peticiones de tirada. Misma convención que `features/rolls` y
// `features/inventory`: las llamadas internas pasan por `rollRequestsApi.xxx(...)` y no por el
// import nombrado, porque las pruebas espían el módulo por su espacio de nombres y un espía sobre
// el espacio de nombres no intercepta una llamada interna al propio módulo
// (docs/04-convenciones.md, «trampa de vitest»).

/** Clave jerárquica, como todo lo que cuelga de una campaña (docs/04-convenciones.md). */
export const rollRequestsKey = (campaignId: string) =>
  ["campaigns", campaignId, "roll-requests"] as const;

/**
 * **Quince segundos, y es más corto que los treinta del inventario a propósito.**
 *
 * El inventario sondea un estado que cambia de vez en cuando; esto es **una pregunta que espera
 * respuesta**: el DM dice «tirad percepción» en voz alta y mira la pantalla. Medio minuto de
 * silencio entre la frase y el botón hace que alguien tire con dados de plástico, que es
 * exactamente lo que esta herramienta existe para quitar. El tiempo real es la fase 4.
 */
export const SONDEO_DE_PETICIONES_MS = 15_000;

export function useRollRequests(campaignId: string, query: { includeResolved?: boolean } = {}) {
  return useQuery({
    refetchInterval: SONDEO_DE_PETICIONES_MS,
    queryKey: [...rollRequestsKey(campaignId), query] as const,
    queryFn: () => rollRequestsApi.fetchRollRequests(campaignId, query),
    enabled: Boolean(campaignId),
  });
}

/** Pedir. Solo el DM — y quien lo impone es el servidor, no el hecho de que el formulario se pinte. */
export function useCreateRollRequest(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRollRequestInput) =>
      rollRequestsApi.createRollRequest(campaignId, input),
    onSuccess: () => {
      // Sin el filtro: el DM ve aparecer en su propia lista de pendientes lo que acaba de pedir.
      void qc.invalidateQueries({ queryKey: rollRequestsKey(campaignId) });
    },
  });
}

/**
 * Responderla tirando. **Aquí no se genera azar**: el servidor lee la hoja en el momento de tirar
 * y devuelve el resultado ya escrito en el registro (`roll-requests.service.ts`).
 */
export function useAnswerRollRequest(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => rollRequestsApi.answerRollRequest(campaignId, requestId),
    onSuccess: () => {
      // La petición deja de estar pendiente…
      void qc.invalidateQueries({ queryKey: rollRequestsKey(campaignId) });
      // …y la tirada que salió de ella entra en el registro de tiradas de la campaña, que es
      // otra raíz de consulta (`features/rolls/hooks.ts`).
      void qc.invalidateQueries({ queryKey: ["campaigns", campaignId, "rolls"] });
    },
  });
}

/** La guía de CD del SRD. No cambia mientras la aplicación esté abierta. */
export const guiaDeCdKey = ["catalog", "difficulty-classes"] as const;

export function useGuiaDeCd() {
  return useQuery({
    queryKey: guiaDeCdKey,
    queryFn: () => rollRequestsApi.fetchDifficultyClasses(),
    staleTime: Infinity,
  });
}
