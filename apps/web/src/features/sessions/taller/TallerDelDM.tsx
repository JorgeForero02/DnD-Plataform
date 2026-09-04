import { useState } from "react";
import { Tabs } from "../../../ui/Tabs";
import { useAllEntities } from "../../entities/hooks";
import type { Entity } from "../../entities/api";
import { TableroTelarana } from "./TableroTelarana";
import { EscribirFicha } from "./EscribirFicha";
import { PrepararSesion } from "./PrepararSesion";
import { LoQueSabeLaMesa } from "./LoQueSabeLaMesa";
import { IconoOjo, IconoPluma, IconoReloj } from "./iconos";

// **El taller del DM: lo que ocupa la mesa cuando el DM está en reposo.**
//
// No es una ruta. `MesaDeSesion` lo monta en lugar del elenco y el hilo cuando el DM no tiene
// sesión abierta, y ocupa la mesa entera con `grid-cols-[1.15fr_1fr]` (§5 de la auditoría del
// 2026-09-04, copiado literal de la maqueta).
//
// A la izquierda **el tablero telaraña**: chinchetas e hilos de cobre entre las fichas enlazadas.
// A la derecha **tres solapas**: escribir una ficha, preparar la sesión, y ver lo que sabe la
// mesa. Pulsar una chincheta trae esa ficha a la solapa de escribir, que es lo que promete el
// rótulo de la maqueta: *«Pulsa una ficha para editarla»*.
//
// **Este fichero solo compone.** El mundo se lee una vez aquí —`useAllEntities`— y se reparte por
// props, para que el tablero y las dos solapas que lo necesitan no pidan tres veces lo mismo;
// react-query lo deduplicaría de todos modos, pero repartirlo deja escrito quién depende de qué.
//
// Las dos reglas de armazón que le tocan a esta pieza: **`min-h-0` en todos los ancestros** que
// scrollean —sin él el `overflow-y-auto` de los paneles no se activa jamás—, y **scroll por
// panel, nunca de página**, con `.scroll-quiet`.

export function TallerDelDM({ campaignId }: { campaignId: string }) {
  const [elegida, setElegida] = useState<Entity | null>(null);
  const fichas = useAllEntities(campaignId);

  // La ficha elegida se vuelve a leer de la lista fresca: después de guardar, lo que hay en el
  // estado local es la versión de antes del guardado.
  const enElMundo = elegida ? (fichas.data ?? []).find((f) => f.id === elegida.id) : undefined;
  const seleccionada = enElMundo ?? elegida;

  const solapas = [
    {
      id: "escribir",
      label: "Escribir ficha",
      icon: <IconoPluma />,
      content: (
        <EscribirFicha
          campaignId={campaignId}
          ficha={seleccionada}
          onGuardada={(guardada) => setElegida(guardada)}
          onBorrada={() => setElegida(null)}
        />
      ),
    },
    {
      id: "preparar",
      label: "Preparar sesión",
      icon: <IconoReloj />,
      content: <PrepararSesion campaignId={campaignId} />,
    },
    {
      id: "sabe",
      label: "Lo que sabe la mesa",
      icon: <IconoOjo />,
      content: <LoQueSabeLaMesa campaignId={campaignId} />,
    },
  ];

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[1.15fr_1fr] gap-s3">
      <section
        aria-label="El mundo, con sus hilos"
        className="flex min-h-0 min-w-0 flex-col rounded-radius-sm border border-muted bg-surface p-s4"
      >
        <div className="mb-s3 flex shrink-0 items-center gap-s3">
          <h2 className="font-title text-chrome-md text-text">El mundo, con sus hilos</h2>
          <span aria-hidden="true" className="h-px flex-1 bg-copper/40" />
          <span className="font-chrome text-chrome-xs text-muted">
            Pulsa una ficha para editarla
          </span>
        </div>
        <div className="scroll-quiet flex min-h-0 flex-1 flex-col overflow-y-auto">
          <TableroTelarana
            fichas={fichas.data ?? []}
            seleccion={seleccionada?.id ?? null}
            onSeleccion={setElegida}
            cargando={fichas.isLoading}
            error={
              fichas.isError
                ? "No se pudo leer el mundo de esta campaña. Un corcho vacío aquí no significa que no haya fichas."
                : null
            }
          />
        </div>
      </section>

      <section
        aria-label="Preparar la mesa"
        className="flex min-h-0 min-w-0 flex-col rounded-radius-sm border border-muted bg-surface p-s4"
      >
        <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto">
          <Tabs items={solapas} />
        </div>
      </section>
    </div>
  );
}
