import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

// Task 1.19 — chrome primitive. Every variant below was checked against the measured WCAG
// contrast ratios in the report (.superpowers/sdd/briefs/1.19-tokens-report.md), not assumed:
//
// - primary:   --bg text on --accent fill        (4.63:1 dark / 4.81:1 light)
// - secondary: --text on --surface, --muted border (13.68:1 / 13.87:1 — text carries it)
// - ghost:     --accent-text (NOT --accent) on a transparent fill. Fix round 1, Critical 2:
//              plain --accent text is only 4.63:1 against --bg specifically — it drops to
//              4.26:1 the moment a ghost button sits on --surface (e.g. inside a chrome
//              Panel), which the first version of this component never measured.
//              --accent-text is the same hue/saturation lifted to a lightness that clears
//              4.5:1 against --bg AND --surface AND --vellum in the dark theme (see
//              tokens.css) — safe regardless of what the button sits on, not just the one
//              background the report happened to render it against.
// - danger:    --text on --surface, --danger border (13.68:1 / 13.87:1) — a solid --danger
//              fill has NO token pair reaching 4.5:1 for normal-size text in the dark theme
//              (best available, text-on-danger, is 4.34:1 — short by design of the given
//              palette). An outline treatment keeps the label fully legible and still signals
//              danger via the border, which only needs 3:1 (danger-on-surface: 3.15 / 5.95).
//
// Disabled state (all variants) is unified to --muted text on --surface with a --muted border
// — 5.25:1 dark / 5.86:1 light, comfortably above 4.5:1. The app disables rather than hides
// controls the server would reject (see docs/07-historial.md, 1.15), so a disabled button
// must stay readable, never fade to near-invisible via opacity.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-bg border border-accent hover:shadow-[inset_0_0_0_2px_var(--bg)] active:shadow-[inset_0_0_0_2px_var(--bg)]",
  secondary: "bg-surface text-text border border-muted hover:border-accent",
  ghost: "bg-transparent text-accent-text border border-transparent hover:bg-surface",
  danger: "bg-surface text-text border-[1.5px] border-danger hover:bg-bg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className = "", disabled, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-radius-sm px-3 py-1.5 font-chrome text-chrome-sm font-semibold",
        "transition-colors duration-100",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        disabled
          ? "cursor-not-allowed border border-muted bg-surface text-muted"
          : VARIANT_CLASSES[variant],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
});
