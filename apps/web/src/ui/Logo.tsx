// Reseño 2026-09-02, segunda pasada — the mark and the wordmark.
//
// The author's note: "que el logo no sea un emoji". Two things were: the browser tab had no
// icon at all (so it fell back to the browser's own generic glyph), and the theme control was
// a "☾"/"☀" character — a font glyph that renders as an emoji on some platforms and as a
// hollow box on others, and that carries none of the identity.
//
// Everything here is drawn: a compass rose crossed by a rule, which is the same cartographic
// idea the background grid and the horizon come from. It is stroke-based and inherits
// currentColor, so it works at 16px in a tab and at 40px in a header, in both themes, without
// a second asset.

/** The mark on its own. Square, centred, safe down to 16px. */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className={["shrink-0", className].join(" ")}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* The ring, broken at the cardinal points so the needle reads as passing through it. */}
      <circle
        cx="16"
        cy="16"
        r="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4.5 2.6"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* North point: filled, so the eye finds the top immediately. */}
      <path d="M16 3.5 L19.2 14.4 L16 16 L12.8 14.4 Z" fill="currentColor" />
      {/* The other three, hollow — a rose, not a star. */}
      <path
        d="M16 28.5 L12.8 17.6 L16 16 L19.2 17.6 Z M3.5 16 L14.4 12.8 L16 16 L14.4 19.2 Z
           M28.5 16 L17.6 19.2 L16 16 L17.6 12.8 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Mark plus name. `size="lg"` for the entry screens, `size="sm"` for the app bar — the same
 * lockup at two weights, not two different logos.
 */
export function Logo({ size = "sm", className = "" }: { size?: "sm" | "lg"; className?: string }) {
  const grande = size === "lg";
  return (
    <span className={["inline-flex items-center gap-s2", className].join(" ")}>
      <BrandMark className={grande ? "h-9 w-9 text-copper" : "h-6 w-6 text-copper"} />
      <span
        className={[
          "font-title leading-none text-text",
          grande ? "text-chrome-xl tracking-[0.06em]" : "text-chrome-md tracking-[0.04em]",
        ].join(" ")}
      >
        {/* **«Sala de Guerra», elegido por el autor el 2026-09-03.** Decía «Plataforma D&D», que
            es una categoría y no un nombre: describe qué es la cosa, no cuál es. La identidad se
            llama «sala de guerra» desde el reseño —pizarra naval y cobre, mapas sobre una mesa
            larga— y era el único sitio donde ese nombre no había llegado. */}
        Sala de&nbsp;
        {/* La cursiva en serif es el único adorno del logotipo: hace el trabajo que normalmente
            pide una ilustración. */}
        <span className="italic text-copper-text">Guerra</span>
      </span>
    </span>
  );
}

/** Sun and moon, drawn. Same stroke language as the mark, so the chrome has one hand. */
export function IconSol({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={["h-4 w-4", className].join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.4M12 19v2.4M2.6 12h2.4M19 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7" />
    </svg>
  );
}

export function IconLuna({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={["h-4 w-4", className].join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.2 14.6A8.6 8.6 0 0 1 9.4 3.8a8.6 8.6 0 1 0 10.8 10.8Z" />
    </svg>
  );
}

/**
 * B0 (2026-09-04) — la tercera voz del conmutador de tema: **Lectura**, la vitela.
 * Un libro abierto, dibujado con el mismo trazo que el sol y la luna de arriba, porque el
 * grupo se lee como un grupo o no significa nada. Dibujado y no un glifo de fuente: la regla
 * vinculante de `docs/04-convenciones.md` («los iconos se dibujan») nació justo de sustituir
 * el sol y la luna que este icono acompaña.
 */
export function IconLibro({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={["h-4 w-4", className].join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 6.4C10.4 5 8.3 4.4 5.2 4.4v13c3.1 0 5.2.6 6.8 2 1.6-1.4 3.7-2 6.8-2v-13c-3.1 0-5.2.6-6.8 2Z" />
      <path d="M12 6.4v13" />
    </svg>
  );
}
