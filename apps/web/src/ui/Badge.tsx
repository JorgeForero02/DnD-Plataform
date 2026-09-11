import type { Visibility } from "@dnd/shared";
import { ETIQUETA_DE_NIVEL } from "../features/entities/visibilidad";

// Task 1.19 — the one place colour carries meaning. A colour-blind DM must still tell the
// five levels apart, so hue is never the only signal: each level also gets its own icon glyph
// (rendered in currentColor, not an emoji — a coloured glyph would defeat the point and would
// also make the contrast measurement sample the wrong pixels) and its own border style.
// Revert any one row below to the same icon/border as its neighbour and Badge.test.tsx's
// "every level has a distinct icon and a distinct border style" assertion fails.
// **La etiqueta ya no vive aquí** (U6-visibilidad): es `ETIQUETA_DE_NIVEL`, en
// `features/entities/visibilidad.ts`, que este módulo importa como cualquier otro consumidor.
// Icono, borde y tono siguen siendo de `Badge` — son maquetación, no vocabulario de dominio.
const VISIBILITY_CONFIG: Record<
  Visibility,
  { icon: string; border: string; tone: "muted" | "text" | "accent" | "danger" }
> = {
  // Reseño 2026-09-02, segunda pasada: el tono de PUBLIC baja a --muted. Público es el estado
  // por defecto de un mundo compartido y no tiene por qué llamar la atención; lo que un DM
  // necesita encontrar de un vistazo en una lista es lo que está OCULTO, no lo que está a la
  // vista de todos. Antes los cinco niveles gritaban igual.
  PUBLIC: { icon: "○", border: "border-solid", tone: "muted" },
  PLAYERS: { icon: "◐", border: "border-solid", tone: "accent" },
  SPECIFIC_PLAYERS: {
    // Línea discontinua para "solo algunos": el borde roto dice lo mismo que la palabra, y lo
    // dice sin depender del color.
    icon: "◈",
    border: "border-dashed",
    tone: "accent",
  },
  OWNER_DM: { icon: "◆", border: "border-solid", tone: "text" },
  DM_ONLY: { icon: "●", border: "border-solid", tone: "danger" },
};

// Fix round 1, Important 4: the first version forced every label into plain --text to dodge
// the dark-theme contrast shortfall of --accent/--danger as normal-size text, which threw away
// the actual colour signal for the "one place colour carries meaning" primitive — the same
// wrong trade as Field's original error styling. Now that --accent-text/--danger-text exist
// (same hue/saturation, lifted to clear 4.5:1 against --bg/--surface/--vellum in the dark
// theme — see tokens.css), the label and icon both carry real colour again; "text" tone stays
// on plain --text because it was never a contrast problem (PUBLIC/OWNER_DM are neutral by
// design, not a workaround).
const TONE_TEXT: Record<"muted" | "text" | "accent" | "danger", string> = {
  muted: "text-muted",
  text: "text-text",
  accent: "text-accent-text",
  danger: "text-danger-text",
};
const TONE_BORDER: Record<"muted" | "text" | "accent" | "danger", string> = {
  muted: "border-muted",
  text: "border-muted",
  accent: "border-accent",
  danger: "border-danger",
};
// Sólo lo secreto lleva relleno. Es el único nivel que un DM tiene que localizar de un vistazo
// en una lista de treinta filas, y el relleno es lo que hace que salte sin recurrir a más
// tamaño ni a más borde.
//
// **Aquí ponía que el tinte «está medido, no supuesto», y era falso: nunca se pintó.** La clase
// era `bg-danger/10`, y en este proyecto ninguna utilidad de opacidad compila —los colores se
// declaran como `var(--danger)` sin `<alpha-value>`, así que Tailwind la descarta sin avisar—.
// La prueba de contraste componía un alfa contra el fondo y medía, en efecto, un fondo que no
// existía. Ahora es un color completo declarado en `tokens.css`, que sí compila, y el contraste
// se mide sobre lo que de verdad se pinta.
const TONE_FILL: Record<"muted" | "text" | "accent" | "danger", string> = {
  muted: "",
  text: "",
  accent: "",
  danger: "bg-[color:var(--danger-tint)]",
};

export function Badge({ visibility }: { visibility: Visibility }) {
  const config = VISIBILITY_CONFIG[visibility];
  return (
    <span
      data-visibility={visibility}
      // Reseño 2026-09-02, segunda pasada: el borde era de 3 px, y con él la insignia pesaba
      // más que el nombre de la ficha al que acompañaba — el autor lo señaló en cuanto lo vio.
      // Un píxel basta: la señal que distingue los cinco niveles sin depender del color es el
      // GLIFO, que es distinto en los cinco, más la línea discontinua de "jugadores concretos".
      // El grosor nunca fue esa señal, y el contraste no depende de él.
      className={[
        "inline-flex items-center gap-1 whitespace-nowrap rounded-radius-sm border px-1.5 py-px font-chrome text-chrome-xs",
        config.border,
        TONE_BORDER[config.tone],
        TONE_TEXT[config.tone],
        TONE_FILL[config.tone],
      ].join(" ")}
    >
      <span aria-hidden="true" className="text-[0.9em] leading-none">
        {config.icon}
      </span>
      {ETIQUETA_DE_NIVEL[visibility]}
    </span>
  );
}
