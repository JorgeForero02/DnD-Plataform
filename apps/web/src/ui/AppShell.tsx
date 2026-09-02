// Reseño 2026-09-02 — the frame every signed-in screen sits inside.
//
// The audit's B3 and B6: there was no global navigation at all. No header, no brand, no way
// to reach Cuenta from inside a campaign, no breadcrumb — the only permanent control in the
// entire product was an unlabelled asterisk in a corner. This is that missing frame.
//
// Two skins, and the seam is deliberate (see specs/2026-09-02-identidad-visual-design.md):
// the chrome is the dark instrument you OPERATE, and it never borrows the world's voice.
// Panels with tone="vellum" are where the world is READ. A settings form is never parchment.

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CartographicGrid, CompassMark } from "./Ornament";

export interface Crumb {
  label: string;
  to?: string;
}

/**
 * Breadcrumbs. A crumb with a destination is a link; a crumb without one is where you are.
 *
 * The first version decided that by POSITION — last crumb means current page — which quietly
 * turned "Mis campañas" into dead text on any screen that listed it alone, and a test caught
 * it. Position was the wrong rule: the caller knows which crumb is the page, and says so by
 * omitting `to`.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Migas de pan" className="font-chrome text-chrome-xs text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1">
              {item.to ? (
                <Link to={item.to} className="hover:text-accent-text hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-text">
                  {item.label}
                </span>
              )}
              {!last && (
                <span aria-hidden="true" className="text-copper opacity-60">
                  ›
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The page's own header: title in the engraved voice, an optional line saying what this
 * screen is for, and the actions that belong to it — grouped, so controls stop floating
 * loose the way the audit found them (C3).
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  crumbs,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  crumbs?: Crumb[];
}) {
  return (
    <header className="mb-s5">
      {crumbs && crumbs.length > 0 && (
        <div className="mb-s2">
          <Breadcrumbs items={crumbs} />
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-s4">
        <div className="min-w-0">
          <h1 className="font-title text-chrome-2xl leading-tight text-text">{title}</h1>
          {subtitle && (
            <p className="mt-1 max-w-[70ch] font-chrome text-chrome-sm text-muted">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-s2">{actions}</div>}
      </div>
      <div className="mt-s3 h-px w-full bg-copper opacity-30" />
    </header>
  );
}

/**
 * The global bar. Present on every signed-in screen, which is the whole point: the brand, the
 * way back to your campaigns, and your own account, always in the same place.
 */
export function AppHeader({
  userName,
  onLogout,
  right,
}: {
  userName?: string;
  onLogout?: () => void;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-muted/40 bg-surface/95 backdrop-blur">
      {/* pr-14 reserves the top-right corner that ThemeToggle occupies — it is `fixed`, mounted
          once in App.tsx so it exists on every route including the ones with no header, and it
          sat directly on top of "Cuenta" and "Salir" here. Playwright caught it as a click that
          never landed ("waiting for element to be visible, enabled and stable"), which is
          exactly the kind of thing a screenshot review would have missed. */}
      <div className="mx-auto flex h-12 max-w-[1400px] items-center gap-s4 px-s4 pr-14">
        <Link
          to="/"
          className="flex items-center gap-s2 font-title text-chrome-md text-text hover:text-copper-text"
        >
          <CompassMark className="text-copper" />
          <span>Plataforma D&amp;D</span>
        </Link>
        <div className="flex-1" />
        {right}
        {userName && (
          <span className="hidden font-chrome text-chrome-xs text-muted sm:inline">{userName}</span>
        )}
        <Link
          to="/account"
          className="font-chrome text-chrome-xs text-muted hover:text-accent-text hover:underline"
        >
          Cuenta
        </Link>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="font-chrome text-chrome-xs text-muted hover:text-danger-text hover:underline"
          >
            Salir
          </button>
        )}
      </div>
    </header>
  );
}

/**
 * The page frame. `aside` is optional: a campaign gets its own navigation column, a standalone
 * screen like Cuenta does not, and neither has to know about the other.
 *
 * The width cap is not decoration. The audit's C2 found a 20-character campaign name in a
 * 1340px-wide field; nothing here is allowed to grow to the width of the monitor.
 */
export function AppShell({
  children,
  aside,
  header,
}: {
  children: ReactNode;
  aside?: ReactNode;
  header?: ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-bg text-text">
      <CartographicGrid />
      <div className="relative">
        {header}
        <div className="mx-auto flex max-w-[1400px] gap-s6 px-s4 py-s5">
          {aside && (
            <aside className="hidden w-56 shrink-0 lg:block">
              <div className="sticky top-16">{aside}</div>
            </aside>
          )}
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
