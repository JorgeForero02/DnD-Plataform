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
 * A filter chip that actually looks pressed when it is. The audit found these rendered as
 * plain buttons with no visible state at all, so you could not tell what was filtering.
 */
export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "rounded-radius-sm border px-2 py-0.5 font-chrome text-chrome-xs transition-colors",
        active
          ? "border-accent bg-[color:var(--accent-tint)] text-accent-text"
          : "border-muted text-muted hover:border-text hover:text-text",
      ].join(" ")}
    >
      {children}
    </button>
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

/**
 * An empty screen is an invitation, not an apology. It says what this section holds and
 * offers the one action that fills it.
 */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-radius-sm border border-dashed border-muted px-s5 py-s8 text-center">
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
