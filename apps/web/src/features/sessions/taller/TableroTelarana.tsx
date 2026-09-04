import { useQueries } from "@tanstack/react-query";
import { Badge } from "../../../ui/Badge";
import { EmptyState } from "../../../ui/Collection";
import { IconoDeTipo } from "../../entities/iconos";
import { ETIQUETA_DE_TIPO } from "../../entities/resumen";
import type { Entity } from "../../entities/api";
import { fetchLinks } from "../../links/api";
import { linksKey } from "../../links/hooks";
import { MAXIMO_DE_CHINCHETAS, claveDeHilo, posicionDeFicha } from "./posiciones";

// **El tablero de detective.** Chinchetas en porcentajes e hilos de cobre discontinuos entre las
// fichas enlazadas. Es lo que la auditoría del 2026-09-04 puso como CRÍTICA con una prueba de una
// línea: `grep -rln "Telarana" apps/web/src` daba **cero**.
//
// Lo que se copia de la maqueta, tal cual: la caja con borde de cobre, el radial de fondo, la
// chincheta redonda asomando por arriba de cada tarjeta, el tipo en versalitas de cobre, el
// nombre en la voz de los títulos, la insignia de visibilidad debajo, y los hilos en
// `stroke-dasharray="3 3"` con `--copper`.
//
// Lo que **no** se copia, porque aquí hay datos de verdad:
//
//  · Las posiciones no están escritas a mano (ver `posiciones.ts`, que explica la decisión).
//  · Los enlaces se piden al servidor **por ficha**, que es la única ruta que existe
//    (`GET /entities/:id/links`). Se piden con `useQueries` sobre la MISMA clave de consulta que
//    `useLinks` (`linksKey`), así que abrir una ficha después no vuelve a pedir nada: comparten
//    caché. La puerta de API sigue siendo la de `features/links` — aquí no se escribe otra.
//  · Un enlace llega dos veces, una por cada extremo (`OUTGOING` en el suyo, `INCOMING` en el
//    otro), así que los hilos se deduplican por pareja ordenada.
//
// El servidor decide qué fichas y qué enlaces viajan (`canView`); este componente pinta lo que
// llega y no filtra nada por su cuenta.

