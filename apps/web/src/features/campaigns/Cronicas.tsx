import { useState } from "react";
import { Link } from "react-router-dom";
import { useCampaigns } from "./hooks";
import { tiempoRelativo } from "./tiempoRelativo";
import { IconoPersonajes, IconoSesiones } from "./iconosDeSeccion";
import { Button } from "../../ui/Button";
import { EmptyState } from "../../ui/Collection";
import { useCurrentSession } from "../sessions/hooks";
import { IconoEnJuego } from "../sessions/iconos";

// B3 — **la puerta de entrada deja de ser una lista de proyectos y pasa a ser «tus crónicas».**
//
// El diagnóstico del reseño, en palabras del autor: *«Esto es un juego, una plataforma web, no
// una página web que hay que navegar para saber cosas.»* La rejilla de tarjetas anterior estaba
// bien hecha y decía lo que dice un gestor de contenidos: nombre, miembros, fecha. Lo que **no**
// decía es lo único que importa al abrir la aplicación un martes por la noche: **dónde retomas**.
//
// Dos cambios, y los dos son de comportamiento y no de aspecto:
//
//  1. **Elegir y abrir son dos gestos separados.** La lista a la izquierda, la crónica elegida
//     abierta a la derecha. Se puede mirar sin entrar, que es lo que se hace cuando tienes tres
//     campañas y no te acuerdas de cuál era cuál.
//  2. **La acción principal es «Entrar a la mesa»**, no «abrir los ajustes de la campaña». La
//     mesa era el único destino que no estaba en la navegación —el defecto de arquitectura que
//     B1.1 empezó a arreglar—, y aquí queda a un clic de la puerta de entrada.
//
// **Lo que todavía no puede decir, y se declara en vez de inventarse:** «dónde se quedó» de
// verdad —la crónica de la última sesión cerrada— no viaja en el listado de campañas
// (`campaigns.service.ts#listForUser` devuelve el papel del espectador y el número de miembros,
// y nada más). Pedirla por campaña serían N peticiones en la pantalla de entrada. Así que aquí se
// enseña lo que sí hay, y la crónica queda como ficha para el carril del motor.

