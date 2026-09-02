import { useState } from "react";
import { Button } from "./Button";
import { getPreferredTheme, setTheme, type Theme } from "./theme";

function currentTheme(): Theme {
  const stamped = document.documentElement.getAttribute("data-theme");
  return stamped === "dark" || stamped === "light" ? stamped : getPreferredTheme();
}

// Task 1.19, fix round 1, Important 8: light is meant to be the parchment reading mode
// ("light IS the parchment reading mode, so it has a real reason to exist" — the brief), but
// until this component existed nothing in the app could ever reach it: setTheme's only caller
// was the ?theme= URL parameter on /design-tokens, a route no player or DM ever visits. This
// is the smallest possible reachable control — one fixed-position button, mounted once in
// App.tsx, not a redesign of anything it sits on top of.
export function ThemeToggle() {
  // Lazy initializer, not useEffect + setState: index.html/main.tsx have already stamped
  // [data-theme] by the time this ever mounts, so there is no async source to synchronize
  // with here — just a value to read once, which is what useState's initializer is for.
  const [theme, setThemeState] = useState<Theme>(currentTheme);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }

  const label = theme === "dark" ? "Cambiar a tema claro (pergamino)" : "Cambiar a tema oscuro";

  return (
    <Button
      variant="ghost"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="fixed right-2 top-2 z-40"
    >
      <span aria-hidden="true">{theme === "dark" ? "☾" : "☀"}</span>
    </Button>
  );
}
