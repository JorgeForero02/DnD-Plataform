import { useState } from "react";
import { Tabs } from "../../../ui/Tabs";
import { useAllEntities } from "../../entities/hooks";
import type { Entity } from "../../entities/api";
import { ElMundo } from "./mundo/ElMundo";
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
// A la izquierda **el mundo como desglose con detalle** (`mundo/ElMundo`, Task 14 bis, D-CF-64):
// un árbol por tipo donde cada ficha cuelga de su padre por un rótulo de jerarquía, y al lado la
// ficha elegida con su anillo de vecinos y sus hilos. **Sustituye al tablero telaraña** (D4,
// 2026-09-02: chinchetas con posiciones que se tapaban desde seis fichas), retirado en el mismo
// commit que montó esto; el mapa de historia que iba a ocupar su sitio lo aplazó el autor.
// A la derecha **tres solapas**: escribir una ficha, preparar la sesión, y ver lo que sabe la
// mesa. Elegir una ficha en el desglose la trae a la solapa de escribir, como antes la chincheta.
//
// **Este fichero solo compone.** El mundo se lee una vez aquí —`useAllEntities`— y se reparte por
// props a las solapas que lo necesitan; `ElMundo` lo vuelve a pedir con la misma clave y
// react-query lo deduplica: una sola llamada por campaña.
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
        aria-label="El mundo"
        className="flex min-h-0 min-w-0 flex-col rounded-radius-sm border border-muted bg-surface p-s4"
      >
        <div className="mb-s3 flex shrink-0 items-center gap-s3">
          <h2 className="font-title text-chrome-md text-text">El mundo</h2>
          <span aria-hidden="true" className="h-px flex-1 bg-copper/40" />
          <span className="font-chrome text-chrome-xs text-muted">
            Qué cuelga de qué, y qué dice cada ficha
          </span>
        </div>
        <div className="scroll-quiet flex min-h-0 flex-1 flex-col overflow-y-auto">
          <ElMundo
            campaignId={campaignId}
            seleccionId={seleccionada?.id ?? null}
            onSeleccion={setElegida}
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
