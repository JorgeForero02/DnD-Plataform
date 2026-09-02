export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Task 1.19 — the token layer. Every colour utility here resolves through a CSS custom
      // property (src/ui/tokens.css), never a literal hex/rgb — that is how components can use
      // Tailwind classes (`bg-surface`, `text-accent`, …) while staying inside the token
      // palette and switching with the theme automatically. Do not add slate/gray/etc.
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        vellum: "var(--vellum)",
        text: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        "accent-text": "var(--accent-text)",
        danger: "var(--danger)",
        "danger-text": "var(--danger-text)",
      },
      fontFamily: {
        chrome: "var(--font-chrome)",
        world: "var(--font-world)",
        data: "var(--font-data)",
      },
      // Fix round 1, Critical 1: these used to be named "sm"/"base"/"xl"/"2xl" — Tailwind's
      // OWN default fontSize keys — which `extend` does not merge into, it REPLACES. That
      // silently restyled `.text-sm`/`.text-base`/`.text-xl`/`.text-2xl` (and dropped their
      // paired line-heights) across every screen this task never touched. Namespaced under
      // "chrome-*" so they ADD a new set of utilities instead of overwriting Tailwind's. See
      // the report for the before/after compiled-CSS proof.
      fontSize: {
        "chrome-xs": "var(--text-xs)",
        "chrome-sm": "var(--text-sm)",
        "chrome-base": "var(--text-base)",
        "chrome-md": "var(--text-md)",
        "chrome-lg": "var(--text-lg)",
        "chrome-xl": "var(--text-xl)",
        "chrome-2xl": "var(--text-2xl)",
        "world-base": "var(--text-world-base)",
        "world-lg": "var(--text-world-lg)",
        "world-xl": "var(--text-world-xl)",
      },
      // Same bug, same fix: bare numeric keys ("1".."8") replace Tailwind's default spacing
      // scale (used by `p-*`/`m-*`/`gap-*`/`w-*`/`h-*` everywhere), not just add to it.
      // Namespaced under "s1".."s8".
      spacing: {
        s1: "var(--space-1)",
        s2: "var(--space-2)",
        s3: "var(--space-3)",
        s4: "var(--space-4)",
        s5: "var(--space-5)",
        s6: "var(--space-6)",
        s8: "var(--space-8)",
      },
      // "sm" and "md" are ALSO Tailwind's default borderRadius keys — same override bug,
      // fixed the same way even though no untouched screen uses rounded-sm/rounded-md today
      // (checked): leaving the collision in place would just be a landmine for the next
      // screen that reaches for the default radius scale.
      borderRadius: {
        "radius-sm": "var(--radius-sm)",
        "radius-md": "var(--radius-md)",
      },
    },
  },
  plugins: [],
};
