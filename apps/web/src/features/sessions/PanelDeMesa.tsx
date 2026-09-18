import type { ReactNode } from "react";

/**
 * La tarjeta de la mesa: una cabecera con su icono y su filete, y el cuerpo debajo.
 *
 * **Ola 0 (2026-09-04) — lo que cambia respecto a la versión que vivía dentro de
 * `MesaDeSesion.tsx`.** Antes el cuerpo era `<div className="min-w-0 p-s3">` a secas: crecía con
 * su contenido y empujaba la página. La mesa nueva ocupa la ventana y **scrollea por panel**, así
 * que esta primitiva tiene que poder ser una columna de altura fija con su propio scroll dentro.
 * De ahí `min-h-0` en la sección y en el cuerpo, y la ranura `cuerpoClassName` para que cada
 * carril decida si su panel scrollea (`scroll-quiet overflow-y-auto`) o no.
 *
 * **`min-h-0` no es un detalle de acabado.** Un hijo de flex/grid tiene `min-height: auto` por
 * defecto: se niega a encoger por debajo de su contenido, así que el `overflow-y-auto` de dentro
 * **no se activa jamás** y el panel entero se estira. Es exactamente el defecto que la auditoría
 * del 2026-09-04 midió en la mesa: cinco paneles con scroll interno escrito y ninguno funcionando.
 */
export function PanelDeMesa({
  titulo,
  icono,
  accion,
  etiqueta,
  children,
  className = "",
  cuerpoClassName = "p-s3",
}: {
  titulo: string;
  /** D-CF-149: el prototipo no pone icono en la cabecera del registro; se admite sin él. */
  icono?: ReactNode;
  accion?: ReactNode;
  etiqueta: string;
  children: ReactNode;
  className?: string;
  /** Lo que gobierna el scroll del cuerpo. Un panel de columna pasa `scroll-quiet …auto`. */
  cuerpoClassName?: string;
}) {
  return (
    <section
      aria-label={etiqueta}
      className={`flex min-h-0 min-w-0 flex-col rounded-radius-sm border border-muted bg-surface ${className}`}
    >
      {/* D-CF-149 (Task 5b de 3A.3): la cabecera del prototipo (`.reg-cab`) — el título en la
          tipografía de títulos, sin versalitas, y lo que la acompañe (los filtros) a la derecha. */}
      <div className="flex shrink-0 items-center gap-s2 border-b border-muted/40 px-s3 py-s2">
        {icono && <span className="text-copper-text">{icono}</span>}
        <h2 className="min-w-0 flex-1 truncate font-title text-chrome-md text-text">{titulo}</h2>
        {accion}
      </div>
      <div className={`min-h-0 min-w-0 flex-1 ${cuerpoClassName}`}>{children}</div>
    </section>
  );
}
