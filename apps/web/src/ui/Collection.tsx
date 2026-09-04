// Reseño 2026-09-02 — the primitives a list screen is made of.
//
// The audit's B1 was the worst finding in the product: every NPC rendered as a 1370x60px bar
// carrying a name, a badge and some tags, and NOT ONE LINE of who they were — even though
// every one of them had a body written. A list you cannot read is a list you have to click
// through one by one.
//
// C3 was the other half: "Nuevo" (new WHAT?), a loose search box with a label stacked above
// it, and tag filters as unlabelled buttons with no visible state, each floating separately
// down the page. Toolbar groups them into one instrument.

import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** One bar holding everything you do TO a list: search, filters, and the action that adds. */
export function Toolbar({
  search,
  filters,
  action,
  count,
}: {
  search?: ReactNode;
  filters?: ReactNode;
  action?: ReactNode;
  count?: ReactNode;
}) {
  // Maqueta 2026-09-03: la barra deja de ser una caja. Era un panel con su borde y su fondo
  // encima de otra caja con borde y fondo —la lista—, así que dos rectángulos idénticos
  // competían por ser el marco. En la maqueta el buscador es un campo ancho y los filtros son
  // fichas a su derecha, en la misma línea: se lee como un instrumento, no como una sección.
  return (
    <div className="mb-s4 flex flex-wrap items-center gap-s3">
      {search && <div className="min-w-[16rem] flex-1">{search}</div>}
      {filters && <div className="flex flex-wrap items-center gap-s2">{filters}</div>}
      {count && (
        <span className="font-data text-chrome-xs text-muted" data-testid="toolbar-count">
          {count}
        </span>
      )}
      {action}
    </div>
  );
}

/**
 * A row that earns its height. Title, one line of what this thing IS, and the marks that
 * classify it — and the whole row is one link, so the name is not a piece of text that
 * happens to sit near something clickable (audit A3: a click on an entity name went nowhere).
 */
export function ListRow({
  to,
  title,
  kind,
  summary,
  marks,
  meta,
}: {
  to: string;
  title: ReactNode;
  kind?: ReactNode;
  summary?: string;
  marks?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <Link
      to={to}
      // Clases enteras: las de opacidad no compilan en este proyecto, así que el filete entre
      // filas y el resalte al pasar por encima **no se pintaban**.
      //
      // El filete es `--muted` entero y no `--copper-rule`, y eso lo decidió una medición: con
      // `--copper-rule` el borde daba **1,09:1** en tema claro, muy por debajo del 3:1 que este
      // proyecto exige a un objeto gráfico. Ese token vale donde nació —sobre la vitela de la
      // hoja, que es cálida— y no sobre `--surface`. Un filete que separa filas tiene que verse;
      // si la elección es entre discreto e invisible, se ve.
      className="group block border-b border-muted px-s3 py-s3 transition-colors hover:bg-surface focus-visible:bg-surface"
    >
      <div className="flex flex-wrap items-baseline gap-x-s3 gap-y-1">
        {kind && (
          <span className="font-chrome text-chrome-xs uppercase tracking-[0.14em] text-copper-text">
            {kind}
          </span>
        )}
        <span className="font-title text-chrome-md text-text group-hover:text-accent-text group-hover:underline">
          {title}
        </span>
        <div className="flex-1" />
        {meta && <span className="font-data text-chrome-xs text-muted">{meta}</span>}
      </div>
      {summary && (
        <p className="mt-1 line-clamp-2 max-w-[80ch] font-world text-chrome-base leading-snug text-muted">
          {summary}
        </p>
      )}
      {marks && <div className="mt-s2 flex flex-wrap items-center gap-s2">{marks}</div>}
    </Link>
  );
}

// C5 (2026-09-04) — `FilterChip` y `EmptyState` **se mudaron** a `ui/FilterChip.tsx` y
// `ui/EmptyState.tsx`, que es donde la maqueta las tiene y donde las busca quien no sabe que
// este fichero existe (la auditoría del 2026-09-04 las dio por ausentes precisamente por eso).
// Se reexportan desde aquí a propósito: hay veinte pantallas importándolas de `./Collection`, y
// una mudanza no tiene por qué costar veinte ediciones en ficheros de otros carriles.
export { FilterChip } from "./FilterChip";
export { EmptyState } from "./EmptyState";
