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
  return (
    <div className="mb-s4 rounded-radius-sm border border-muted/50 bg-surface/60 p-s3">
      <div className="flex flex-wrap items-center gap-s3">
        {search && <div className="min-w-[14rem] max-w-sm flex-1">{search}</div>}
        {count && (
          <span className="font-data text-chrome-xs text-muted" data-testid="toolbar-count">
            {count}
          </span>
        )}
        <div className="flex-1" />
        {action}
      </div>
      {filters && <div className="mt-s3 flex flex-wrap items-center gap-s2">{filters}</div>}
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
          ? "border-accent bg-accent/15 text-accent-text"
          : "border-muted/60 text-muted hover:border-muted hover:text-text",
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
      className="group block border-b border-muted/25 px-s3 py-s3 transition-colors hover:bg-surface/70 focus-visible:bg-surface/70"
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
    <div className="rounded-radius-sm border border-dashed border-muted/60 px-s5 py-s8 text-center">
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
