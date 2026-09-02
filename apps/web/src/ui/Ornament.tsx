// Reseño 2026-09-02 — the ornament layer.
//
// The author's own words: ornament and texture are welcome, "dibujos a medio hacer y demas
// cosas que enriquescan pero no estorben". So the rule this file enforces is not "no
// ornament", it is: ornament that INFORMS or FRAMES, never ornament that competes with
// content.
//
// Everything here is drawn, not photographed, and every piece is deterministic — no
// Math.random — so screenshots and the contrast measurement stay stable between runs.
//
// On contrast: the grid paints at <=5% alpha of --copper. The contrast spec composites
// background COLOURS, and an SVG background-image is not one, so a heavy pattern here could
// silently degrade a ratio the test still reports as passing. That is exactly why the alpha
// is capped this low and why the grid never sits directly behind a block of running text —
// it frames the page, it is not a surface for reading on.

import type { ReactNode } from "react";

/** The campaign-table grid: a surveyor's lattice, the faintest hint of a map under glass. */
export function CartographicGrid({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={["pointer-events-none absolute inset-0 overflow-hidden", className].join(" ")}
    >
      <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="orn-grid-fine" width="24" height="24" patternUnits="userSpaceOnUse">
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="var(--copper)"
              strokeOpacity="0.05"
              strokeWidth="1"
            />
          </pattern>
          <pattern id="orn-grid-coarse" width="120" height="120" patternUnits="userSpaceOnUse">
            <rect width="120" height="120" fill="url(#orn-grid-fine)" />
            <path
              d="M 120 0 L 0 0 0 120"
              fill="none"
              stroke="var(--copper)"
              strokeOpacity="0.08"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#orn-grid-coarse)" />
      </svg>
    </div>
  );
}

/**
 * A horizon of hills, drawn the way a cartographer sketches a coastline: one unbroken line,
 * unfinished on purpose. Sits at the foot of the entry screens.
 */
export function DrawnHorizon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 220"
      preserveAspectRatio="none"
      className={["pointer-events-none absolute inset-x-0 bottom-0 h-56 w-full", className].join(
        " ",
      )}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Far range — lighter, so distance reads without haze or blur. */}
      <path
        d="M0 168 L92 128 L148 150 L214 104 L286 146 L352 118 L430 158 L512 122 L586 152
           L664 116 L742 154 L822 126 L904 160 L982 130 L1062 156 L1132 134 L1200 162"
        fill="none"
        stroke="var(--copper)"
        strokeOpacity="0.22"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Near range, and the gap in the stroke is the point: a drawing put down mid-line. */}
      <path
        d="M0 196 L118 162 L196 186 L268 148 L344 184 L420 158"
        fill="none"
        stroke="var(--copper)"
        strokeOpacity="0.4"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M486 176 L560 150 L648 190 L724 156 L806 188 L890 152 L968 186 L1052 158
           L1128 182 L1200 164"
        fill="none"
        stroke="var(--copper)"
        strokeOpacity="0.4"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* A tower, half drawn. */}
      <path
        d="M660 190 L660 138 L688 138 L688 190"
        fill="none"
        stroke="var(--copper)"
        strokeOpacity="0.34"
        strokeWidth="1.5"
      />
      <path
        d="M652 138 L696 138 M666 128 L666 138 M682 130 L682 138"
        fill="none"
        stroke="var(--copper)"
        strokeOpacity="0.24"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** The brand mark: a compass rose reduced to its four points and a ring. */
export function CompassMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={["h-5 w-5 shrink-0", className].join(" ")}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path d="M12 2.5 L14 10 L12 12 L10 10 Z" fill="currentColor" />
      <path d="M12 21.5 L10 14 L12 12 L14 14 Z" fill="currentColor" opacity="0.5" />
      <path d="M2.5 12 L10 10 L12 12 L10 14 Z" fill="currentColor" opacity="0.5" />
      <path d="M21.5 12 L14 14 L12 12 L14 10 Z" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/**
 * A section divider with a diamond at its centre — the engraver's rule. Takes an optional
 * label, because a divider that names what follows is doing work, and a bare one is decoration.
 */
export function OrnamentRule({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={["flex items-center gap-s3 text-copper", className].join(" ")}
      role="presentation"
    >
      <span className="h-px flex-1 bg-current opacity-40" />
      {children ? (
        <span className="font-chrome text-chrome-xs uppercase tracking-[0.18em] text-muted">
          {children}
        </span>
      ) : (
        <span aria-hidden="true" className="text-chrome-xs leading-none">
          ◆
        </span>
      )}
      <span className="h-px flex-1 bg-current opacity-40" />
    </div>
  );
}
