import { describe, expect, it } from "vitest";
import { frasesDeXp } from "../vocabulario";

// Puerta de efectos §5 bis (E-PE-10, D-CF-68) — el marcador «1 250 / 2 700 PX» y el aviso de
// nivel disponible. Números en es-ES con espacio fino de miles (docs/04-convenciones.md): NO es
// el punto de `toLocaleString("es-ES")` a secas, que agrupa con puntos.

describe("frasesDeXp", () => {
  it("con el nivel al día, el marcador «actual / siguiente PX» y sin aviso", () => {
    const { marcador, aviso } = frasesDeXp({ actual: 1250, siguiente: 2700, nivelPorXp: 3 }, 3);
    expect(marcador).toBe("1 250 / 2 700 PX");
    expect(aviso).toBeNull();
  });

  it("con XP por encima del nivel actual, el aviso enlazable a «Subir de nivel»", () => {
    const { aviso } = frasesDeXp({ actual: 2700, siguiente: 6500, nivelPorXp: 4 }, 3);
    expect(aviso).toBe("Has alcanzado el XP del nivel 4: el DM puede subirte");
  });

  it("en el nivel máximo, sin siguiente umbral: «… PX · nivel máximo»", () => {
    const { marcador } = frasesDeXp({ actual: 355000, siguiente: null, nivelPorXp: 20 }, 20);
    expect(marcador).toBe("355 000 PX · nivel máximo");
  });
});
