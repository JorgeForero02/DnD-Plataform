import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import type { Visibility } from "@dnd/shared";
import { ETIQUETA_DE_NIVEL, EXPLICACION_DE_NIVEL, coincideConQuienVe } from "../visibilidad";
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

// Ficha 23 (ronda de arreglos 1): `EXPLICACION_DE_NIVEL` es solo concatenación — no comprueba
// nada al construirse, porque este módulo lo importa `ui/Badge.tsx` y media pantalla más, y
// reventar ahí tumbaría la aplicación entera en producción por una frase de texto. La
// comprobación contra `QUIEN_VE` (`packages/shared/src/visibility.schema.ts`, la misma matriz que
// `apps/api/src/common/visibilidad-matriz.spec.ts` compara contra `canView`) vive en
// `coincideConQuienVe`, pura, y se ejerce AQUÍ, una vez por nivel: si `QUIEN_VE` cambia sin que
// `PATRON_DE_NIVEL` se entere, la prueba de ese nivel se pone roja.
describe("EXPLICACION_DE_NIVEL cuenta lo que dice QUIEN_VE", () => {
  it("tiene las cinco claves de Visibility", () => {
    expect(Object.keys(EXPLICACION_DE_NIVEL).sort()).toEqual([...ALL].sort());
  });

  it.each(ALL)("%s: el patrón declarado coincide con QUIEN_VE", (nivel) => {
    expect(coincideConQuienVe(nivel)).toBe(true);
  });

  it("PUBLIC no promete acceso a quien no es miembro", () => {
    expect(EXPLICACION_DE_NIVEL.PUBLIC).not.toMatch(/fuera de la campaña/);
  });

  it("SPECIFIC_PLAYERS dice «solo quienes elijas»", () => {
    expect(EXPLICACION_DE_NIVEL.SPECIFIC_PLAYERS).toMatch(/solo quienes elijas/i);
  });

  it("OWNER_DM dice «tú y quien lo creó»", () => {
    expect(EXPLICACION_DE_NIVEL.OWNER_DM).toMatch(/tú y quien lo creó/i);
  });

  it("DM_ONLY dice «solo el DM»", () => {
    expect(EXPLICACION_DE_NIVEL.DM_ONLY).toMatch(/solo el dm/i);
  });

  it("PUBLIC y PLAYERS no prometen menos de lo que ven: ninguna de las dos frases cierra la puerta", () => {
    expect(EXPLICACION_DE_NIVEL.PUBLIC).not.toMatch(/solo|nadie más|todavía no/i);
    expect(EXPLICACION_DE_NIVEL.PLAYERS).not.toMatch(/solo|nadie más|todavía no/i);
  });
});
