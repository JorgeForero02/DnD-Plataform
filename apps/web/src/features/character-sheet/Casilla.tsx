import type { ReactNode } from "react";
import { ROTULO_DE_CASILLA } from "./Tarjeta";

// Pulido 2026-09-12, anexo #4 — **las cinco casillas de la tira miden lo mismo.** La de PG era
// más ancha y más alta que las otras cuatro porque «+5 temporales» le añadía una línea; las
// demás no la tenían. Aquí la tercera línea existe SIEMPRE (`min-h`) y el ancho y el alto son
// fijos: la nota entra sin romper la caja (regla «reparto interno de tarjeta», 04-convenciones).
//
// **Corrección medida en el navegador (2026-09-12, ronda de arreglo de la tarea 1).** La primera
// cifra, 4,75rem, salía de `min-w-[4.75rem]` — un MÍNIMO que nunca había tenido que sostener
// «VEL. (PIES)», «13 / 13» o «+5 temporales» a la vez, porque antes el contenido decidía cuánto
// crecer. Al fijarlo como ancho, Playwright midió tres cajas de alturas distintas —60, 75 y
// 95px— porque esas tres líneas partían en dos. **6rem** es el número que las cuatro cupieron sin
// partir, y `whitespace-nowrap` en las tres líneas es lo que impide que un contenido más largo
// vuelva a partir silenciosamente y a engañar la medida. Los dos ficheros que citan estos números
// —docs/superpowers/notes/2026-09-12-nota-de-diseno-ui-de-juegos.md §7 y 04-convenciones.md,
// regla «Reparto interno de tarjeta»— se actualizaron en el mismo commit que este comentario.
export const ANCHO_CASILLA = "w-[6rem]";
export const ALTO_CASILLA = "min-h-[3.75rem]";

export function Casilla({
  rotulo,
  rotuloLargo,
  nota,
  desplegable,
  className = "",
  children,
}: {
  rotulo: string;
  /** El nombre entero cuando el visible va abreviado («Inic.» → «Iniciativa»). */
  rotuloLargo?: string;
  /** La tercera línea: «+5 temporales». Reservada aunque falte. */
  nota?: ReactNode;
  /**
   * Ronda de arreglo (revisión, 2026-09-12) — **la traza abierta, en su PROPIA fila, debajo de
   * todo lo demás.** Antes vivía como segundo hijo del `<div>` de la cifra
   * (`flex items-center justify-center whitespace-nowrap`): en fila por defecto, `whitespace-nowrap`
   * heredado y sin poder encogerse dentro de una caja de 6rem, la lista se salía a la DERECHA del
   * botón en vez de crecer hacia abajo. Esta ranura es una cuarta fila del `grid` (solo cuando hay
   * algo que pintar, para que la caja en reposo no cambie de alto) con `whitespace-normal` —
   * ninguna herencia del `nowrap` de las otras tres líneas: la traza es prosa que puede partir
   * línea, no una cifra que no puede.
   */
  desplegable?: ReactNode;
  className?: string;
  /** La cifra, o el botón que la abre en traza. */
  children: ReactNode;
}) {
  return (
    <div
      className={[
        ANCHO_CASILLA,
        ALTO_CASILLA,
        desplegable ? "grid-rows-[auto_1fr_auto_auto]" : "grid-rows-[auto_1fr_auto]",
        // Desbordes (2026-09-13, E-DB-10): la tira de cabecera es un `flex` (`Cabecera.tsx`,
        // `ml-auto flex flex-wrap ...`), y un ítem de `flex` sin `min-w-0` no puede encoger por
        // debajo del tamaño mínimo de SU CONTENIDO — el ancho explícito (`w-[6rem]`) deja de
        // mandar en cuanto la traza abierta mete un texto cuyo mínimo por palabra pesa más que
        // eso, y la caja entera crece hacia la derecha. En «Comp.», la última casilla, sin
        // margen de sobra, ese crecimiento se salía 8 px de la ventana. `min-w-0` deja que el
        // ancho declarado vuelva a mandar; el texto de dentro rompe línea en su lugar (ver el
        // `min-w-0` de `PasoDeTraza`, `Traza.tsx`).
        "grid min-w-0 rounded-radius-sm border border-muted bg-surface px-s2 py-1 text-center",
        className,
      ].join(" ")}
    >
      <p
        aria-hidden={rotuloLargo ? "true" : undefined}
        title={rotuloLargo ?? rotulo}
        className={`${ROTULO_DE_CASILLA} whitespace-nowrap leading-tight`}
      >
        {rotulo}
      </p>
      {rotuloLargo && <span className="sr-only">{rotuloLargo}</span>}
      <div className="flex items-center justify-center whitespace-nowrap font-data text-chrome-lg leading-none text-text">
        {children}
      </div>
      <p
        data-testid="casilla-nota"
        className="min-h-[1rem] whitespace-nowrap font-chrome text-chrome-xs leading-4 text-accent-text"
      >
        {nota}
      </p>
      {desplegable && (
        <div
          data-testid="casilla-desplegable"
          // `min-w-0`: esta fila es también un ÍTEM de la rejilla (`grid-rows-…` de arriba), y
          // sin él su pista de columna implícita crece para acomodar el contenido más ancho
          // (`Bonificador de competencia` en una sola línea) por encima de las 6rem del propio
          // contenedor — la caja exterior no cambia de ancho, pero esta fila se pinta por fuera
          // de ella. `min-w-0` deja que la columna vuelva a medir 6rem y el texto de dentro
          // rompa línea en su lugar (el `min-w-0` de `PasoDeTraza`, `Traza.tsx`).
          className="min-w-0 whitespace-normal text-left leading-normal"
        >
          {desplegable}
        </div>
      )}
    </div>
  );
}
