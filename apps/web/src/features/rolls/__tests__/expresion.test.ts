import { describe, expect, it } from "vitest";
import { conDadoAnadido } from "../expresion";

// Tarea 2C.2 — los atajos de dado. La regla vive fuera del `onClick` justamente para poder
// probarla así: los tres casos que se rompen en silencio son la expresión vacía (un `+` de más
// al principio), la que ya acaba en operador (un `+` doblado) y la normal.

describe("conDadoAnadido", () => {
  it("sobre una expresión vacía pone el término solo, sin operador delante", () => {
    expect(conDadoAnadido("", 20)).toBe("1d20");
    expect(conDadoAnadido("   ", 6)).toBe("1d6");
  });

  it("sobre una expresión que ya acaba en operador no dobla el signo", () => {
    expect(conDadoAnadido("1d20+", 6)).toBe("1d20+1d6");
    expect(conDadoAnadido("2d6-", 4)).toBe("2d6-1d4");
  });

  it("en cualquier otro caso suma el dado", () => {
    expect(conDadoAnadido("1d20", 6)).toBe("1d20+1d6");
    expect(conDadoAnadido("2d6+3", 100)).toBe("2d6+3+1d100");
  });
});
