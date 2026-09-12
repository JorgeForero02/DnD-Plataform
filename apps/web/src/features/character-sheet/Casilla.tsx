import type { ReactNode } from "react";
import { ROTULO_DE_CASILLA } from "./Tarjeta";

// Pulido 2026-09-12, anexo #4 — **las cinco casillas de la tira miden lo mismo.** La de PG era
// más ancha y más alta que las otras cuatro porque «+5 temporales» le añadía una línea; las
// demás no la tenían. Aquí la tercera línea existe SIEMPRE (`min-h`) y el ancho y el alto son
// fijos: la nota entra sin romper la caja (regla «reparto interno de tarjeta», 04-convenciones).
// Los dos números vienen de la nota de diseño de la tarea 0 (docs/superpowers/notes/
// 2026-09-12-nota-de-diseno-ui-de-juegos.md §7): **4,75rem × 3,75rem**, no los 5,5rem que traía
// el primer borrador del encargo — 4,75rem ya era el ancho mínimo de la casilla de PG antes de
// este cambio, así que fijarlo no mueve a las otras cuatro, solo deja de dejar crecer a la quinta.
export const ANCHO_CASILLA = "w-[4.75rem]";
export const ALTO_CASILLA = "min-h-[3.75rem]";

export function Casilla({
  rotulo,
  rotuloLargo,
  nota,
  className = "",
  children,
}: {
  rotulo: string;
  /** El nombre entero cuando el visible va abreviado («Inic.» → «Iniciativa»). */
  rotuloLargo?: string;
  /** La tercera línea: «+5 temporales». Reservada aunque falte. */
  nota?: ReactNode;
  className?: string;
  /** La cifra, o el botón que la abre en traza. */
  children: ReactNode;
}) {
  return (
    <div
      className={[
        ANCHO_CASILLA,
        ALTO_CASILLA,
        "grid grid-rows-[auto_1fr_auto] rounded-radius-sm border border-muted bg-surface px-s2 py-1 text-center",
        className,
      ].join(" ")}
    >
      <p
        aria-hidden={rotuloLargo ? "true" : undefined}
        title={rotuloLargo ?? rotulo}
        className={`${ROTULO_DE_CASILLA} leading-tight`}
      >
        {rotulo}
      </p>
      {rotuloLargo && <span className="sr-only">{rotuloLargo}</span>}
      <div className="flex items-center justify-center font-data text-chrome-lg leading-none text-text">
        {children}
      </div>
      <p
        data-testid="casilla-nota"
        className="min-h-[1rem] font-chrome text-chrome-xs leading-4 text-accent-text"
      >
        {nota}
      </p>
    </div>
  );
}
