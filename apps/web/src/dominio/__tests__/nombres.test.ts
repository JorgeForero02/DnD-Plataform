import { describe, expect, it } from "vitest";
import { inicialDe } from "../nombres";

describe("inicialDe", () => {
  it("salta el prefijo «[demo]» y coge la primera letra del nombre de verdad", () => {
    expect(inicialDe("[demo] Tessa")).toBe("T");
  });

  it("sin ninguna letra, devuelve «?» en vez de un espacio o un signo", () => {
    expect(inicialDe("  ")).toBe("?");
  });

  it("mayúscula siempre, aunque el nombre venga en minúsculas", () => {
    expect(inicialDe("borin barbaférrea")).toBe("B");
  });
});
