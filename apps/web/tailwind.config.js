export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Task 1.19 — the token layer. Every colour utility here resolves through a CSS custom
      // property (src/ui/tokens.css), never a literal hex/rgb — that is how components can use
      // Tailwind classes (`bg-surface`, `text-accent`, …) while staying inside the token
      // palette and switching with the theme automatically. Do not add slate/gray/etc.
      //
      // B0 (2026-09-04) — y ahora por CANALES, `rgb(var(--x-ch) / <alpha-value>)`, no por
      // `var(--x)`. Ese cambio es lo único que hace que `border-copper/30` compile: con un
      // color opaco Tailwind no puede componer la opacidad y descarta la utilidad ENTERA sin
      // avisar (49 defectos invisibles, ficha P2 de docs/06-pendientes.md). El nombre sin
      // sufijo sigue existiendo en tokens.css como color pintable para los ~35 `var(--accent)`
      // que se escriben dentro de un `style` o de un SVG; lo que consume Tailwind es el canal.
      // La prueba de que compila NO es este comentario: es
      // `apps/web/e2e/clases-que-si-pintan.spec.ts`, que lee el color compuesto del navegador.
      colors: {
        bg: "rgb(var(--bg-ch) / <alpha-value>)",
        surface: "rgb(var(--surface-ch) / <alpha-value>)",
        vellum: "rgb(var(--vellum-ch) / <alpha-value>)",
        // B0 — la tinta que se lee SOBRE la vitela. En Oscuro y Claro alias de text/muted;
        // en Lectura, tinta parda, porque alli el pliego es claro (ver tokens.css).
        "vellum-ink": "rgb(var(--vellum-ink-ch) / <alpha-value>)",
        "vellum-muted": "rgb(var(--vellum-muted-ch) / <alpha-value>)",
        // Ticket 38 — el filete de `Panel.tsx` (tone="vellum"), medido contra lo que hay
        // DETRÁS del panel, no contra el propio papel (ver tokens.css). Alias exacto de
        // `muted` en Oscuro y Claro; solo Lectura le da un valor propio.
        "vellum-border": "rgb(var(--vellum-border-ch) / <alpha-value>)",
        text: "rgb(var(--text-ch) / <alpha-value>)",
        muted: "rgb(var(--muted-ch) / <alpha-value>)",
        accent: "rgb(var(--accent-ch) / <alpha-value>)",
        "accent-text": "rgb(var(--accent-text-ch) / <alpha-value>)",
        danger: "rgb(var(--danger-ch) / <alpha-value>)",
        "danger-text": "rgb(var(--danger-text-ch) / <alpha-value>)",
        // Task 1.18b — the warning token (tokens.css). --warning and --warning-text resolve to
        // the same custom property value in both themes; two Tailwind names, not two colours,
        // kept only so callers can pick the one that reads as "this is text" vs "this is a
        // fill/border" the same way accent/accent-text and danger/danger-text do.
        warning: "rgb(var(--warning-ch) / <alpha-value>)",
        "warning-text": "rgb(var(--warning-text-ch) / <alpha-value>)",
        // Reseño 2026-09-02 — copper is the identity's warm accent, and it is NOT an action
        // colour: --accent (signal blue) means "you can click this", copper means "this
        // belongs to the world" (rules, capitals, type marks, the cartographic grid). Three
        // separate hues for three separate jobs — action, world, warning — so none of them
        // has to be told apart from another by position alone.
        copper: "rgb(var(--copper-ch) / <alpha-value>)",
        "copper-text": "rgb(var(--copper-text-ch) / <alpha-value>)",
        // Plan 05 (D3) — las CUATRO voces nuevas. Un personaje tiene su color en el hilo y en el
        // elenco, y con cuatro tonos dos personas compartian voz. Las otras cuatro voces no
        // aparecen aqui porque ya existen arriba: text, copper-text, accent-text y danger-text.
        // Estos cuatro NO son de proposito general: nombran una voz, no un estado, y por eso no
        // se reutiliza warning-text (el ambar de "cuidado") ni muted ("esto esta apagado").
        // Sus contrastes en los tres temas estan medidos y anotados en ui/tokens.css.
        "voz-salvia": "rgb(var(--voz-salvia-ch) / <alpha-value>)",
        "voz-ciruela": "rgb(var(--voz-ciruela-ch) / <alpha-value>)",
        "voz-indigo": "rgb(var(--voz-indigo-ch) / <alpha-value>)",
        "voz-arena": "rgb(var(--voz-arena-ch) / <alpha-value>)",
      },
      fontFamily: {
        title: "var(--font-title)",
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
      // B0 (2026-09-04) — **la escala de opacidad entera, y esto NO es adorno.**
      // Tailwind 3 trae por defecto solo unos pocos pasos (0, 5, 10, 20, 25, 30, 40, 50, 60,
      // 70, 75, 80, 90, 95, 100). Un `/NN` fuera de esa lista se descarta **igual de callado**
      // que se descartaba antes cualquier `/NN`: se arreglaría el token y el fallo seguiría
      // ahí con otro nombre. La maqueta de `prototipo/` escribe `/15`, `/45` y `/62`, ninguno
      // en la lista por defecto, así que la escala se abre a los cien pasos. Solo se emiten
      // las clases que el código escribe de verdad, así que no engorda el CSS.
      opacity: Object.fromEntries(
        Array.from({ length: 101 }, (_, i) => [String(i), String(i / 100)]),
      ),
      borderRadius: {
        "radius-sm": "var(--radius-sm)",
        "radius-md": "var(--radius-md)",
      },
    },
  },
  plugins: [],
};
