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
// **Maqueta 2026-09-03, segunda pasada.** Se quitó el icono del título. Lo tenía a su
// izquierda, y en la maqueta el título va solo: el dibujo del tipo ya está dos veces en
// pantalla —en la entrada del carril y en la canaleta de cada fila—, y ponerlo una tercera vez
// a tamaño de titular hacía competir un adorno con el nombre de la sección. La prop se ha
// quitado entera en vez de dejarla sin usar.
export function CabeceraDeSeccion({
  grupo,
  titulo,
  paraQue,
  accion,
}: {
  /** El grupo de la barra lateral al que pertenece la sección: «El mundo», «La mesa». */
  grupo: string;
  titulo: string;
  paraQue: string;
  accion?: ReactNode;
}) {
  return (
    <header className="mb-s5">
      <p className="font-data text-chrome-xs uppercase tracking-[0.16em] text-copper-text">
        {grupo} · {titulo}
      </p>
      <div className="mt-s2 flex flex-wrap items-start justify-between gap-s3">
        <div className="min-w-0">
          {/* El título de la sección es lo grande de la pantalla, como en la maqueta: el nombre
              de la campaña vive arriba, en la migaja, y no vuelve a repetirse aquí. */}
          <h2 className="font-title text-chrome-2xl leading-tight text-text">{titulo}</h2>
        </div>
        {accion && <div className="shrink-0">{accion}</div>}
      </div>
      {/* La frase de `plantillas.ts`, en la voz de la interfaz y no en la del mundo: explica
          para qué sirve la sección, que es instrumento, no ambientación. */}
      <p className="mt-s2 max-w-[70ch] font-chrome text-chrome-sm leading-snug text-muted">
        {paraQue}
      </p>
    </header>
  );
}
