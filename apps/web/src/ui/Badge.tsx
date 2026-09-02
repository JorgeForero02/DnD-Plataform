import type { Visibility } from "@dnd/shared";

// Task 1.19 — the one place colour carries meaning. A colour-blind DM must still tell the
// five levels apart, so hue is never the only signal: each level also gets its own icon glyph
// (rendered in currentColor, not an emoji — a coloured glyph would defeat the point and would
// also make the contrast measurement sample the wrong pixels) and its own border style.
// Revert any one row below to the same icon/border as its neighbour and Badge.test.tsx's
// "every level has a distinct icon and a distinct border style" assertion fails.
const VISIBILITY_CONFIG: Record<
  Visibility,
  { label: string; icon: string; border: string; tone: "text" | "accent" | "danger" }
> = {
  PUBLIC: { label: "Público", icon: "○", border: "border-solid", tone: "text" },
  PLAYERS: { label: "Jugadores", icon: "◐", border: "border-solid", tone: "accent" },
  SPECIFIC_PLAYERS: {
    label: "Jugadores concretos",
    icon: "◈",
    border: "border-dashed",
    tone: "accent",
  },
  OWNER_DM: { label: "DM y creador", icon: "◆", border: "border-double", tone: "text" },
  DM_ONLY: { label: "Solo DM", icon: "●", border: "border-solid", tone: "danger" },
};

// Fix round 1, Important 4: the first version forced every label into plain --text to dodge
// the dark-theme contrast shortfall of --accent/--danger as normal-size text, which threw away
// the actual colour signal for the "one place colour carries meaning" primitive — the same
// wrong trade as Field's original error styling. Now that --accent-text/--danger-text exist
// (same hue/saturation, lifted to clear 4.5:1 against --bg/--surface/--vellum in the dark
// theme — see tokens.css), the label and icon both carry real colour again; "text" tone stays
// on plain --text because it was never a contrast problem (PUBLIC/OWNER_DM are neutral by
// design, not a workaround).
const TONE_TEXT: Record<"text" | "accent" | "danger", string> = {
  text: "text-text",
  accent: "text-accent-text",
  danger: "text-danger-text",
};
const TONE_BORDER: Record<"text" | "accent" | "danger", string> = {
  text: "border-muted",
  accent: "border-accent",
  danger: "border-danger",
};

export function Badge({ visibility }: { visibility: Visibility }) {
  const config = VISIBILITY_CONFIG[visibility];
  return (
    <span
      data-visibility={visibility}
      className={[
        "inline-flex items-center gap-1 rounded-radius-sm border-[3px] px-1.5 py-0.5 font-chrome text-chrome-xs font-medium",
        config.border,
        TONE_BORDER[config.tone],
        TONE_TEXT[config.tone],
      ].join(" ")}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}
