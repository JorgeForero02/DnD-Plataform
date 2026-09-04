import type { ReactNode } from "react";

export type PanelTone = "chrome" | "vellum";

export interface PanelProps {
  tone?: PanelTone;
  className?: string;
  children: ReactNode;
}

// The torn top edge of the vellum panel — the one signature element the brief asks for
// ("spend your boldness here, and only here"). A fixed, deterministic polygon (not
// Math.random) so screenshots and the contrast measurement stay stable between runs. The
// amplitude tops out at 10px; VELLUM_TOP_PADDING below clears it so no content sits under the
// torn strip.
const VELLUM_EDGE_CLIP_PATH =
  "polygon(0% 10px, 6% 2px, 13% 8px, 19% 0px, 26% 6px, 33% 1px, 40% 9px, 47% 3px, 54% 7px, " +
  "61% 0px, 68% 8px, 75% 2px, 82% 9px, 89% 1px, 96% 6px, 100% 3px, 100% 100%, 0% 100%)";

// Task 1.19 — Panel.test.tsx asserts tone="vellum" carries the font-world class, the 66ch
// measure, and this clip-path; revert either and that test fails while tone="chrome" still
// passes, which is the point (chrome stays deliberately plain). The vellum panel also carries
// a hairline `border-muted` — the brief's own words for the signature element: "separated by
// a hairline rule and a subtly irregular top edge". The clip-path traces the border along the
// torn silhouette on top; the straight hairline reads on the other three sides.
export function Panel({ tone = "chrome", className = "", children }: PanelProps) {
  if (tone === "vellum") {
    return (
      <div
        data-tone="vellum"
        style={{ clipPath: VELLUM_EDGE_CLIP_PATH }}
        className={[
          // C5 (2026-09-04) — `textura-vitela` (ui/tokens.css) añade las dos manchas radiales
          // de la maqueta. Es **aditiva**: pinta un `background-image` y deja intactos el
          // borde rasgado (`clipPath`, arriba), la medida de 66ch y el `bg-vellum` que la
          // medición de contraste de este fichero documenta — la clase repite ese mismo
          // `background-color` para que quitar `bg-vellum` no deje el panel transparente.
          "textura-vitela bg-vellum px-s6 pb-s6 font-world text-world-base text-vellum-ink",
          "max-w-[66ch] border border-muted",
          className,
        ].join(" ")}
      >
        {/* The clip-path itself carries the torn silhouette; this spacer just keeps content
            clear of the jagged strip (up to 10px) plus normal breathing room. */}
        <div className="pt-[calc(theme(spacing.s5)+10px)]">{children}</div>
      </div>
    );
  }

  return (
    <div
      data-tone="chrome"
      className={[
        "rounded-radius-sm border border-muted bg-surface p-4 font-chrome text-chrome-sm text-text",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
