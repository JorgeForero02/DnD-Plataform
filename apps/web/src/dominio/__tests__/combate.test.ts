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

  it("ningún valor crudo se escapa: las seis claves, una por una", () => {
    const NOMBRE_BANDO_ESPERADO: Record<string, string> = {
      ALLY: "Aliado",
      ENEMY: "Enemigo",
      NEUTRAL: "Neutral",
    };
    const NOMBRE_ESTADO_ESPERADO: Record<string, string> = {
      PREPARING: "Preparando combate",
      ACTIVE: "En combate",
      ENDED: "Combate terminado",
    };

    for (const [clave, esperado] of Object.entries(NOMBRE_BANDO_ESPERADO)) {
      const valor = NOMBRE_BANDO[clave as keyof typeof NOMBRE_BANDO];
      expect(valor).toBe(esperado);
      expect(valor).not.toBe(clave);
    }

    for (const [clave, esperado] of Object.entries(NOMBRE_ESTADO_ESPERADO)) {
      const valor = NOMBRE_ESTADO_DE_COMBATE[clave as keyof typeof NOMBRE_ESTADO_DE_COMBATE];
      expect(valor).toBe(esperado);
      expect(valor).not.toBe(clave);
    }
  });
});