export function Cronicas({ onCrear }: { onCrear: () => void }) {
  const { data, isLoading, isError, error } = useCampaigns();
  const [elegida, setElegida] = useState<string | null>(null);

  if (isLoading) {
    return <p className="font-chrome text-chrome-sm text-muted">Cargando campañas…</p>;
  }
  if (isError) {
    return (
      <p role="alert" className="font-chrome text-chrome-sm text-danger-text">
        {(error as Error).message}
      </p>
    );
  }
  if (!data || data.length === 0) {
    return (
      <EmptyState title="Todavía no tienes ninguna campaña">
        Una campaña guarda su mundo, sus sesiones y sus personajes, con sus propios secretos.
        <span className="mt-s3 block">
          <Button variant="primary" onClick={onCrear}>
            Nueva campaña
          </Button>
        </span>
      </EmptyState>
    );
  }

  const activa = data.find((c) => c.id === elegida) ?? data[0];

  return (
    <div className="grid gap-s5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <ul aria-label="Tus crónicas" className="flex flex-col gap-s2">
        {data.map((c) => {
          const puesta = c.id === activa.id;
          return (
            <li key={c.id}>
              {/* **Un botón, no un enlace, y es deliberado.** Elegir una crónica no navega a
                  ninguna parte: abre su ficha al lado. El enlace es el que entra a la mesa, y
                  ese sí es un `<Link>`. Confundirlos haría que el teclado y el clic derecho
                  prometieran cosas distintas de las que hacen. */}
              <button
                type="button"
                aria-pressed={puesta}
                // **Nombre accesible explícito.** Sin esto, el botón de la fila y el enlace del
                // panel se llaman igual —el nombre de la campaña— y una prueba que busca «la
                // campaña» no puede saber a cuál de los dos se refiere. Es el mismo fallo de
                // nombres homónimos que ya costó un `spec` roto en B1.1, cazado antes esta vez.
                aria-label={`Elegir ${c.name}`}
                onClick={() => setElegida(c.id)}
                className={[
                  "flex w-full items-center gap-s3 rounded-radius-sm border px-s4 py-s3 text-left transition-colors",
                  puesta
                    ? "border-copper bg-surface"
                    : "border-muted bg-bg hover:border-copper-text",
                ].join(" ")}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-title text-chrome-lg text-text">
                    {c.name}
                  </span>
                  <span className="mt-s1 flex flex-wrap items-center gap-x-s3 gap-y-1 font-chrome text-chrome-xs text-muted">
                    {c._count?.members !== undefined && (
                      <span className="flex items-center gap-s2">
                        <IconoPersonajes />
                        <span className="font-data">
                          {c._count.members} {c._count.members === 1 ? "miembro" : "miembros"}
                        </span>
                      </span>
                    )}
                    {tiempoRelativo(c.createdAt) && (
                      <span className="flex items-center gap-s2">
                        <IconoSesiones />
                        <span className="font-data">{tiempoRelativo(c.createdAt)}</span>
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <CronicaAbierta campaign={activa} />
    </div>
  );
}

function CronicaAbierta({
  campaign,
}: {
  campaign: { id: string; name: string; description: string | null };
}) {
  // El estado de la mesa, del mismo sondeo que ya usa la barra de sesión: no añade peticiones y
  // dice lo único que cambia lo que vas a encontrar al entrar.
  const { data: sesion } = useCurrentSession(campaign.id);

  return (
    <section
      aria-label={`La crónica de ${campaign.name}`}
      className="flex flex-col rounded-radius-md border border-copper bg-surface p-s5"
    >
      {/* **El nombre es un enlace, y esto lo corrigió la suite.** La primera versión lo dejaba
          como texto: la fila de la izquierda seleccionaba y el único enlace era «Entrar a la
          mesa». Veinte recorridos hacen clic en la campaña **por su nombre**, y con razón — un
          nombre de algo que se puede abrir promete abrirse, y se espera poder abrirlo en otra
          pestaña con el botón derecho. Lleva al taller; jugar sigue siendo el botón grande de
          abajo. */}
      <h2 className="font-title text-chrome-xl">
        <Link
          to={`/campaigns/${campaign.id}`}
          className="text-copper-text underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {campaign.name}
        </Link>
      </h2>

      <div className="mt-s4 flex-1">
        <h3 className="mb-s1 font-chrome text-chrome-xs uppercase tracking-widest text-muted">
          Dónde se quedó
        </h3>
        {campaign.description ? (
          <p className="max-w-[46ch] font-world text-world-lg leading-relaxed text-text">
            {campaign.description}
          </p>
        ) : (
          // **No se inventa un resumen.** La maqueta pinta aquí una crónica bonita; nosotros
          // todavía no tenemos de dónde sacarla, y una tarjeta sin dato detrás es exactamente lo
          // que `docs/04-convenciones.md` prohíbe al adoptarla.
          <p className="max-w-[46ch] font-world text-world-base italic text-muted">
            Esta campaña no tiene todavía una descripción. Cuando se cierre una sesión con su
            crónica, este es el sitio donde se leerá.
          </p>
        )}
      </div>

      <p className="mt-s4 flex items-center gap-s2 font-chrome text-chrome-xs text-muted">
        <IconoEnJuego className="h-2.5 w-2.5 shrink-0 text-copper-text" />
        {sesion ? `En juego · ${sesion.title}` : "La mesa está en reposo"}
      </p>

      <div className="mt-s4 flex flex-wrap items-center gap-s3">
        {/* **La acción principal es entrar a jugar.** El taller queda al lado, en segundo
            término: preparar es lo que se hace entre sesiones, y jugar es para lo que existe
            esto. */}
        <Link
          to={`/campaigns/${campaign.id}/sesion`}
          className="inline-flex items-center gap-s2 rounded-radius-sm border border-accent bg-accent px-s4 py-s2 font-chrome text-chrome-base text-bg transition-colors hover:border-accent-text hover:bg-accent-text"
        >
          Entrar a la mesa
        </Link>
        <Link
          to={`/campaigns/${campaign.id}`}
          className="inline-flex items-center gap-s2 rounded-radius-sm border border-copper px-s4 py-s2 font-chrome text-chrome-base text-copper-text transition-colors hover:border-accent hover:text-accent-text"
        >
          Abrir el taller
        </Link>
      </div>
    </section>
  );
}
