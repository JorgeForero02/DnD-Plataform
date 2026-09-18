import { useState, type ReactNode } from "react";
import { IconoPunta } from "../../../ui/Iconos";

// El registro en vivo, como un cajón inferior plegable tipo chat, con contador de líneas nuevas.
// `eventos` llega más reciente primero (reincorporarse.ts): «nuevas desde que plegué» es la
// posición, en la lista de AHORA, del id que estaba arriba cuando se plegó — o `eventos.length`
// si ese id ya no aparece (paginado o descartado).
//
// **Ronda de revisión (2026-09-12), IMPORTANT #1 — el hilo dentro del cajón no scrolleaba y se
// comía el marco.** Dos fallos, el mismo defecto de siempre (el que `PanelDeMesa.tsx` ya
// documenta): un hijo de flex/grid con `min-height: auto` se niega a encoger bajo su contenido,
// así que el `overflow-y-auto` de dentro nunca se activa.
//
//  1. El envoltorio de `children` era `<div className="min-h-0 flex-1">`: un ITEM de flex, pero
//     no un CONTENEDOR — `HiloDeSesion` (que empieza en `flex min-h-0 flex-col`, vía
//     `PanelDeMesa`) caía dentro de un `<div>` normal (`display: block`), así que dejaba de ser
//     hijo de flex y sus `min-h-0`/`flex-1` no hacían nada: crecía con su contenido. Se arregla
//     dándole `flex` al envoltorio, con `flex-col` para que ese contenido siga siendo una
//     columna.
//  2. Con eso resuelto, la fila `auto` de la rejilla de `MesaDeSesion.tsx` seguía sin techo: un
//     hilo largo podía pedir tanta altura como quisiera y esa fila crecía a su costa, comiéndose
//     el marco (que vive en la fila `1fr`) hasta dejarlo en 0 px. La sección de este cajón
//     **desplegada** lleva ahora `max-h-[32vh]` además de su `min-h-[14rem]`: la fila `auto` de
//     la rejilla se mide por el tamaño de este elemento, y un elemento con `max-height` no puede
//     pedir más allá de esa cota aunque su contenido sea más alto — lo que sobra lo absorbe el
//     `overflow-y-auto` del propio hilo, no la rejilla. Plegada, la sección vuelve a ser solo el
//     botón (~2.5rem): sin `min-h`/`max-h`, la fila `auto` se ajusta a ese tamaño y el marco
//     recupera casi toda la altura.
//
//     **Ronda de revisión 2 (2026-09-12): 40vh bajó a 32vh — el marco manda.** A 1280×800 la
//     banda de escena y la línea de combate se comen ~160 px por encima de la rejilla, así que
//     un cajón a 40vh (320 px) podía dejar al marco por debajo de él; el autor decidió que **el
//     tablero domina el registro**, nunca al revés. `32vh` dan 256 px a 800 (por encima de los
//     224 px de `min-h-[14rem]`, que sigue siendo el suelo) y 345 px a 1080 — sigue habiendo hilo
//     de sobra para leer plegando poco, y el marco se queda con la mayoría de la fila `1fr`.
export function CajonDelRegistro({
  eventos,
  children,
}: {
  eventos: { id: string }[];
  children: ReactNode;
}) {
  const [plegado, setPlegado] = useState(false);
  const [idAlPlegar, setIdAlPlegar] = useState<string | null>(null);
  // Plegado sin ninguna línea cargada (`idAlPlegar === null`): todo lo que llegue es nuevo. Antes
  // ese caso devolvía 0 siempre — plegar antes de la primera carga apagaba el contador.
  const nuevas = !plegado
    ? 0
    : idAlPlegar === null
      ? eventos.length
      : (() => {
          const i = eventos.findIndex((e) => e.id === idAlPlegar);
          return i === -1 ? eventos.length : i;
        })();

  const alPulsar = () => {
    if (plegado) {
      setPlegado(false);
      setIdAlPlegar(null);
    } else {
      setPlegado(true);
      setIdAlPlegar(eventos[0]?.id ?? null);
    }
  };

  // Revisión (2026-09-12), MINOR #4 — el `aria-label` del botón sustituye por completo su
  // contenido visible como nombre accesible, así que el contador solo se anunciaba si vivía EN
  // ese `aria-label`: el `aria-label` suelto del `<span>` de dentro nunca llegaba a leerse. El
  // número visible se queda (`{nuevas}` en el span, sin su propio `aria-label`), y la cifra pasa
  // al nombre del botón.
  const etiqueta = plegado ? "Desplegar el registro" : "Plegar el registro";
  return (
    <section
      aria-label="Registro en vivo"
      className={["flex min-h-0 flex-col", plegado ? "" : "min-h-[14rem] max-h-[32vh]"].join(" ")}
    >
      <button
        type="button"
        aria-expanded={!plegado}
        aria-label={nuevas > 0 ? `${etiqueta}, ${nuevas} líneas nuevas` : etiqueta}
        onClick={alPulsar}
        className="flex items-center gap-s2 border-t border-muted bg-surface px-s3 py-s1 font-chrome text-chrome-xs text-muted hover:text-text"
      >
        <IconoPunta hacia={plegado ? "arriba" : "abajo"} className="h-4 w-4" />
        Registro
        {nuevas > 0 && (
          <span className="rounded-full bg-accent px-1.5 font-data text-bg">{nuevas}</span>
        )}
      </button>
      {!plegado && <div className="flex min-h-0 flex-1 flex-col">{children}</div>}
    </section>
  );
}
