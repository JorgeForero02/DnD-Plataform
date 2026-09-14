import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CombatantSide, GastarInput, StartEncounterInput } from "@dnd/shared";
import * as encountersApi from "./api";
import { SONDEO_DE_RED_DE_SEGURIDAD_MS } from "../../lib/sondeo";
import { rollRequestsKey } from "../roll-requests/hooks";

/**
 * La raíz de todo lo que cuelga de los encuentros de una campaña, **exportada para que
 * `features/live/canal.ts` la use tal cual** — TanStack Query v5 hace coincidir
 * `invalidateQueries({ queryKey })` **por prefijo** salvo `exact: true` (la misma regla que ya
 * usa esa línea con `["campaigns", campaignId]`), así que invalidar esto invalida
 * `currentEncounterKey` de CUALQUIER sesión sin necesitar el `sessionId`, que el aviso del canal
 * no lleva. La ronda de arreglo 1 (2026-09-06) había escrito en su lugar un predicado a mano
 * justificado con «no hay un array exacto que invalidar» — la propia coincidencia por prefijo
 * que este comentario describe ya lo resolvía, así que el predicado no hacía falta y su
 * justificación era falsa. Corregido, y con él `docs/decisiones.md` (E-N-6).
 */
export const encountersKey = (campaignId: string) => ["encounters", campaignId] as const;

export const currentEncounterKey = (campaignId: string, sessionId: string) =>
  [...encountersKey(campaignId), sessionId, "current"] as const;

/**
 * El encuentro activo, resondeado como la sesión: **cada 10 s y al volver a la ventana.**
 *
 * Más a menudo que la sesión (30 s) y por una razón concreta: dentro de un combate lo que cambia
 * es de quién es el turno, y enterarse medio minuto tarde de que te toca a ti sí le arruina la
 * tarde a alguien. Sigue sin ser tiempo real y sigue sin pretenderlo — cuando exista el empujón
 * (fase 4) se sustituye sin tocar nada más.
 */
export function useCurrentEncounter(campaignId: string, sessionId: string | undefined) {
  return useQuery({
    queryKey: currentEncounterKey(campaignId, sessionId ?? ""),
    queryFn: () => encountersApi.fetchCurrentEncounter(campaignId, sessionId!),
    enabled: Boolean(campaignId && sessionId),
    refetchInterval: SONDEO_DE_RED_DE_SEGURIDAD_MS,
    refetchOnWindowFocus: true,
  });
}

function useInvalidar(campaignId: string, sessionId: string | undefined) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: currentEncounterKey(campaignId, sessionId ?? "") });
    // El registro de la mesa también cambia: empezar, pasar turno y terminar escriben sucesos.
    // Se invalida el prefijo entero —`["campaigns", id, "events", …]`— porque el registro se
    // consulta con varias claves a la vez (por sesión, y el DM además «como» otro jugador).
    void qc.invalidateQueries({ queryKey: ["campaigns", campaignId, "events"] });
  };
}

export function useStartEncounter(campaignId: string, sessionId: string | undefined) {
  const invalidar = useInvalidar(campaignId, sessionId);
  return useMutation({
    mutationFn: (input: StartEncounterInput) =>
      encountersApi.startEncounter(campaignId, sessionId!, input),
    onSuccess: invalidar,
  });
}

export function useAdvanceTurn(campaignId: string, sessionId: string | undefined) {
  const invalidar = useInvalidar(campaignId, sessionId);
  return useMutation({
    mutationFn: (encounterId: string) =>
      encountersApi.advanceTurn(campaignId, sessionId!, encounterId),
    onSuccess: invalidar,
  });
}

export function useSetInitiative(campaignId: string, sessionId: string | undefined) {
  const invalidar = useInvalidar(campaignId, sessionId);
  return useMutation({
    mutationFn: (v: { encounterId: string; combatantId: string; initiative: number }) =>
      encountersApi.setInitiative(campaignId, sessionId!, v.encounterId, v.combatantId, {
        initiative: v.initiative,
      }),
    onSuccess: invalidar,
  });
}

/**
 * Tarea 10 — corregir el bando de un combatiente con el combate en marcha. La invalida igual
 * que `useSetInitiative`: cambia el mismo `Encounter` que ya cachea `currentEncounterKey`, no
 * escribe sucesos nuevos que el registro necesite enterarse.
 *
 * **No emite ningún suceso por el canal en vivo** (`features/live/canal.ts`), a diferencia de
 * otras acciones del encuentro (ronda de arreglo 1 sobre la tarea 9b, 2026-09-06, hallazgo del
 * revisor): quien pulsa ve el cambio al momento porque esta invalidación es local, pero los
 * demás navegadores de la mesa siguen viendo el bando viejo hasta el próximo sondeo de
 * `useCurrentEncounter` (`SONDEO_DE_RED_DE_SEGURIDAD_MS`, 10 s) — no hasta que el canal avise.
 */
