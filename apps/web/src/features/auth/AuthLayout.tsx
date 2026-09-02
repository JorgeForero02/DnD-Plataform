// Reseño 2026-09-02 — the entry screens.
//
// What they were: a 320px card floating dead centre on an otherwise empty cream field, with
// no product name anywhere on it, half the labels in English, and an unlabelled asterisk in
// the corner as the only other control on the page. Nothing said what this was or who it was
// for.
//
// What they are now: the author asked for ornament that "enriquezca pero no estorbe" — a
// drawn landscape over a grid. So the page frames the form with a surveyor's lattice and a
// horizon put down mid-stroke, both in copper at low opacity, both BEHIND and BESIDE the form
// and never under its text. The form itself stays chrome: sober, dense, and readable, because
// signing in is work, not atmosphere.

import type { ReactNode } from "react";
import { CartographicGrid, OrnamentRule } from "../../ui/Ornament";
import { Logo } from "../../ui/Logo";

export function AuthLayout({
  title,
  lead,
  children,
  footer,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg px-s4 py-s8 text-text">
      {/* Reseño 2026-09-02, tercera pasada: fuera el horizonte dibujado. Se probaron dos
          versiones —rectas y curvas— y ninguna convenció al autor: "quita esas líneas, no me
          gustan nada". Queda solo la cuadrícula, que enmarca sin dibujar nada. El componente
          sigue en ui/Ornament.tsx por si algún día vuelve, pero **no lo usa nadie**. */}
      <CartographicGrid />

      <div className="relative w-full max-w-sm">
        <div className="mb-s5 text-center">
          <div className="mb-s4 flex justify-center">
            <Logo size="lg" />
          </div>
          <h1 className="font-title text-chrome-2xl leading-tight text-text">{title}</h1>
          {lead && <p className="mt-s2 font-world text-chrome-base text-muted">{lead}</p>}
        </div>

        <div className="rounded-radius-sm border border-muted/60 bg-surface/95 p-s5 shadow-sm backdrop-blur">
          {children}
        </div>

        {footer && (
          <>
            <OrnamentRule className="my-s4" />
            <p className="text-center font-chrome text-chrome-xs text-muted">{footer}</p>
          </>
        )}
      </div>
    </div>
  );
}
