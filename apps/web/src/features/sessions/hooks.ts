import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CloseSessionInput, StampSessionNoteInput, StartSessionInput } from "@dnd/shared";
import { fetchSessions, createSession, updateSession, deleteSession } from "./api";
// Espacio de nombres para que los espías de vitest intercepten las llamadas internas
// (misma trampa documentada en docs/04-convenciones.md).
import * as sessionsApi from "./api";
import * as logApi from "./log-api";
import { SONDEO_DE_RED_DE_SEGURIDAD_MS } from "../../lib/sondeo";
import { sheetKey } from "../character-sheet/hooks";

export const sessionsKey = (campaignId: string) => ["campaigns", campaignId, "sessions"] as const;

export function useSessions(campaignId: string) {
  return useQuery({
    queryKey: sessionsKey(campaignId),
    queryFn: () => fetchSessions(campaignId),
  });
}

/** Una sesión suelta, para su página de lectura (ficha U1, plan 14). */
export function useSession(campaignId: string, sessionId: string) {
  return useQuery({
    queryKey: [...sessionsKey(campaignId), sessionId],
    queryFn: () => sessionsApi.fetchSession(campaignId, sessionId),
    enabled: Boolean(campaignId && sessionId),
  });
}

export function useCreateSession(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof createSession>[1]) => createSession(campaignId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionsKey(campaignId) }),
  });
}

export function useUpdateSession(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { sessionId: string; input: Parameters<typeof updateSession>[2] }) =>
      updateSession(campaignId, vars.sessionId, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionsKey(campaignId) }),
  });
}

export function useDeleteSession(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => deleteSession(campaignId, sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionsKey(campaignId) }),
  });
}

// --- La sesión en juego ---

export const currentSessionKey = (campaignId: string) =>
  [...sessionsKey(campaignId), "current"] as const;

/**
 * La sesión en curso. **Se resondea cada 30 s** y al volver a la ventana.
 *
 * No es tiempo real y no pretende serlo: lo único que cambia aquí es «hay partida o no la hay»,
 * y medio minuto de retraso en enterarse de eso no le arruina la tarde a nadie. Cuando exista
 * el empujón (fase 4), esto se sustituye sin tocar nada más — el modelo no cambia.
 */
export function useCurrentSession(campaignId: string) {
  return useQuery({
    queryKey: currentSessionKey(campaignId),
    queryFn: () => sessionsApi.fetchCurrentSession(campaignId),
    enabled: Boolean(campaignId),
    refetchInterval: SONDEO_DE_RED_DE_SEGURIDAD_MS,
    refetchOnWindowFocus: true,
  });
}

export function useStartSession(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { sessionId: string; attendance?: StartSessionInput["attendance"] }) =>
      sessionsApi.startSession(campaignId, v.sessionId, { attendance: v.attendance }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: sessionsKey(campaignId) }),
  });
}

export function useCloseSession(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      sessionId: string;
      recap?: string;
      // Task 27 (P3, ronda del orquestador) — el tipo de `CloseSessionInput`, no el `Visibility`
      // genérico: `recapVisibility` ya no admite `SPECIFIC_PLAYERS`/`OWNER_DM` en el contrato, y
      // este hook no debe prometer un tipo más ancho que el que la API de verdad acepta.
      recapVisibility?: CloseSessionInput["recapVisibility"];
    }) =>
      sessionsApi.closeSession(campaignId, v.sessionId, {
        recap: v.recap,
        recapVisibility: v.recapVisibility ?? "PLAYERS",
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: sessionsKey(campaignId) }),
  });
}

export function useStampNote(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StampSessionNoteInput) => sessionsApi.stampSessionNote(campaignId, input),
    // Un sello es una línea del log: lo que hay que refrescar es el log, no la sesión.
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["campaigns", campaignId, "events"] }),
  });
}

export const gameLogKey = (campaignId: string, sessionId?: string, as?: string) =>
  ["campaigns", campaignId, "events", sessionId ?? "todas", as ?? "yo"] as const;

