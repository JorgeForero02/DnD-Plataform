import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { IconoCampana } from "../../ui/Iconos";
import { useMarkNotificationsRead, useNotifications } from "./hooks";
import { cuandoFue, destinoDeAviso, fraseDeAviso } from "./vocabulario";
import type { NotificationRow } from "./api";

// Plan 12 · 12.2 — **la bandeja**, en el chrome, junto al conmutador de tema.
//
// El servidor tenía tabla, servicio y dos rutas desde la tarea 2A.14, y **nadie veía un aviso
// nunca**: es el patrón que este proyecto ha cerrado en falso cuatro veces —servidor hecho, nadie
// que lo use—. Con tres cosas y ninguna más:
//
// - **cuántas sin leer**, y si son cero **no hay distintivo**: un cero con globo es ruido;
// - **la lista**, cada aviso con su enlace al sitio donde pasó;
// - **marcar leído** y **marcar todo leído**, que es lo que la gente usa de verdad.
//
// **Lo que NO hace: borrar.** Un aviso leído se apaga; el historial se queda.

function FilaDeAviso({ fila, alPulsar }: { fila: NotificationRow; alPulsar: () => void }) {
  const destino = destinoDeAviso(fila);
  const sinLeer = fila.readAt === null;
  const contenido = (
    <>
      <span className={sinLeer ? "font-semibold text-text" : "text-muted"}>
        {fraseDeAviso(fila)}
      </span>
      <span className="mt-1 block font-chrome text-chrome-xs text-muted">
        {cuandoFue(fila.createdAt)}
      </span>
    </>
  );
  const clases = [
    "block w-full px-s3 py-s2 text-left font-chrome text-chrome-xs",
    "border-l-2",
    // El único distintivo por fila: un filete de acento a la izquierda mientras esté sin leer.
    sinLeer ? "border-accent bg-accent/5" : "border-transparent",
    "hover:bg-muted/10",
  ].join(" ");

  // **Sin destino, no se finge uno.** Un aviso al que le falta su sujeto se lee igual, pero no
  // lleva a un 404 — que es peor que no llevar a ninguna parte.
  if (!destino) {
    return (
      <li>
        <div className={clases}>{contenido}</div>
      </li>
    );
  }
  return (
    <li>
      <Link to={destino} className={clases} onClick={alPulsar}>
        {contenido}
      </Link>
    </li>
  );
}

export function BandejaDeAvisos() {
  const [abierta, setAbierta] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const { data } = useNotifications();
  const marcarLeidas = useMarkNotificationsRead();

  const sinLeer = data?.unreadCount ?? 0;
  const avisos = data?.notifications ?? [];

  // Cerrar con Escape y al pulsar fuera. Las dos, porque un panel que solo cierra con su propio
  // botón se queda abierto encima de lo que el usuario acaba de decidir mirar.
  useEffect(() => {
    if (!abierta) return;
    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierta(false);
    }
    function alPulsarFuera(e: MouseEvent) {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierta(false);
    }
    document.addEventListener("keydown", alTeclear);
    document.addEventListener("mousedown", alPulsarFuera);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.removeEventListener("mousedown", alPulsarFuera);
    };
  }, [abierta]);

  return (
    <div className="relative" ref={caja}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={abierta}
        // **El nombre dice el número**, porque el distintivo es visual y un lector de pantalla no
        // ve un círculo: sin él, «Avisos» sonaría igual con cero que con siete.
        aria-label={sinLeer > 0 ? `Avisos (${sinLeer} sin leer)` : "Avisos"}
        onClick={() => setAbierta((a) => !a)}
        className="relative flex items-center rounded-radius-sm p-s1 text-muted hover:text-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <IconoCampana className="h-4 w-4" />
        {/* **Sin avisos no hay distintivo.** Un cero con globo es ruido, y además miente sobre
            que haya algo que atender. */}
        {sinLeer > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 min-w-[1.1rem] rounded-radius-md bg-accent px-1 text-center font-chrome text-[0.65rem] leading-[1.1rem] text-bg"
          >
            {sinLeer > 9 ? "9+" : sinLeer}
          </span>
        )}
      </button>

      {abierta && (
        <div
          role="dialog"
          aria-label="Avisos"
          // **En estrecho el panel NO cuelga del botón: se ancla a la ventana.**
          //
          // Colgado a la derecha del botón (`absolute right-0`) su borde izquierdo caía **fuera
          // de la pantalla** cuando el botón no está pegado al borde —a 390 px lo empujan el
          // conmutador de tema y «Cuenta»—, y el panel salía cortado por la izquierda: se leía
          // «…undren Piedrarroja». Lo cazó un paseo de uso contra producción, no una prueba;
          // `jsdom` no maqueta y el navegador no da error por pintar fuera del lienzo.
          //
          // Por debajo de `sm` va fijo a la ventana con un margen a cada lado; a partir de ahí
          // vuelve a colgar del botón, que es donde tiene sentido y donde hay sitio.
          className="fixed inset-x-s2 top-16 z-40 overflow-hidden rounded-radius-md border border-copper bg-surface shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-[22rem]"
        >
          <div className="flex items-center justify-between gap-s2 border-b border-borde px-s3 py-s2">
            <h2 className="font-chrome text-chrome-sm font-semibold text-text">Avisos</h2>
            {sinLeer > 0 && (
              <button
                type="button"
                onClick={() => marcarLeidas.mutate(undefined)}
                className="font-chrome text-chrome-xs text-muted hover:text-accent-text hover:underline"
              >
                Marcar todo leído
              </button>
            )}
          </div>

          {avisos.length === 0 ? (
            <p className="px-s3 py-s4 font-chrome text-chrome-xs text-muted">
              No tienes avisos. Aquí aparecerá lo que pase en tus mesas mientras no mirabas.
            </p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-muted/20 overflow-y-auto">
              {avisos.map((fila) => (
                <FilaDeAviso
                  key={fila.id}
                  fila={fila}
                  alPulsar={() => {
                    // Abrir un aviso **es** leerlo. Marcarlo solo si hacía falta: una petición
                    // por cada clic en algo ya leído es ruido contra el servidor.
                    if (fila.readAt === null) marcarLeidas.mutate([fila.id]);
                    setAbierta(false);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