export function useSetSide(campaignId: string, sessionId: string | undefined) {
  const invalidar = useInvalidar(campaignId, sessionId);
  return useMutation({
    mutationFn: (v: { encounterId: string; combatantId: string; side: CombatantSide }) =>
      encountersApi.setSide(campaignId, sessionId!, v.encounterId, v.combatantId, {
        side: v.side,
      }),
    onSuccess: invalidar,
  });
}

/**
 * Sacar del combate (spec §3.3). Solo la usa el DM (`TiraDeIniciativa.tsx`): el servidor exige
 * `requireDM` y responde 403 a cualquier otro. Invalida igual que `useSetSide` — cambia el mismo
 * `Encounter` y escribe `COMBATANT_LEFT`, que el registro está mirando.
 */
export function useRemoveCombatant(campaignId: string, sessionId: string | undefined) {
  const invalidar = useInvalidar(campaignId, sessionId);
  return useMutation({
    mutationFn: (p: { encounterId: string; combatantId: string }) =>
      encountersApi.removeCombatant(campaignId, sessionId!, p.encounterId, p.combatantId),
    onSuccess: invalidar,
  });
}

export function useEndEncounter(campaignId: string, sessionId: string | undefined) {
  const invalidar = useInvalidar(campaignId, sessionId);
  return useMutation({
    mutationFn: (encounterId: string) =>
      encountersApi.endEncounter(campaignId, sessionId!, encounterId),
    onSuccess: invalidar,
  });
}

/**
 * Las dos que solo existen mientras el encuentro está `PREPARING` (tarea 8, sala de espera):
 * **también invalidan las peticiones de tirada**, además de lo que ya invalida `useInvalidar`.
 * Las dos escriben en `RollRequest` —`forceStart` las resuelve, `cancel` las borra— y sin este
 * segundo `invalidateQueries` la sala de espera seguiría contando pendientes que el servidor ya
 * había cerrado, hasta el siguiente sondeo de `useRollRequests` (quince segundos).
 */
export function useForceStartEncounter(campaignId: string, sessionId: string | undefined) {
  const invalidar = useInvalidar(campaignId, sessionId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (encounterId: string) =>
      encountersApi.forceStartEncounter(campaignId, sessionId!, encounterId),
    onSuccess: () => {
      invalidar();
      void qc.invalidateQueries({ queryKey: rollRequestsKey(campaignId) });
    },
  });
}

/**
 * Paso 2, tarea A3 — gastar la economía del turno propio.
 *
 * **Invalida `currentEncounterKey` desde la ronda de arreglo 1.** `get()` ahora serializa las
 * cuatro columnas de la economía en cada combatiente (`packages/shared/src/encounter.schema.ts`,
 * `encounters.service.ts`), así que la fuente de verdad de «qué me queda» es el propio encuentro
 * sondeado por `useCurrentEncounter` — no un estado local de este gancho. Sin esta invalidación,
 * el gasto tardaría hasta el siguiente sondeo (`SONDEO_DE_RED_DE_SEGURIDAD_MS`) en verse: la
 * misma clase de retraso que la ronda de arreglo 1 encontró real cuando el gasto llegaba por
 * `ActivitiesService.usar` (tarea A11) en vez de por este `PATCH` directo. También invalida el
 * registro: `ACTION_SPENT` escribe un suceso que la mesa está mirando.
 */
export function useGastar(campaignId: string, sessionId: string | undefined) {
  const invalidar = useInvalidar(campaignId, sessionId);
  return useMutation({
    mutationFn: (v: { encounterId: string; combatantId: string } & GastarInput) =>
      encountersApi.spendAction(campaignId, sessionId!, v.encounterId, v.combatantId, {
        coste: v.coste,
        cantidad: v.cantidad,
      }),
    onSuccess: invalidar,
  });
}

export function useCancelEncounter(campaignId: string, sessionId: string | undefined) {
  const invalidar = useInvalidar(campaignId, sessionId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (encounterId: string) =>
      encountersApi.cancelEncounter(campaignId, sessionId!, encounterId),
    onSuccess: () => {
      invalidar();
      void qc.invalidateQueries({ queryKey: rollRequestsKey(campaignId) });
    },
  });
}
