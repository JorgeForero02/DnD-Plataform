import { useState } from "react";
import { Tabs } from "../../../ui/Tabs";
import { useAllEntities } from "../../entities/hooks";
import type { Entity } from "../../entities/api";
import { TableroTelarana } from "./TableroTelarana";
import { EscribirFicha } from "./EscribirFicha";
import { PrepararSesion } from "./PrepararSesion";
import { LoQueSabeLaMesa } from "./LoQueSabeLaMesa";
import { IconoOjo, IconoPluma, IconoReloj } from "../../../ui/Iconos";

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
        // **La llave, y no dos bloques de estado derivado dentro del formulario.** La primera
        // versión sembraba el estado en el render con dos guardas, y la segunda no se rearmaba
        // al volver a la MISMA ficha: elegirla, pulsar «Escribir una nueva» y volver a
        // elegirla dejaba los «jugadores concretos» vacíos, y guardar entonces **borraba sus
        // concesiones sin decir nada**. Con `key` React desmonta y vuelve a montar, que es la
        // forma que la propia documentación de React recomienda para «reiniciar el estado
        // cuando cambia el sujeto», y no hay guarda que se pueda quedar sin rearmar.
        <EscribirFicha
          key={seleccionada?.id ?? "ficha-nueva"}
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
        {/* **La barra de solapas ya no se va por arriba.** Estaba dentro del contenedor con
            `overflow-y-auto`, así que con el hilo de comentarios y el panel de enlaces abiertos
            —que viven justo debajo— la navegación del taller desaparecía al bajar. Es el mismo
            fallo que arregló la Ola 0 en la mesa, una capa más adentro; la maqueta la deja fuera
            del scroll (`prototipo/src/features/TallerDelDM.tsx`).

            Se clava con `sticky` sobre el `[role=tablist]` que pinta `ui/Tabs`, y **no sacando
            la barra del componente**: `Tabs` es quien lleva el `aria-controls`, el `tabindex`
            rotatorio y las flechas del patrón WAI-ARIA, y partirlo en dos dejaría el panel sin
            su pestaña. `ui/**` es frontera de otro carril, así que se estira desde fuera. El
            fondo opaco es obligatorio: sin él el texto pasa por debajo y se lee a través. */}
        <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto [&_[role=tablist]]:sticky [&_[role=tablist]]:top-0 [&_[role=tablist]]:z-10 [&_[role=tablist]]:bg-surface">
          <Tabs items={solapas} />
        </div>
      </section>
    </div>
  );
}
