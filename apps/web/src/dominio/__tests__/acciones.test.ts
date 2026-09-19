import { describe, expect, it } from "vitest";
import { fraseDeMecanica } from "../acciones";

// Task 4 (2026-09-19) — `fraseDeMecanica` ya no rellena con `NOMBRE_MECANICA[tipo]` cuando no hay
// `dados`: «Texto» y «Daño o curación» son vocabulario del motor de reglas, no algo que se diga en
// la mesa. `FilaDeAccion` filtra las partes vacías con `.filter(Boolean)`, así que devolver ""
// simplemente hace desaparecer el resumen mecánico de la fila en vez de pintar un nombre interno.

describe("fraseDeMecanica", () => {
  it("sin dados, no hay resumen que pintar: cadena vacía, nunca el nombre del tipo", () => {
    expect(fraseDeMecanica({ tipo: "texto" })).toBe("");
    expect(fraseDeMecanica({ tipo: "utilidad" })).toBe("");
  });

  it("con dados y sin tipo de daño, el resumen es solo la expresión", () => {
    expect(fraseDeMecanica({ tipo: "dados", dados: "1d8+3" })).toBe("1d8+3");
  });

  it("con dados y tipo de daño, el resumen añade el nombre del daño en español", () => {
    expect(fraseDeMecanica({ tipo: "ataque", dados: "1d8+3", tipoDeDano: "SLASHING" })).toBe(
      "1d8+3 cortante",
    );
  });
});
