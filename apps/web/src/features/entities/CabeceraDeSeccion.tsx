import type { ReactNode } from "react";

// **La cabecera explicada, adoptada de la maqueta.**
//
// Antes, entrar en «Lugares» y entrar en «Documentos» daba exactamente la misma pantalla: una
// barra de filtros y una lista. La única señal de en cuál estabas era el botón resaltado de la
// barra lateral. La maqueta pone tres cosas encima de la lista y con eso las siete secciones
// dejan de ser la misma:
//
//   1. La migaja en versalita —«El mundo · Lugares»— que dice dónde estás sin obligarte a
//      mirar la barra lateral.
//   2. El nombre de la sección, en la voz de los títulos.
//   3. **Una frase que explica para qué sirve.** No se ha escrito aquí ni una sola: sale de
//      `plantillas.ts`, donde ya vivía como `paraQue` desde que los formularios dejaron de ser
//      el mismo para los siete tipos. Escribir una segunda descripción por tipo habría sido
//      una segunda fuente de verdad sobre qué es un lugar.
//
// La acción que crea va **en esta banda**, a la derecha del título, y no dentro de la barra de
// filtros: crear no es filtrar. Quien la pasa decide si se ofrece — en las secciones del mundo
// solo al DM, porque el servidor exige DM (`entities.service.ts`, `requireDM`) y ofrecer un
// botón que va a dar 403 es mentir.
export function CabeceraDeSeccion({
  grupo,
  titulo,
  paraQue,
  icono,
  accion,
}: {
  /** El grupo de la barra lateral al que pertenece la sección: «El mundo», «La mesa». */
  grupo: string;
  titulo: string;
  paraQue: string;
  icono?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <header className="mb-s4">
      <p className="font-data text-chrome-xs uppercase tracking-[0.16em] text-copper-text">
        {grupo} · {titulo}
      </p>
      <div className="mt-1 flex flex-wrap items-start gap-s3">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-s2 font-title text-chrome-xl text-text">
            {icono && <span className="text-copper-text">{icono}</span>}
            {titulo}
          </h2>
          <p className="mt-1 max-w-[70ch] font-world text-world-base leading-snug text-muted">
            {paraQue}
          </p>
        </div>
        {accion && <div className="shrink-0">{accion}</div>}
      </div>
    </header>
  );
}