/**
 * El log de la partida. Se resondea cada 15 s mientras hay sesión: es lo único que cambia por
 * lo que hacen otros, y quedarse con un registro viejo en mitad de una partida es peor que
 * pedirlo de más. Sigue sin ser tiempo real, y no lo finge.
 */
export function useGameLog(campaignId: string, opciones: { sessionId?: string; as?: string } = {}) {
  return useQuery({
    queryKey: gameLogKey(campaignId, opciones.sessionId, opciones.as),
    queryFn: () => logApi.fetchGameEvents(campaignId, opciones),
    enabled: Boolean(campaignId),
    refetchInterval: SONDEO_DE_RED_DE_SEGURIDAD_MS,
  });
}

/**
 * El reloj de la mesa, **con un solo tic por minuto**.
 *
 * Lo usan la barra y la cabecera de la mesa, y por eso vive aquí en vez de en una de las dos:
 * eran dos `setInterval` idénticos y el segundo se escribió copiando el primero. Ni segundos ni
 * `setInterval` de un segundo — en la mesa nadie mira los segundos, y una cifra parpadeando en la
 * cabecera molesta durante cuatro horas seguidas.
 *
 * `activo` apaga el intervalo cuando no hay partida: un temporizador corriendo sin nada que
 * contar es una re-renderización por minuto en todas las pantallas de la aplicación.
 */
export function useMinutoActual(activo: boolean): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!activo) return;
    const t = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [activo]);
  return ahora;
}

// --- La bandeja de daño (tarea 7 de la puerta de efectos, spec §4 bis §4b.5) ---

export const damagePreviewKey = (campaignId: string, rollEventId: string) =>
  ["campaigns", campaignId, "rolls", rollEventId, "damage-preview"] as const;

/**
 * El preview de la bandeja. **`retry: false`, explícito**: un 404 es la respuesta esperada para
 * quien no puede aplicar (§4b.5), no un fallo de red que merezca reintentarse. El `queryClient`
 * de la aplicación ya trae `retry: false` por defecto, así que aquí no cambia nada — se deja
 * escrito porque esta consulta lo NECESITA, y si algún día el defecto global cambia, esta no.
 *
 * `error` viaja tal cual en el resultado de la consulta: es `BandejaDeDano` quien decide que un
 * 404 se lee como «no hay preview que enseñar» y cualquier otro código como fallo de verdad —
 * aquí no se filtra nada, porque distinguir eso es su trabajo, no el de este hook.
 */
export function useDamagePreview(campaignId: string, rollEventId: string, enabled: boolean) {
  return useQuery({
    queryKey: damagePreviewKey(campaignId, rollEventId),
    queryFn: () => sessionsApi.fetchDamagePreview(campaignId, rollEventId),
    enabled,
    retry: false,
  });
}

/**
 * El clic de «Aplicar». Al conseguirlo invalida el log —el `HP_CHANGED` nuevo tiene que verse— y
 * la hoja del objetivo —sus PG cambiaron—, exactamente el mismo par que ya invalida
 * `character-sheet/hooks.ts` para cualquier otra mutación que toque PG. **Y el propio preview**
 * (ola de arreglos 1): sin esto, con `staleTime` de 30 s y la `<li>` sin remontar, `canApply`
 * seguía en `true`, el botón se quedaba y un segundo clic devolvía el 409 «ya se aplicó» como si
 * fuera un error.
 */
export function useApplyDamage(campaignId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { rollEventId: string; targetCharacterId: string }) =>
      sessionsApi.applyDamage(campaignId, v.rollEventId),
    onSuccess: (_data, v) => {
      void qc.invalidateQueries({ queryKey: ["campaigns", campaignId, "events"] });
      void qc.invalidateQueries({ queryKey: sheetKey(campaignId, v.targetCharacterId) });
      void qc.invalidateQueries({ queryKey: damagePreviewKey(campaignId, v.rollEventId) });
    },
  });
}
