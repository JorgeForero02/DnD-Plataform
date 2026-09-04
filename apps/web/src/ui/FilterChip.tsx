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
        "inline-flex items-center gap-1 rounded-radius-sm border px-2 py-0.5",
        "font-chrome text-chrome-xs transition-colors",
        active
          ? "border-accent bg-[color:var(--accent-tint)] text-accent-text"
          : "border-muted text-muted hover:border-text hover:text-text",
      ].join(" ")}
    >
      {/* `aria-hidden` lo pone el propio icono (`ui/Iconos.tsx`), así que el nombre accesible
          del botón sigue siendo exactamente el texto de la ficha. */}
      {icon}
      {children}
    </button>
  );
}
