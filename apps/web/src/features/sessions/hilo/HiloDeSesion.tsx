import { Fragment, useEffect, useState } from "react";
import type { SessionNoteKind } from "@dnd/shared";
import type { GameEventRow } from "../log-api";
import { useStampNote } from "../hooks";
import { ICONO_SELLO, NOMBRE_SELLO, SELLOS_EN_ORDEN } from "../vocabulario";
import { IconoRegistro } from "../iconos";
import { horaDe, lineaDeLog, selloDeSuceso } from "../linea-de-log";
import { fraseDeLoPerdido, loQueTePerdiste, marcarVisto, ultimoVisto } from "../reincorporarse";
import { PanelDeMesa } from "../PanelDeMesa";
import { useMembers } from "../../campaigns/members";
import type { Member } from "../../campaigns/members";
import { Button } from "../../../ui/Button";
import { fieldControlClass } from "../../../ui/Field";
import { Badge } from "../../../ui/Badge";

// **Ola 0 (2026-09-04): el registro sale de `MesaDeSesion.tsx` y pasa a ser el carril del hilo.**
//
// Movido sin retocar la forma, con dos cambios de armazón y ninguno de comportamiento:
//
//  1. **El hilo scrollea por dentro** (`scroll-quiet min-h-0 flex-1 overflow-y-auto`) y el
//     compositor de abajo **queda fuera de ese scroll**. Antes todo crecía y empujaba la página.
//  2. `min-h-0` en la lista, sin el cual el `overflow-y-auto` de arriba no se activa nunca.
//
// Lo que le falta, y es el encargo del carril (auditoría 2026-09-04, §1): **cinco tipos de
// mensaje** —narración con capitular, personaje con su color de voz, sistema en cursiva, sello
// con reglas de cobre a los lados, y tirada incrustada con «De dónde sale»— en vez de la lista
// plana de chip + frase + autor + hora que hay aquí.

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

  const poner = async (kind: SessionNoteKind) => {
    setError(null);
    try {
      await sellar.mutateAsync({
        kind,
        text: texto.trim() || undefined,
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
          nombres que los chips de las líneas, así que sin una lista que se pueda nombrar una
          prueba no distingue «el chip dice Hallazgo» de «hay un botón de Hallazgo». Esa
          confusión dejó pasar una mutación real. */}
      <ol
        aria-label="Sucesos de la sesión"
        className="scroll-quiet flex min-h-0 flex-1 flex-col overflow-y-auto px-s3 py-s3"
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
          const sello = selloDeSuceso(e.payload);
          return (
            <Fragment key={e.id}>
              {franja}
              {/* El identificador va al DOM porque la marca de lectura vive en el navegador y
                  la única forma de comprobar la franja en un recorrido es poder decir «da por
                  visto ESTE». Es dato, no adorno. */}
              <li
                data-suceso={e.id}
                className="flex shrink-0 items-start gap-s2 border-b border-muted py-s2 last:border-b-0"
              >
                {sello ? (
                  <span className="mt-0.5 shrink-0 rounded-radius-sm border border-copper px-1.5 py-0.5 font-data text-chrome-xs text-copper-text">
                    {NOMBRE_SELLO[sello]}
                  </span>
                ) : (
                  // Un hueco del mismo ancho que no dice nada: las líneas sin chip se alinean con
                  // las que sí lo tienen en vez de quedar dentadas.
                  <span aria-hidden="true" className="mt-0.5 w-s6 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-world text-[length:var(--text-world-sm)] leading-snug text-text">
                    {lineaDeLog(e.payload)}
                  </p>
                  <p className="mt-0.5 font-data text-chrome-xs text-muted">
                    {nombreDe.get(e.actorUserId) ?? "Alguien"} · {horaDe(e.createdAt)}
                  </p>
                </div>
                <Badge visibility={e.visibility} />
              </li>
            </Fragment>
          );
        })}
      </ol>

      {/* El compositor: **fuera del scroll**, siempre a la vista. Es lo que la maqueta hace y
          la versión anterior no podía hacer, porque el hilo no scrolleaba por dentro. */}
      <div className="shrink-0 border-t border-muted px-s3 py-s3">
        <div className="flex flex-wrap items-center gap-1.5">
          {SELLOS_EN_ORDEN.map((kind) => {
            const Icono = ICONO_SELLO[kind];
            return (
              <Button
                key={kind}
                type="button"
                variant="ghost"
                className="flex items-center gap-1.5 px-2 py-1 text-chrome-xs"
                disabled={sellar.isPending}
                onClick={() => void poner(kind)}
              >
                <Icono className="h-4 w-4" />
                {NOMBRE_SELLO[kind]}
              </Button>
            );
          })}
        </div>
        <div className="mt-s2 flex flex-wrap items-center gap-s2">
          <input
            aria-label="Qué anotar"
            placeholder="…y en dos palabras, qué pasó"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className={`${fieldControlClass} min-w-0 flex-1`}
          />
          <label className="flex items-center gap-1.5 font-chrome text-chrome-xs text-muted">
            <input
              type="checkbox"
              checked={soloDm}
              onChange={(e) => setSoloDm(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Solo el DM
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-1 font-chrome text-chrome-xs text-danger-text">
            {error}
          </p>
        )}
      </div>
    </PanelDeMesa>
  );
}
