import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../lib/api";
import { notificationsKey } from "../notifications/hooks";

// Plan 12 · 12.3 (D-OP-22) — **el nervio en vivo, en el navegador.**
//
// Por el canal llega **un aviso, no un dato**: «algo ha cambiado en esta mesa». Lo único que hace
// esta pieza es **invalidar lo que ya estaba escrito** para que TanStack Query lo recargue por la
// ruta autorizada de siempre, donde `canView` sigue mandando. **No hay un camino nuevo de
// recarga**: la aplicación tiene 93 invalidaciones escritas y este canal se enchufa a ellas.
//
// El sondeo **no se quita**: se queda de red de seguridad a 60 s (`lib/sondeo.ts`). Un canal que
// se cae en silencio con el sondeo quitado es peor que no tener canal.

/** Lo que manda el servidor. Agnóstico del transporte: el WebSocket de la fase 3.C manda esto mismo. */
export interface AvisoEnVivo {
  type: string;
  campaignId: string;
  subjectType?: string;
  subjectId?: string;
}

/**
 * **El interruptor, y existe para las pruebas.** Un canal abierto hace a Playwright intermitente:
 * la conexión sobrevive al final del caso y el servidor sigue escribiendo en ella. Se apaga por
 * `localStorage` —que es lo que un `addInitScript` puede fijar antes de que cargue la
 * aplicación— y no por variable de compilación, porque entonces habría que compilar dos veces.
 */
export function canalApagado(): boolean {
  try {
    return window.localStorage.getItem("canal-en-vivo") === "off";
  } catch {
    // Un navegador con el almacenamiento capado no puede apagar el canal, y eso está bien: el
    // valor por defecto es tenerlo encendido.
    return false;
  }
}

async function pedirBillete(campaignId: string): Promise<string> {
  const { ticket } = await apiFetch<{ ticket: string }>(`/campaigns/${campaignId}/live/ticket`, {
    method: "POST",
  });
  return ticket;
}

/**
 * Abre el canal de una mesa mientras el componente esté montado.
 *
 * **Cerrar al desmontar es la mitad del trabajo**: `EventSource` reconecta solo, y una mesa
 * abierta seis horas acumulando suscripciones se come el servidor.
 */
export function useCanalEnVivo(campaignId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!campaignId || canalApagado()) return;
    let fuente: EventSource | null = null;
    let cancelado = false;

    void (async () => {
      let ticket: string;
      try {
        ticket = await pedirBillete(campaignId);
      } catch {
        // Sin billete no hay canal, y no pasa nada: queda el sondeo. Un error aquí no puede
        // romper la pantalla que se estaba pintando.
        return;
      }
      if (cancelado) return;
      fuente = new EventSource(`/api/live/${campaignId}?ticket=${encodeURIComponent(ticket)}`);
      fuente.onmessage = (evento) => {
        let aviso: AvisoEnVivo;
        try {
          aviso = JSON.parse(evento.data) as AvisoEnVivo;
        } catch {
          return;
        }
        if (aviso.campaignId !== campaignId) return;
        // **Todo lo de esta mesa, de una vez.** Afinar por tipo sería mantener un mapa de
        // «qué suceso toca qué consulta» que envejece cada vez que alguien añade una pantalla,
        // y el que se olvide **no da error**: da un dato viejo en pantalla. La clave jerárquica
        // ya acota a la campaña, así que esto no recarga nada de otra mesa.
        void qc.invalidateQueries({ queryKey: ["campaigns", campaignId] });
        void qc.invalidateQueries({ queryKey: notificationsKey });
        // **El encuentro en curso queda fuera del prefijo de arriba, y sin esto la sala de
        // espera (tarea 8) se quedaba muerta**: `currentEncounterKey`
        // (`features/encounters/hooks.ts`) es `["encounters", campaignId, sessionId, "current"]`
        // — empieza en `"encounters"`, no en `"campaigns"` — así que el DM veía «0 de 3» hasta el
        // siguiente sondeo de 10 s (`SONDEO_DE_RED_DE_SEGURIDAD_MS`) aunque los tres ya hubieran
        // tirado. **Por predicado y no realineando la clave**: `currentEncounterKey` no lleva el
        // `sessionId` en el aviso —el servidor solo manda `campaignId`— así que no hay un array
        // exacto que invalidar, y cambiar su prefijo tocaría cada mutación de
        // `features/encounters/hooks.ts` (pasar turno, terminar, empezar igualmente, cancelar)
        // para ganar un requisito que un predicado resuelve sin tocar ninguna.
        void qc.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === "encounters" && query.queryKey[1] === campaignId,
        });
      };
    })();

    return () => {
      cancelado = true;
      fuente?.close();
    };
  }, [campaignId, qc]);
}
