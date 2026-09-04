// Theme switch: writes the explicit choice to localStorage and honours
// prefers-color-scheme on first visit (no stored choice yet). Dark is the default when
// neither a stored choice nor a light OS preference exists — see tokens.css, which applies
// the same precedence in pure CSS for the very first paint (before this module runs) via
// :root:not([data-theme="dark"]) under the light media query.
// B0 (2026-09-04) — **tres temas, no dos**, y el tercero corrige un rótulo que mentía.
// Hasta hoy había `dark` y `light`, y la interfaz llamaba al claro «Lectura (vitela)» cuando
// es gris frío (#dfe5e9): ni vitela ni pergamino. La maqueta de `prototipo/` los trae
// separados con los oficios bien repartidos, así que se adopta su tercer tema y cada nombre
// pasa a decir lo que es: **Oscuro** el instrumento, **Claro** el papel de día, **Lectura**
// la vitela cálida para la prosa larga del mundo. Los rótulos viven en `ETIQUETA_DE_TEMA`,
// una sola vez, porque un valor de enumeración no llega nunca a la pantalla.
export type Theme = "dark" | "light" | "reading";

/** El orden del ciclo del conmutador, y también el de la lista si algún día es una lista. */
export const TEMAS: readonly Theme[] = ["dark", "light", "reading"] as const;

/** La forma legible, escrita una sola vez (regla vinculante de `docs/04-convenciones.md`). */
export const ETIQUETA_DE_TEMA: Record<Theme, string> = {
  dark: "Oscuro",
  light: "Claro",
  reading: "Lectura",
};

export function esTema(valor: unknown): valor is Theme {
  return valor === "dark" || valor === "light" || valor === "reading";
}

// index.html has a hand-synced copy of this exact string, in the inline blocking script
// that stamps [data-theme] before the stylesheet loads (fix round 1, Important 7) — an
// inline <head> script can't import this module, so if this key ever changes, that copy
// has to change with it or the flash-prevention script silently stops finding anything.
const STORAGE_KEY = "dnd-theme";

export function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return esTema(value) ? value : null;
  } catch {
    // Private browsing / storage disabled: fall back as if nothing were stored.
    return null;
  }
}

export function getPreferredTheme(): Theme {
  const stored = getStoredTheme();
  if (stored) return stored;
  const prefersLight =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore — the theme still applies for this page load, it just won't persist.
  }
  applyTheme(theme);
}

// Call once at startup (main.tsx) to stamp the resolved theme onto <html> so components can
// rely on [data-theme] being present rather than re-deriving the preference themselves.
export function initTheme(): Theme {
  const theme = getPreferredTheme();
  applyTheme(theme);
  return theme;
}
