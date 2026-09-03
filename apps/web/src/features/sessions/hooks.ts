import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StampSessionNoteInput, StartSessionInput, Visibility } from "@dnd/shared";
import { fetchSessions, createSession, updateSession, deleteSession } from "./api";
// Espacio de nombres para que los espías de vitest intercepten las llamadas internas
// (misma trampa documentada en docs/04-convenciones.md).
import * as sessionsApi from "./api";
import * as logApi from "./log-api";

export const sessionsKey = (campaignId: string) => ["campaigns", campaignId, "sessions"] as const;

export function useSessions(campaignId: string) {
  return useQuery({
    queryKey: sessionsKey(campaignId),
    queryFn: () => fetchSessions(campaignId),
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
    refetchInterval: 30_000,
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
    mutationFn: (v: { sessionId: string; recap?: string; recapVisibility?: Visibility }) =>
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
    refetchInterval: 15_000,
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
