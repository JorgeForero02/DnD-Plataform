import { useMemo } from "react";
import { useAllEntities } from "../../../entities/hooks";
import type { Entity } from "../../../entities/api";
import { useCampaignLinks } from "../../../links/hooks";
import { DesgloseDelMundo } from "./DesgloseDelMundo";
import { DetalleDeFicha } from "./DetalleDeFicha";
import { arbolDelMundo } from "./arbolDelMundo";

// **El mundo, en dos mitades** (Task 14 bis, D-CF-64): a la izquierda el desglose, a la derecha
// el detalle de la ficha elegida. Sustituye al tablero telaraña (D4) en la columna izquierda del
// taller; el mapa de historia que el plan del 2026-09-02 prometía en su lugar **lo aplazó el
// autor** el 2026-09-12 tras ver cuatro maquetas.
//
// Lee el mundo una vez (`useAllEntities`) y los hilos una vez (`useCampaignLinks`,
// `GET /campaigns/:id/links`, Task 22): las dos listas llegan filtradas por `canView` desde el
// servidor y aquí no se filtra nada más. El árbol es una función pura de las dos
// (`arbolDelMundo`), así que se vuelve a calcular solo cuando alguna cambia.
//
// `lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]`: dos columnas desde 1024 px, y en estrecho el
// detalle va DEBAJO del desglose. Los `minmax(0, …)` no son adorno: sin ellos una ficha con
// nombre largo ensancha la columna y la mesa se sale de la ventana.

export function ElMundo({
  campaignId,
  seleccionId,
  onSeleccion,
}: {
  campaignId: string;
  seleccionId: string | null;
  /** Recibe la ficha entera: es lo que la solapa «Escribir ficha» del taller necesita. */
  onSeleccion: (ficha: Entity) => void;
}) {
  const fichas = useAllEntities(campaignId);
  const hilos = useCampaignLinks(campaignId);

  const entidades = useMemo(() => fichas.data ?? [], [fichas.data]);
  const enlaces = useMemo(() => hilos.data ?? [], [hilos.data]);
  const arbol = useMemo(() => arbolDelMundo(entidades, enlaces), [entidades, enlaces]);

  const elegirPorId = (id: string) => {
    const ficha = entidades.find((e) => e.id === id);
    if (ficha) onSeleccion(ficha);
  };

  const seleccionada = seleccionId ? (entidades.find((e) => e.id === seleccionId) ?? null) : null;

  if (fichas.isError) {
    return (
      <p className="rounded-radius-sm border border-danger p-s3 font-chrome text-chrome-sm text-danger-text">
        No se pudo leer el mundo de esta campaña. Un desglose vacío aquí no significaría que no hay
        fichas, así que no se pinta.
      </p>
    );
  }

  if (fichas.isLoading) {
    return <p className="font-chrome text-chrome-sm text-muted">Leyendo el mundo…</p>;
  }

  return (
    <div className="grid min-h-0 gap-s4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex min-h-0 min-w-0 flex-col">
        <DesgloseDelMundo arbol={arbol} seleccionId={seleccionId} onSeleccion={elegirPorId} />
        {hilos.isError && (
          <p className="mt-s2 font-chrome text-chrome-xs text-danger-text">
            No se pudieron leer los hilos: el desglose enseña las fichas sueltas, sin colgar.
          </p>
        )}
      </div>
      <div className="min-w-0">
        <DetalleDeFicha
          campaignId={campaignId}
          ficha={seleccionada}
          entidades={entidades}
          hilos={enlaces}
          onSeleccion={elegirPorId}
        />
      </div>
    </div>
  );
}
