// C5 (2026-09-04) — la primitiva del hueco vacío, en su propio fichero.
//
// La auditoría del 2026-09-04 la dio por **ausente** («20 ficheros repiten "Todavía no hay…" a
// mano»). No lo estaba: vivía dentro de `ui/Collection.tsx`, junto a `Toolbar`, `FilterChip` y
// `ListRow`, y **la usan veinte pantallas**. Lo que faltaba era que se pudiera encontrar: quien
// busca `ui/EmptyState.tsx` —que es el nombre que tiene en la maqueta— no daba con ella y
// escribía el suyo. Ahora está donde se la busca, y `ui/Collection.tsx` la reexporta para que
// las veinte importaciones que ya existen sigan valiendo.
//
// De la maqueta (`prototipo/src/ui/EmptyState.tsx`) entra lo único que aquí no había: el
// **icono** sobre el título. Lo demás se queda como estaba —el recuadro de trazo discontinuo y
// la ranura `action`—, porque la versión de esta casa es la más rica de las dos y veinte
// llamadas dependen de su forma. Los nombres de las propiedades van en inglés, como el resto
// del código de este repositorio (`docs/04-convenciones.md`).

import type { ReactNode } from "react";

/**
 * An empty screen is an invitation, not an apology. It says what this section holds and
 * offers the one action that fills it.
 */
export function EmptyState({
  title,
  children,
  action,
  icon,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-radius-sm border border-dashed border-muted px-s5 py-s8 text-center">
      {/* El dibujo, cuando lo hay, va arriba y en `--muted`: acompaña al título, no compite con
          él. `[&>svg]:size-8` porque los iconos de `ui/Iconos.tsx` se dimensionan en `1em` para
          vivir dentro de una línea de texto, y aquí no hay línea que los dimensione. */}
      {icon && (
        <span className="mb-s2 inline-flex justify-center text-muted [&>svg]:size-8">{icon}</span>
      )}
      <p className="font-title text-chrome-lg text-text">{title}</p>
      {children && (
        <p className="mx-auto mt-s2 max-w-[52ch] font-chrome text-chrome-sm text-muted">
          {children}
        </p>
      )}
      {action && <div className="mt-s4 flex justify-center">{action}</div>}
    </div>
  );
}
