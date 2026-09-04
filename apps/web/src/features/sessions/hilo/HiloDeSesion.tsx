import { Fragment, useEffect, useState } from "react";
import type { GameEventPayload, SessionNoteKind } from "@dnd/shared";
import type { GameEventRow } from "../log-api";
import { useStampNote } from "../hooks";
import { ICONO_SELLO, NOMBRE_SELLO, SELLOS_EN_ORDEN } from "../vocabulario";
import { IconoRegistro } from "../iconos";
import { fraseDeLoPerdido, loQueTePerdiste, marcarVisto, ultimoVisto } from "../reincorporarse";
import { PanelDeMesa } from "../PanelDeMesa";
import { useMembers } from "../../campaigns/members";
import type { Member } from "../../campaigns/members";
import { Button } from "../../../ui/Button";
import { MensajeDelHilo } from "./MensajeDelHilo";
import { IconoPluma } from "./iconos-del-hilo";

// **El hilo de la sesión: los cinco tipos de mensaje de la maqueta, no una lista plana.**
//
// La Ola 0 movió aquí el registro que vivía en `MesaDeSesion.tsx` y lo dejó scrollando por
// dentro, con el compositor fuera del scroll. Lo que hace esta tanda es lo que faltaba, y es el
// §1 de la auditoría del 2026-09-04: la lista de chip + frase + autor + hora se sustituye por
// **narración con capitular, personaje con su color de voz, sistema en cursiva, sello con reglas
// de cobre y tirada incrustada con «De dónde sale»**, copiados de
// `prototipo/src/features/HiloDeSesion.tsx` y `TiradaIncrustada.tsx`. La forma de cada uno vive
// en `MensajeDelHilo.tsx`; qué forma le toca a cada suceso, en `tipo-de-mensaje.ts`.
//
// **Y el sello sin texto ya no se manda.** Era el defecto de `MesaDeSesion.tsx:793-805`: pulsar
// «Nota» escribía en el registro una entrada que decía «Nota», porque el texto viajaba como
// `undefined` y nadie lo impedía. Los seis botones son el envío —cada uno manda con su clase—,
// así que se deshabilitan sin texto, que es lo que hace la maqueta con su botón de enviar.
//
// **Lo que NO se toca**, porque son datos de comportamiento probados y no maquetación: la franja
// de «esto te perdiste» con su `role="separator"` y su marca congelada al montar, el `data-suceso`
// de cada línea, el aviso de «ver como», y las puertas de datos (`hooks.ts`, `log-api.ts`).

/**
 * El registro en vivo, y debajo lo que se usa para escribirlo.
 *
 * Es el centro de la pantalla porque es la partida.
 *
 * **Los sellos los pone cualquier miembro**, no solo el DM: un registro que solo escribe el DM se
 * queda vacío, y es la crítica más repetida a estas herramientas.
 */