export function TableroTelarana({
  fichas,
  seleccion,
  onSeleccion,
  cargando,
  error,
}: {
  /** Ya filtradas por el servidor. El tablero solo recorta cuántas dibuja, y lo dice. */
  fichas: Entity[];
  seleccion: string | null;
  onSeleccion: (ficha: Entity) => void;
  cargando: boolean;
  error: string | null;
}) {
  // Las más recientes primero: el mundo que se está escribiendo ahora es el que interesa tener
  // delante mientras se prepara la sesión.
  const ordenadas = [...fichas].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const enElCorcho = ordenadas.slice(0, MAXIMO_DE_CHINCHETAS);
  const fuera = ordenadas.length - enElCorcho.length;

  const enlaces = useQueries({
    queries: enElCorcho.map((ficha) => ({
      queryKey: linksKey(ficha.id),
      queryFn: () => fetchLinks(ficha.id),
    })),
  });

  const enElCorchoPorId = new Map(enElCorcho.map((f) => [f.id, f]));
  const hilos = new Map<string, { a: Entity; b: Entity }>();
  enlaces.forEach((consulta, i) => {
    const origen = enElCorcho[i];
    if (!origen) return;
    for (const enlace of consulta.data ?? []) {
      const otro = enElCorchoPorId.get(enlace.to.id);
      // Un enlace con una ficha que no está en el corcho no se dibuja: un hilo que sale del
      // tablero y no llega a ninguna parte se lee como un fallo de pintado.
      if (!otro) continue;
      hilos.set(claveDeHilo(origen.id, otro.id), { a: origen, b: otro });
    }
  });

  if (error) {
    return (
      <p className="rounded-radius-sm border border-danger p-s3 font-chrome text-chrome-sm text-danger-text">
        {error}
      </p>
    );
  }

  if (cargando) {
    return <p className="font-chrome text-chrome-sm text-muted">Tendiendo los hilos del mundo…</p>;
  }

  if (enElCorcho.length === 0) {
    return (
      <EmptyState title="El corcho está vacío">
        Todavía no hay ninguna ficha en este mundo. Escribe la primera en «Escribir ficha», aquí al
        lado, y aparecerá clavada en el tablero.
      </EmptyState>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-s2">
      <div className="relative min-h-[22rem] flex-1 overflow-hidden rounded-radius-md border border-copper/25 bg-bg">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, rgb(var(--copper-ch) / 0.10), transparent 55%)",
          }}
        />
        {/* Los hilos, en cobre: el cobre es el color del mundo, nunca el de una acción. */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {[...hilos.entries()].map(([clave, { a, b }]) => {
            const pa = posicionDeFicha(a.id, a.type);
            const pb = posicionDeFicha(b.id, b.type);
            const tocaALaSeleccionada = seleccion === a.id || seleccion === b.id;
            return (
              <line
                key={clave}
                x1={`${pa.x}%`}
                y1={`${pa.y}%`}
                x2={`${pb.x}%`}
                y2={`${pb.y}%`}
                stroke="var(--copper)"
                strokeWidth={tocaALaSeleccionada ? 1.6 : 1}
                strokeOpacity={tocaALaSeleccionada ? 0.85 : 0.4}
                strokeDasharray="3 3"
              />
            );
          })}
        </svg>

        {enElCorcho.map((ficha) => {
          const pos = posicionDeFicha(ficha.id, ficha.type);
          const elegida = seleccion === ficha.id;
          return (
            <button
              key={ficha.id}
              type="button"
              onClick={() => onSeleccion(ficha)}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              aria-pressed={elegida}
              className={[
                "absolute w-28 -translate-x-1/2 -translate-y-1/2 rounded-radius-sm border px-s2 py-1 text-left transition-colors",
                // Dos fichas del mismo tipo pueden solaparse (ver `posiciones.ts`, que trae la
                // medición): la que está enfocada o elegida sube por encima, así que siempre hay
                // forma de llegar a las dos con el ratón y con el teclado.
                "focus-visible:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent hover:z-20",
                elegida
                  ? "z-10 border-copper bg-surface shadow-lg"
                  : "border-muted bg-surface hover:border-copper",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className="absolute -top-1.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-copper"
              />
              {/* **Una sola línea, y esto es una medición, no un gusto.** La tarjeta de tres
                  líneas de la maqueta (144x76 px) tapaba entre el 73% y el 100% de las
                  chinchetas en cuanto había seis; a una línea baja a la mitad. El tipo se dice
                  con su dibujo y, para quien lee con lector de pantalla, con la palabra
                  escondida de al lado. La visibilidad de TODAS las fichas se lee entera en la
                  solapa «Lo que sabe la mesa», que es la pantalla que existe para esa pregunta;
                  aquí solo la lleva la elegida, que es la que se está trabajando. */}
              <span className="flex items-center gap-s1">
                <span className="text-copper-text">
                  <IconoDeTipo type={ficha.type} />
                </span>
                <span className="sr-only">{ETIQUETA_DE_TIPO[ficha.type]}</span>
                <span className="min-w-0 flex-1 truncate font-title text-chrome-sm text-text">
                  {ficha.name}
                </span>
              </span>
              {elegida && (
                <span className="mt-s1 block">
                  <Badge visibility={ficha.visibility} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="shrink-0 font-chrome text-chrome-xs text-muted">
        {hilos.size === 0
          ? "Ninguna de estas fichas está enlazada con otra todavía. Los hilos aparecen al enlazarlas."
          : `${hilos.size} ${hilos.size === 1 ? "hilo tendido" : "hilos tendidos"} entre ${enElCorcho.length} fichas.`}
        {fuera > 0 &&
          ` Se clavan las ${MAXIMO_DE_CHINCHETAS} más recientes; quedan ${fuera} fuera del corcho.`}
      </p>
    </div>
  );
}
