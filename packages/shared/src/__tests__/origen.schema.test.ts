import { describe, expect, it } from "vitest";
import { origenSchema } from "../origen.schema";

// Tarea A4 (paso 2). `Origen` es una unión discriminada: no hay fórmula que evaluar, así que no
// hay fórmula que falle en silencio como el `simplifyBonus` de Foundry.

describe("origenSchema", () => {
  it("acepta cada una de las siete variantes", () => {
    expect(origenSchema.parse({ tipo: "fijo", valor: 2 })).toEqual({ tipo: "fijo", valor: 2 });
    expect(origenSchema.parse({ tipo: "modificador", ability: "str" })).toEqual({
      tipo: "modificador",
      ability: "str",
    });
    expect(origenSchema.parse({ tipo: "competencia" })).toEqual({ tipo: "competencia" });
    expect(origenSchema.parse({ tipo: "escala", clave: "rage-damage" })).toEqual({
      tipo: "escala",
      clave: "rage-damage",
    });
    expect(origenSchema.parse({ tipo: "lanzamiento" })).toEqual({ tipo: "lanzamiento" });
    expect(origenSchema.parse({ tipo: "nivelDeEspacio" })).toEqual({ tipo: "nivelDeEspacio" });
    expect(origenSchema.parse({ tipo: "cdDeConjuro" })).toEqual({ tipo: "cdDeConjuro" });
  });

  it("rechaza una característica que no existe en 'modificador'", () => {
    expect(() => origenSchema.parse({ tipo: "modificador", ability: "luck" })).toThrow();
  });

  it("rechaza una clave de escala vacía", () => {
    expect(() => origenSchema.parse({ tipo: "escala", clave: "" })).toThrow();
  });

  it("rechaza un tipo que no existe en la unión", () => {
    expect(() => origenSchema.parse({ tipo: "aleatorio" })).toThrow();
  });

  // La frontera con Foundry: una cadena evaluable NUNCA es un `Origen`, aunque tenga la forma
  // de una de sus variantes reales. Si esto se cuela, alguien puede volver a meter "@mod + 2".
  it("rechaza una cadena evaluable en lugar de una variante real", () => {
    expect(() => origenSchema.parse("@mod + 2")).toThrow();
    expect(() => origenSchema.parse({ tipo: "fijo", valor: "@mod + 2" })).toThrow();
  });
});
