// C5 (2026-09-04) — la ficha de filtro, en su propio fichero.
//
// Misma historia que `ui/EmptyState.tsx`: la auditoría la dio por ausente y en realidad vivía
// escondida dentro de `ui/Collection.tsx`. Aquí está con el nombre con el que se la busca, y
// `ui/Collection.tsx` la reexporta para no romper las importaciones que ya existen.
//
// De la maqueta (`prototipo/src/ui/FilterChip.tsx`) entra el **icono** delante del texto. El
// color del estado activo se queda en `--accent`, y no pasa al cobre de la maqueta, porque el
// cobre en esta aplicación es la voz del mundo y una ficha de filtro es cromo: es el mismo
// reparto que `docs/04-convenciones.md` fija para las dos pieles.

import type { ReactNode } from "react";

/**
 * A filter chip that actually looks pressed when it is. The audit found these rendered as
 * plain buttons with no visible state at all, so you could not tell what was filtering.
 */
export function FilterChip({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        // Espaciado por tokens (`gap-s1 px-s3 py-s1`), como la maqueta, y no `gap-1 px-2 py-0.5`
        // literales: en este proyecto la escala de espacio vive en `ui/tokens.css` y una ficha
        // que se salga de ella se descuadra el día que la escala cambie.
        "inline-flex items-center gap-s1 rounded-radius-sm border px-s3 py-s1",
        "font-chrome text-chrome-xs transition-colors",
        active
          ? "border-accent bg-[color:var(--accent-tint)] text-accent-text"
          : "border-muted text-muted hover:border-text hover:text-text",
      ].join(" ")}
    >
      {/* El envoltorio con `[&>svg]:size-4` es de la maqueta y hace falta: los iconos de
          `ui/Iconos.tsx` se dimensionan en `1em` para vivir dentro de una línea de texto, y aquí
          esa línea es `text-chrome-xs` —12 px—, así que sin esto el dibujo sale a 12 px en vez
          de a los 16 que pide la ficha. `aria-hidden` lo pone el propio icono, así que el nombre
          accesible del botón sigue siendo exactamente el texto de la ficha. */}
      {icon && <span className="[&>svg]:size-4">{icon}</span>}
      {children}
    </button>
  );
}
