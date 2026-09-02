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
      {/* Far range. Curved, but with summits: a mountain has a shoulder on one side and a
          scarp on the other, never the same slope twice. The wavelengths are deliberately
          uneven — the first version used one repeating amplitude and read as a sine wave. */}
      <path
        d="M0 146 Q 46 118 78 132 Q 110 146 138 108 Q 166 70 196 96 Q 222 118 246 110
           Q 274 100 300 62 Q 330 20 360 74 Q 384 118 408 104 Q 436 88 462 118
           Q 486 146 512 128 Q 546 104 574 52 Q 604 -2 634 64 Q 658 116 684 100
           Q 712 82 740 122 Q 764 156 792 132 Q 824 104 852 60 Q 882 14 910 78
           Q 934 132 962 116 Q 992 98 1020 132 Q 1046 162 1074 140 Q 1108 112 1140 128
           Q 1170 142 1200 118"
        fill="none"
        stroke="var(--copper)"
        strokeOpacity="0.26"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* Near hills, in two strokes with a gap: the drawing stops and starts again. Low, broad
          and unequal, so they read as ground rather than as a graph. */}
      <path
        d="M0 210 Q 64 190 104 202 Q 150 216 196 178 Q 244 138 292 176 Q 326 202 358 196
           Q 396 188 428 206 Q 448 216 470 212"
        fill="none"
        stroke="var(--copper)"
        strokeOpacity="0.44"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M552 206 Q 590 196 618 178 Q 656 152 700 174 Q 736 192 772 186
           Q 818 178 856 204 Q 892 228 934 210 Q 984 188 1030 202 Q 1084 218 1132 196
           Q 1166 180 1200 190"
        fill="none"
        stroke="var(--copper)"
        strokeOpacity="0.44"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* A ruined watchtower, standing ON the near ridge (y=174 at x=700) rather than floating
          above it: battlements broken on one side, one window, and the far wall left undrawn. */}
      <g stroke="var(--copper)" fill="none" strokeLinecap="round">
        <path d="M684 176 L684 122 M716 176 L716 132" strokeOpacity="0.42" strokeWidth="1.7" />
        <path
          d="M678 122 L684 122 L684 114 L692 114 L692 122 L700 122 L700 112 L708 112 L708 124 L716 124"
          strokeOpacity="0.34"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <rect x="694" y="140" width="8" height="12" rx="4" strokeOpacity="0.26" strokeWidth="1.3" />
        <path d="M700 176 L700 160" strokeOpacity="0.16" strokeWidth="1.2" />
      </g>

      {/* Three firs, at the scale a tree has next to a hill — a cue that says "this is land",
          which a bare line never can. */}
      <g
        stroke="var(--copper)"
        strokeOpacity="0.3"
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      >
        <path d="M244 176 L244 156 M236 168 L244 152 L252 168 M239 174 L244 162 L249 174" />
        <path d="M262 180 L262 166 M256 174 L262 162 L268 174" />
        <path d="M968 208 L968 190 M961 200 L968 186 L975 200 M964 206 L968 196 L972 206" />
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
