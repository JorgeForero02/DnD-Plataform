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
import { Link, useMatch } from "react-router-dom";
import { CartographicGrid } from "./Ornament";
import { Logo } from "./Logo";
import { LegalNotice } from "./LegalNotice";
import { BarraDeSesion } from "../features/sessions/BarraDeSesion";
import { useAuthStore } from "../store/auth.store";
import { BandejaDeAvisos } from "../features/notifications/BandejaDeAvisos";

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
  // El armazón ya consulta la ruta por su cuenta (la barra de sesión, más abajo); consultar el
  // estado de sesión es del mismo orden y evita que cada pantalla pública tenga que acordarse.
  const sesionIniciada = useAuthStore((s) => s.token !== null);
  return (
    // Reseño 2026-09-02, segunda pasada. La primera cabecera medía 48 px, iba del mismo color
    // que las tarjetas y se separaba con un filete gris: el autor dijo que "casi no se nota", y
    // tenía razón — no se distinguía del contenido que debía enmarcar. Ahora:
    //  · 64 px de alto, que es lo que hace falta para que el logotipo respire;
    //  · un fondo propio, más oscuro que la superficie de las tarjetas, para que sea el marco
    //    y no una tarjeta más;
    //  · un filete de cobre abajo, que es la única línea de acento de toda la pantalla;
    //  · y las acciones agrupadas a la derecha, separadas del nombre por una barra vertical, en
    //    vez de tres enlaces sueltos flotando a la misma distancia.
    // **La cabecera era transparente y nadie lo sabía.** Llevaba `bg-bg/95` y `border-copper/40`,
    // y en este proyecto **ninguna clase de opacidad compila**: los colores se declaran como
    // `var(--bg)` sin `<alpha-value>`, así que Tailwind descarta la utilidad entera sin avisar.
    // O sea que el marco que enmarca toda la aplicación no tenía ni fondo ni filete: el contenido
    // se veía pasar por debajo, solo desenfocado. `--chrome-veil` es ese mismo 95 % declarado
    // como color completo en `tokens.css`, que sí compila.
    <header className="sticky top-0 z-30 border-b border-copper bg-[color:var(--chrome-veil)] shadow-[0_1px_0_0_var(--surface)] backdrop-blur">
      {/* El hueco de la derecha esta reservado para el conmutador de tema, que flota fijo en
          esa esquina (ui/ThemeToggle.tsx). B0 (2026-09-04): paso de un boton a un grupo de
          TRES opciones visibles, asi que `pr-16` dejo de bastar y el grupo tapaba «Cuenta» —
          lo cazaron `e2e/tokens-contrast.spec.ts` y `e2e/campana.spec.ts`, que hacen clic en
          «Cuenta» y en «Salir». La reserva es 7,5rem contra un grupo de ancho FIJO de 6,5rem,
          que empieza a 0,5rem del borde: sobra medio rem y no depende de la tipografia.
          `e2e/armazon.spec.ts` lo mide en vez de confiar en esta cuenta. */}
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-s4 px-s5 pr-[7.5rem]">
        <Link
          to="/"
          className="rounded-radius-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          aria-label="Ir a mis campañas"
        >
          <Logo />
        </Link>
        <div className="flex-1" />
        {right}
        {/* Plan 12 · 12.2 — **la bandeja, junto al conmutador de tema**, que flota fijo en esa
            misma esquina. Se monta aquí y no en cada pantalla por el mismo motivo que «Cuenta»:
            un aviso que solo se ve en una pantalla es un aviso que no se ve. Y **solo con sesión
            iniciada**: sin ella no hay bandeja que pedir, y la cabecera se pinta también en
            `/acerca-de`, en la invitación y en el 404. */}
        {sesionIniciada && <BandejaDeAvisos />}
        {userName && (
          <span className="hidden items-center gap-s3 font-chrome text-chrome-xs text-muted sm:flex">
            <span className="h-4 w-px bg-muted" aria-hidden="true" />
            {userName}
          </span>
        )}
        <nav className="flex items-center gap-s3" aria-label="Tu cuenta">
          {/* C5 (2026-09-04) — **«Cuenta» solo se ofrece a quien tiene una.** `/acerca-de` es
              pública, y ahora también lo son la invitación y el 404, así que un anónimo veía un
              enlace a `/account` que `ProtectedRoute` rebotaba a `/login` sin explicar nada: la
              interfaz ofrecía algo que el servidor no cumple, que es exactamente lo que
              `docs/04-convenciones.md` prohíbe. Se decide con el estado de sesión y no con una
              propiedad, porque una propiedad es una regla que se olvida en la siguiente pantalla
              pública que alguien añada — y `userName` no vale: llega vacío durante la
              rehidratación de una sesión que sí existe. A cambio se le ofrece la puerta que sí
              puede cruzar. */}
          {sesionIniciada ? (
            <Link
              to="/account"
              className="font-chrome text-chrome-xs text-muted hover:text-accent-text hover:underline"
            >
              Cuenta
            </Link>
          ) : (
            <Link
              to="/login"
              className="font-chrome text-chrome-xs text-muted hover:text-accent-text hover:underline"
            >
              Entrar
            </Link>
          )}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="font-chrome text-chrome-xs text-muted hover:text-danger-text hover:underline"
            >
              Salir
            </button>
          )}
        </nav>
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
  // La barra de sesión solo existe dentro de una campaña. Se decide aquí, mirando la ruta, y no
  // dentro de la barra: consultar la sesión es una llamada de datos, y `/acerca-de` es pública y
  // se monta sin cliente de consultas.
  const enCampana = useMatch("/campaigns/:id");
  const bajoCampana = useMatch("/campaigns/:id/*");
  const campaignId = (enCampana ?? bajoCampana)?.params.id;
  return (
    // `flex flex-col` + `min-h-screen`: **el pie se queda abajo aunque la pantalla tenga poco
    // contenido**. Antes la atribución iba pegada al final del contenido y dejaba medio lienzo
    // vacío por debajo, que es lo que el autor describió como «los espacios no se usan como se
    // debe». Ahora el cuerpo crece y el pie se apoya en el borde inferior.
    <div className="relative flex min-h-screen flex-col bg-bg text-text">
      <CartographicGrid />
      <div className="relative flex flex-1 flex-col">
        {header}
        {/* Una sola vez para toda la aplicación: pasarla por parámetro desde cada página sería
            una regla que se olvida en la siguiente pantalla que alguien añada. */}
        {campaignId && <BarraDeSesion campaignId={campaignId} />}
        <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-s6 px-s4 py-s5">
          {aside && (
            <aside className="hidden w-56 shrink-0 lg:block">
              <div className="sticky top-20">{aside}</div>
            </aside>
          )}
          <main className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1">{children}</div>
            {/* La atribucion del SRD va AQUI y no en cada pantalla: la CC BY la pide en la obra
                distribuida, y el armazon es lo unico que toda pantalla con sesion comparte.
                Ponerla pantalla por pantalla seria una regla que se olvida en la siguiente. */}
            <LegalNotice />
          </main>
        </div>
      </div>
    </div>
  );
}
