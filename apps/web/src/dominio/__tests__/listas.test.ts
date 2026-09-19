import { describe, expect, it } from "vitest";
import { enumerar } from "../listas";

describe("enumerar", () => {
  it("sin elementos, devuelve la cadena vacía", () => {
    expect(enumerar([])).toBe("");
  });

  it("con un elemento, lo devuelve tal cual", () => {
    expect(enumerar(["Marta"])).toBe("Marta");
  });

  it("con tres elementos, junta los dos primeros con coma y el último con «y»", () => {
    expect(enumerar(["Marta", "Kevin", "el Goblin"])).toBe("Marta, Kevin y el Goblin");
  });
});
