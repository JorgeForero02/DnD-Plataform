import { describe, expect, it } from "vitest";
import { BANDOS, NOMBRE_BANDO, NOMBRE_ESTADO_DE_COMBATE } from "../combate";

// Tarea 6 (2026-09-05, iniciativa y bando) — protege que los tres bandos y los tres estados de
// combate tengan nombre y explicación en español, y que ningún valor crudo (`ENEMY`, `PREPARING`)
// se escape a la pantalla.

describe("el vocabulario del combate", () => {
  it("los tres bandos tienen nombre y explicación en español", () => {
    expect(BANDOS.map((b) => b.valor)).toEqual(["ALLY", "ENEMY", "NEUTRAL"]);
    for (const bando of BANDOS) {
      expect(bando.nombre).toMatch(/^[A-ZÁÉÍÓÚÑ]/);
      expect(bando.explicacion.length).toBeGreaterThan(10);
    }
  });

  it("ningún valor crudo se escapa", () => {
    expect(NOMBRE_BANDO.ENEMY).toBe("Enemigo");
    expect(NOMBRE_ESTADO_DE_COMBATE.PREPARING).toBe("Preparando combate");
  });
});