export function HiloDeSesion({
  campaignId,
  eventos,
  esDm,
  comoUsuario,
}: {
  campaignId: string;
  eventos: GameEventRow[];
  esDm: boolean;
  comoUsuario: string;
}) {
  const { data: miembros } = useMembers(campaignId);
  const sellar = useStampNote(campaignId);
  const [texto, setTexto] = useState("");
  const [soloDm, setSoloDm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nombreDe = new Map((miembros ?? []).map((m: Member) => [m.userId, m.displayName]));

  // **La marca se congela al montar, a propósito.** Si se releyera en cada sondeo, la franja
  // desaparecería a los quince segundos —justo cuando alguien vuelve a la mesa y todavía no ha
  // leído nada—. Se lee una vez al llegar y se queda mientras estés en la pantalla; lo que se
  // actualiza en el almacenamiento es el suceso más reciente, para la PRÓXIMA vez que vuelvas.
  const [marca] = useState(() => ultimoVisto(campaignId));
  const perdido = loQueTePerdiste(eventos, marca);

  useEffect(() => {
    if (eventos.length > 0) marcarVisto(campaignId, eventos[0].id);
  }, [campaignId, eventos]);

  // **Qué es «nuevo» para la animación de entrada**: lo que pasó DESPUÉS de que abrieras la mesa.
  // El registro que ya estaba cuando llegaste no surge —treinta mensajes surgiendo a la vez al
  // abrir dejarían de significar «esto acaba de pasar»—; lo que trae el sondeo de los quince
  // segundos, sí.
  //
  // Se decide con la fecha del propio suceso contra el instante en que se montó la pantalla, y no
  // llevando la cuenta de los identificadores ya vistos: una cuenta así vive en una referencia que
  // habría que leer al pintar (`react-hooks/refs` lo prohíbe) o en un estado que habría que
  // escribir desde un efecto (`react-hooks/set-state-in-effect` lo prohíbe). Comparar dos fechas
  // es puro, no necesita ninguna de las dos cosas, y falla bien: si el reloj del navegador va
  // atrasado respecto al del servidor, lo peor que pasa es que un mensaje viejo entre con
  // animación una vez.
  const [abiertaEn] = useState(() => Date.now());
  const esNuevo = (creadoEn: string) => {
    const fecha = Date.parse(creadoEn);
    return !Number.isNaN(fecha) && fecha > abiertaEn;
  };

  // Un ataque no trae números propios: los toma de la tirada que lo produjo, si esa tirada está
  // en la ventana del registro que se ha pedido y este espectador puede verla.
  const porId = new Map<string, GameEventPayload>(eventos.map((e) => [e.id, e.payload]));
  const tiradaLigada = (p: GameEventPayload) =>
    p.type === "ATTACK_RESOLVED" ? (porId.get(p.rollEventId) ?? null) : null;

  const hayTexto = texto.trim().length > 0;

  const poner = async (kind: SessionNoteKind) => {
    setError(null);
    try {
      await sellar.mutateAsync({
        kind,
        text: texto.trim(),
        visibility: soloDm ? "DM_ONLY" : "PLAYERS",
      });
      setTexto("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <PanelDeMesa
      etiqueta="Registro de la sesión"
      titulo="Registro en vivo"
      icono={<IconoRegistro className="h-4 w-4" />}
      cuerpoClassName="flex min-h-0 flex-col"
    >
      {esDm && comoUsuario && (
        <p className="mx-s3 mt-s3 shrink-0 rounded-radius-sm border border-copper px-s2 py-1 font-chrome text-chrome-xs text-copper-text">
          Estás viendo lo que ve ese jugador. No es una simulación: el servidor filtra igual que
          para él, así que ves <strong>menos</strong>, nunca más.
        </p>
      )}

      {/* Con nombre accesible a propósito: los seis botones de sellar repiten los mismos
          nombres que los títulos de los sellos del hilo, así que sin una lista que se pueda
          nombrar una prueba no distingue «el sello dice Hallazgo» de «hay un botón de
          Hallazgo». Esa confusión dejó pasar una mutación real. */}
      <ol
        aria-label="Sucesos de la sesión"
        className="scroll-quiet flex min-h-0 flex-1 flex-col overflow-y-auto px-s5 py-s4"
      >
        {eventos.length === 0 && (
          <li className="font-chrome text-chrome-sm text-muted">
            Todavía no ha pasado nada en esta sesión.
          </li>
        )}
        {eventos.map((e) => {
          // La franja va **encima** del primer suceso que no viste, así que se pinta antes de
          // su línea. `role="separator"` y no un `<li>` de texto: es una marca de lectura, no
          // un suceso más de la partida, y confundirlos en la lista sería mentir sobre lo que
          // pasó en la mesa.
          const franja =
            perdido.desde === e.id ? (
              <li
                key={`${e.id}-franja`}
                role="separator"
                aria-label={fraseDeLoPerdido(perdido.cuantos)}
              >
                <p className="my-s2 flex items-center gap-s2 font-chrome text-chrome-xs uppercase tracking-widest text-copper-text">
                  <span aria-hidden="true" className="h-px flex-1 bg-copper" />
                  {fraseDeLoPerdido(perdido.cuantos)}
                  <span aria-hidden="true" className="h-px flex-1 bg-copper" />
                </p>
              </li>
            ) : null;
          return (
            <Fragment key={e.id}>
              {franja}
              <MensajeDelHilo
                evento={e}
                autor={nombreDe.get(e.actorUserId) ?? "Alguien"}
                ligada={tiradaLigada(e.payload)}
                nuevo={esNuevo(e.createdAt)}
              />
            </Fragment>
          );
        })}
      </ol>

      {/* El compositor: **fuera del scroll**, siempre a la vista, y con la pluma delante como en
          la maqueta. Los seis botones son el envío, uno por clase de sello. */}
      <form
        className="shrink-0 border-t border-muted px-s5 py-s3"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex items-end gap-s2">
          <IconoPluma className="mb-s2 h-5 w-5 shrink-0 text-copper-text" />
          <textarea
            aria-label="Qué anotar"
            placeholder="…y en dos palabras, qué pasó"
            rows={1}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="scroll-quiet max-h-28 min-h-[2.4rem] min-w-0 flex-1 resize-none rounded-radius-sm border border-muted/30 bg-bg px-s3 py-s2 font-world text-world-base text-text placeholder:text-muted focus:border-accent"
          />
          <label className="mb-s2 flex shrink-0 items-center gap-1.5 font-chrome text-chrome-xs text-muted">
            <input
              type="checkbox"
              checked={soloDm}
              onChange={(e) => setSoloDm(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Solo el DM
          </label>
        </div>
        <div className="mt-s2 flex flex-wrap items-center gap-1.5">
          {SELLOS_EN_ORDEN.map((kind) => {
            const Icono = ICONO_SELLO[kind];
            return (
              <Button
                key={kind}
                type="button"
                variant="ghost"
                className="flex items-center gap-1.5 px-2 py-1 text-chrome-xs"
                disabled={sellar.isPending || !hayTexto}
                onClick={() => void poner(kind)}
              >
                <Icono className="h-4 w-4" />
                {NOMBRE_SELLO[kind]}
              </Button>
            );
          })}
        </div>
        {error && (
          <p role="alert" className="mt-1 font-chrome text-chrome-xs text-danger-text">
            {error}
          </p>
        )}
      </form>
    </PanelDeMesa>
  );
}
