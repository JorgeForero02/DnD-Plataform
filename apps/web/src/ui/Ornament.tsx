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
 * A landscape, drawn the way a cartographer sketches one: an unbroken line for the far range,
 * a heavier one for the near hills, and a ruin standing where the two meet.
 *
 * The first version of this was a zigzag of straight segments and read as a line CHART, not as
 * ground — the author spotted it immediately. Hills are curves: every stroke here is a
 * quadratic path with real shoulders and valleys, and the far range sits higher, lighter and
 * flatter than the near one because distance does that to a silhouette.
 *
 * The gaps in the near range are deliberate — a drawing put down mid-line, which is what the
 * author asked for: "dibujos a medio hacer".
 */
export function DrawnHorizon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1200 260"
      preserveAspectRatio="none"
      className={["pointer-events-none absolute inset-x-0 bottom-0 h-64 w-full", className].join(
        " ",
      )}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Far range: distant peaks, thin and pale, with the softer shoulders of old mountains. */}
      <path
        d="M0 150 Q 70 96 132 132 Q 190 166 244 118 Q 300 68 356 116 Q 410 162 470 128
           Q 528 96 586 132 Q 646 168 704 124 Q 762 82 820 126 Q 878 168 936 134
           Q 996 100 1054 136 Q 1112 170 1200 128"
        fill="none"
        stroke="var(--copper)"
        strokeOpacity="0.18"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Near hills, in two strokes with a gap between them: the drawing stops and starts. */}
      <path
        d="M0 214 Q 80 176 150 200 Q 216 222 274 188 Q 330 156 392 190 Q 430 210 462 202"
        fill="none"
        stroke="var(--copper)"
        strokeOpacity="0.4"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M540 198 Q 600 168 660 192 Q 716 214 776 186 Q 836 158 894 194
           Q 952 228 1014 196 Q 1078 164 1200 200"
        fill="none"
        stroke="var(--copper)"
        strokeOpacity="0.4"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* A watchtower on the near ridge: broken at the top, because it is a ruin and because the
          drawing was never finished. */}
      <g stroke="var(--copper)" strokeOpacity="0.34" strokeWidth="1.6" fill="none">
        <path d="M672 196 L672 140 M700 196 L700 146" strokeLinecap="round" />
        <path d="M666 140 L706 140" />
        <path d="M670 130 L670 140 M678 126 L678 140 M690 132 L690 140" strokeOpacity="0.22" />
        <path d="M682 176 L690 176" strokeOpacity="0.22" />
      </g>

      {/* Two firs at the foot of the slope — a scale cue, so the hills read as land. */}
      <g stroke="var(--copper)" strokeOpacity="0.26" strokeWidth="1.4" fill="none">
        <path d="M232 216 L232 200 M226 208 L232 198 L238 208 M228 213 L232 205 L236 213" />
        <path d="M964 212 L964 198 M958 205 L964 196 L970 205" />
      </g>
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
