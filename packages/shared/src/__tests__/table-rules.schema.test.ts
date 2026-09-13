import { describe, expect, it } from "vitest";
import {
  COSTE_POR_PUNTUACION,
  MATRIZ_ESTANDAR,
  costeDePuntos,
  esPermutacionDe,
  tableRulesSchema,
  updateCampaignSchema,
  updateCharacterSheetSchema,
} from "../index";

describe("tableRulesSchema", () => {
  it("un objeto vacío da las reglas de siempre: libre, nivel 1, media, todo permitido, equipo", () => {
    const r = tableRulesSchema.parse({});
    expect(r).toEqual({
      abilities: { metodo: "LIBRE" },
      nivelInicial: 1,
      pgNivelesSiguientes: "MEDIA",
      permitidos: { razas: [], clases: [], subclases: [] },
      oroInicial: { modo: "EQUIPO" },
    });
  });

  it("DADOS rellena expresión, intentos y asignación libre por defecto", () => {
    const r = tableRulesSchema.parse({ abilities: { metodo: "DADOS" } });
    expect(r.abilities).toEqual({
      metodo: "DADOS",
      expresion: "4d6kh3",
      intentos: 1,
      asignacionLibre: true,
    });
  });

  it("PUNTOS vale 27 por defecto y acota 15..40", () => {
    expect(tableRulesSchema.parse({ abilities: { metodo: "PUNTOS" } }).abilities).toEqual({
      metodo: "PUNTOS",
      puntos: 27,
    });
    expect(
      tableRulesSchema.safeParse({ abilities: { metodo: "PUNTOS", puntos: 14 } }).success,
    ).toBe(false);
  });

  it("rechaza intentos fuera de 1..10, nivel fuera de 1..20, oro fijo negativo y un método desconocido", () => {
    expect(
      tableRulesSchema.safeParse({ abilities: { metodo: "DADOS", intentos: 0 } }).success,
    ).toBe(false);
    expect(
      tableRulesSchema.safeParse({ abilities: { metodo: "DADOS", intentos: 11 } }).success,
    ).toBe(false);
    expect(tableRulesSchema.safeParse({ nivelInicial: 21 }).success).toBe(false);
    expect(
      tableRulesSchema.safeParse({ oroInicial: { modo: "ORO_FIJO", cantidadPo: -1 } }).success,
    ).toBe(false);
    expect(tableRulesSchema.safeParse({ abilities: { metodo: "ALEATORIO" } }).success).toBe(false);
  });

  it("viaja dentro de updateCampaignSchema y attemptId dentro de updateCharacterSheetSchema", () => {
    expect(
      updateCampaignSchema.parse({ tableRules: { nivelInicial: 3 } }).tableRules?.nivelInicial,
    ).toBe(3);
    expect(updateCharacterSheetSchema.parse({ attemptId: "abc" }).attemptId).toBe("abc");
  });
});

describe("compra por puntos (SRD 5.1, Customizing Ability Scores)", () => {
  it("la tabla es 8→0 … 15→9", () => {
    expect(COSTE_POR_PUNTUACION).toEqual({ 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 });
  });
  it("15,15,15,8,8,8 cuesta 27 y 15,14,13,12,10,8 cuesta 27", () => {
    expect(costeDePuntos([15, 15, 15, 8, 8, 8])).toBe(27);
    expect(costeDePuntos([15, 14, 13, 12, 10, 8])).toBe(27);
  });
  it("un valor fuera de 8..15 lanza RangeError", () => {
    expect(() => costeDePuntos([16, 8, 8, 8, 8, 8])).toThrow(RangeError);
    expect(() => costeDePuntos([7, 8, 8, 8, 8, 8])).toThrow(RangeError);
  });
});

describe("la matriz estándar", () => {
  it("es 15 14 13 12 10 8 y una permutación exacta pasa; una repetición o un valor de más, no", () => {
    expect([...MATRIZ_ESTANDAR]).toEqual([15, 14, 13, 12, 10, 8]);
    expect(esPermutacionDe([8, 10, 12, 13, 14, 15], MATRIZ_ESTANDAR)).toBe(true);
    expect(esPermutacionDe([15, 15, 13, 12, 10, 8], MATRIZ_ESTANDAR)).toBe(false);
    expect(esPermutacionDe([15, 14, 13, 12, 10], MATRIZ_ESTANDAR)).toBe(false);
    expect(esPermutacionDe([15, 14, 13, 12, 10, 8, 8], MATRIZ_ESTANDAR)).toBe(false);
  });
});
