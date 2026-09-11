import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import type { Visibility } from "@dnd/shared";
import { ETIQUETA_DE_NIVEL } from "../visibilidad";
import { Badge } from "../../../ui/Badge";

const ALL: Visibility[] = ["PUBLIC", "PLAYERS", "SPECIFIC_PLAYERS", "OWNER_DM", "DM_ONLY"];

// U6-visibilidad: las etiquetas de nivel son una forma legible por dominio, no un secreto de
// `Badge`. Una pantalla que necesite nombrar un nivel dentro de una frase (sin pintar un badge
// entero) tiene que poder importar esto mismo — antes solo vivía dentro de `VISIBILITY_CONFIG`,
// privado a `ui/Badge.tsx`.
describe("ETIQUETA_DE_NIVEL", () => {
  it("tiene las cinco claves de Visibility", () => {
    expect(Object.keys(ETIQUETA_DE_NIVEL).sort()).toEqual([...ALL].sort());
  });

  it("Badge pinta exactamente ETIQUETA_DE_NIVEL[nivel] para cada nivel", () => {
    for (const nivel of ALL) {
      const { container, unmount } = render(<Badge visibility={nivel} />);
      const badge = container.querySelector(`[data-visibility="${nivel}"]`)!;
      expect(badge.textContent).toContain(ETIQUETA_DE_NIVEL[nivel]);
      unmount();
    }
  });
});
