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
      // Selector estable para el e2e (revisión 2026-09-13): `Casilla` es siempre una de las
      // cinco cajas derivadas de la tira compacta de la cabecera (PG y las cuatro de
      // `ValorDerivado`), así que el dato no varía por instancia.
      data-casilla="derivada"
      className={[
        // Desbordes, ronda 3 (2026-09-13, E-DB-10 — «la caja crece», la otra mitad de la
        // regla): forzar el rótulo a envolver DENTRO de los 6rem fijos partía palabras a mitad
        // («Bonific/icador») para que cupieran — legible, pero no es lo que E-DB-10 pedía. Con
        // la traza ABIERTA la casilla puede crecer en su lugar: `min-w-[6rem] w-auto` deja que
        // el ancho lo decida el contenido (nunca por debajo de las 6rem de las demás), y
        // `max-w-[14rem]` la frena antes de invadir la casilla vecina o salirse de la ventana —
        // a partir de ahí, el rótulo sí envuelve, pero por espacios (`break-normal` en
        // `PasoDeTraza`, `Traza.tsx`), nunca a mitad de palabra. CERRADA sigue midiendo
        // `ANCHO_CASILLA` fijo, sin cambio: las aserciones de `hoja.spec.ts` sobre las cinco
        // casillas en reposo no dependen de esta rama.
        desplegable ? "min-w-[6rem] w-auto max-w-[14rem]" : ANCHO_CASILLA,
        ALTO_CASILLA,
        desplegable ? "grid-rows-[auto_1fr_auto_auto]" : "grid-rows-[auto_1fr_auto]",
        "grid rounded-radius-sm border border-muted bg-surface px-s2 py-1 text-center",
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
          // `min-w-0`: esta fila es también un ÍTEM de la rejilla (`grid-rows-…` de arriba); sin
          // él, su pista de columna implícita crecería para acomodar el contenido más ancho por
          // encima del `max-w-[14rem]` del contenedor (de arriba) en vez de respetarlo. Con
          // `min-w-0` la columna se ciñe al ancho que el contenedor haya resuelto —entre 6 y
          // 14rem— y el texto envuelve por espacios en su lugar (`break-normal` en
          // `PasoDeTraza`, `Traza.tsx`).
          className="min-w-0 whitespace-normal text-left leading-normal"
        >
          {desplegable}
        </div>
      )}
    </div>
  );
}
