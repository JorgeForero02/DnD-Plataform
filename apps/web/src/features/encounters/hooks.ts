import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StartEncounterInput } from "@dnd/shared";
import * as encountersApi from "./api";
import { SONDEO_DE_RED_DE_SEGURIDAD_MS } from "../../lib/sondeo";

export const currentEncounterKey = (campaignId: string, sessionId: string) =>
  ["encounters", campaignId, sessionId, "current"] as const;

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

export function useEndEncounter(campaignId: string, sessionId: string | undefined) {
  const invalidar = useInvalidar(campaignId, sessionId);
  return useMutation({
    mutationFn: (encounterId: string) =>
      encountersApi.endEncounter(campaignId, sessionId!, encounterId),
    onSuccess: invalidar,
  });
}
