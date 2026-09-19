import { describe, expect, it } from "vitest";
import { conEspacioFino, conSigno, decimales } from "../numeros";

// Task 7 (2026-09-19) — un solo convenio de números en es-ES, escrito a mano porque el Node de
// este proyecto trae ICU pequeño (small-icu, solo en-US con datos completos):
// `(1250).toLocaleString("es-ES")` devuelve `"1250"`, sin agrupar nada. El espacio de millar es
// el espacio fino U+202F, no un espacio normal — la misma trampa que ya cazó `frasesDeXp.test.ts`
// cuando `conEspacioFino` vivía en `character-sheet/vocabulario.ts`.

describe("conSigno", () => {
  it("positivo, negativo y cero, siempre con signo delante", () => {
    expect(conSigno(3)).toBe("+3");
    expect(conSigno(-1)).toBe("−1");
    expect(conSigno(0)).toBe("+0");
  });
});

describe("conEspacioFino", () => {
  it("agrupa de tres en tres con el espacio fino (U+202F), no un espacio normal", () => {
    expect(conEspacioFino(1250)).toBe("1 250");
    expect(conEspacioFino(355000)).toBe("355 000");
  });

  it("sin miles, ningún espacio de por medio", () => {
    expect(conEspacioFino(250)).toBe("250");
  });

  it("negativo: el signo va antes del primer grupo", () => {
    expect(conEspacioFino(-1250)).toBe("-1 250");
  });
});

describe("decimales", () => {
  it('decimales(3.5, 1) → "3,5"', () => {
    expect(decimales(3.5, 1)).toBe("3,5");
  });

  it('decimales(1250.25, 2) → "1 250,25" (coma decimal, espacio fino de millar)', () => {
    expect(decimales(1250.25, 2)).toBe("1 250,25");
  });

  it("redondea a las cifras pedidas, no las trunca", () => {
    expect(decimales(3.456, 2)).toBe("3,46");
  });

  it("negativo: el signo va antes del primer grupo", () => {
    expect(decimales(-1250.5, 1)).toBe("-1 250,5");
  });
});
