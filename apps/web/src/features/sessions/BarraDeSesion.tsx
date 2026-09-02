import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { SessionNoteKind } from "@dnd/shared";
import { useCurrentSession, useStampNote } from "./hooks";
import { ICONO_SELLO, NOMBRE_SELLO, SELLOS_EN_ORDEN, duracionDesde } from "./vocabulario";
import { IconoEnJuego } from "./iconos";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";

// La barra de «en juego».
//
// **Por qué una barra global y no una pantalla.** La investigación de once VTT dejó un patrón sin
// excepciones: el estado «se está jugando» se comunica con **un solo elemento persistente**, no
// con un rediseño — la pausa de Foundry, el nombre de escena de Alchemy en la cabecera de todos.
// Y aquí resolvía además un fallo activo: la API distingue tres estados de sesión desde 2A.5 y
// **ninguna pantalla los enseñaba**, así que nadie empezaba una sesión y **todo el combate se
// grababa fuera de sesión** — `GET /events?sessionId=…` devolvía dos sucesos de diecinueve. Lo
// descubrió un DM dirigiendo una partida de prueba.
//
// **`AppShell` decide si montarla, mirando la ruta.** No basta con que se calle sola: consultar
// la sesión es una llamada de datos, y `/acerca-de` es una pantalla PÚBLICA que se monta sin
// cliente de consultas. Montarla siempre convertía el armazón en algo que exige ese cliente, y
// la suite lo cazó al instante. Vive bajo campaña, así que fuera de campaña ni se monta.

export function BarraDeSesion({ campaignId }: { campaignId: string }) {
  const { data: sesion } = useCurrentSession(campaignId);
  const [abierto, setAbierto] = useState(false);
  // El cronómetro se recalcula solo cada minuto. Ni segundos ni `setInterval` de un segundo:
  // en la mesa nadie mira los segundos, y un número parpadeando en la cabecera molesta.
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!sesion) return;
    const t = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [sesion]);

  if (!sesion) return null;

  return (
    <>
      <div
        role="status"
        aria-label="Sesión en curso"
        className="sticky top-0 z-30 border-b border-copper bg-surface"
      >
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-s3 px-s4 py-1.5">
          <span className="flex items-center gap-s2 font-chrome text-chrome-xs font-semibold uppercase tracking-[0.14em] text-copper-text">
            <IconoEnJuego className="h-2.5 w-2.5" />
            En juego
          </span>
          <span className="min-w-0 flex-1 truncate font-chrome text-chrome-sm text-text">
            {sesion.title}
          </span>
          <span className="font-data text-chrome-xs text-muted">
            {duracionDesde(sesion.startedAt, ahora)}
          </span>
          <Button
            type="button"
            variant="ghost"
            className="px-2 py-0.5 text-chrome-xs"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
          >
            Anotar
          </Button>
          <Link
            to={`/campaigns/${campaignId}/sesion`}
            className="font-chrome text-chrome-xs text-accent-text underline"
          >
            Ir a la mesa
          </Link>
        </div>
      </div>
      {abierto && <PanelDeSellos campaignId={campaignId} onCerrar={() => setAbierto(false)} />}
    </>
  );
}

/**
 * Los sellos rápidos.
 *
 * **La idea entera es que escribir cuesta y pulsar no.** Un DM dirigiendo no va a redactar; sí
 * va a dar un golpe a un botón. Y como el sello lleva su clase, el resumen que se escribe al
 * cerrar sale **ya agrupado** en vez de ser un muro de texto que nadie relee.
 *
 * El texto es opcional a propósito: el sello solo ya cuenta algo.
 */
function PanelDeSellos({ campaignId, onCerrar }: { campaignId: string; onCerrar: () => void }) {
  const sellar = useStampNote(campaignId);
  const [texto, setTexto] = useState("");
  const [soloDm, setSoloDm] = useState(false);
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const poner = async (kind: SessionNoteKind) => {
    setError(null);
    try {
      await sellar.mutateAsync({
        kind,
        text: texto.trim() || undefined,
        visibility: soloDm ? "DM_ONLY" : "PLAYERS",
      });
      setUltimo(NOMBRE_SELLO[kind]);
      setTexto("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div
      role="region"
      aria-label="Anotar en la sesión"
      className="sticky top-9 z-20 border-b border-muted/40 bg-surface"
    >
      <div className="mx-auto max-w-[1400px] px-s4 py-s2">
        <div className="flex flex-wrap items-center gap-s2">
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
          <label className="ml-auto flex items-center gap-1.5 font-chrome text-chrome-xs text-muted">
            <input
              type="checkbox"
              checked={soloDm}
              onChange={(e) => setSoloDm(e.target.checked)}
              className="accent-[var(--accent)]"
            />
            Solo el DM lo ve
          </label>
          <Button
            type="button"
            variant="ghost"
            className="px-2 py-1 text-chrome-xs"
            onClick={onCerrar}
          >
            Cerrar
          </Button>
        </div>
        <input
          aria-label="Qué anotar"
          placeholder="…y si quieres, en dos palabras qué pasó"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className={`${fieldControlClass} mt-s2`}
        />
        {/* El número que cambia ES la confirmación: aquí no cambia nada visible, así que hace
            falta decirlo. Una línea, no un aviso flotante — los flotantes se van antes de que
            un lector de pantalla los lea. */}
        {ultimo && !error && (
          <p role="status" className="mt-1 font-chrome text-chrome-xs text-muted">
            Anotado: {ultimo}.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-1 font-chrome text-chrome-xs text-danger-text">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
