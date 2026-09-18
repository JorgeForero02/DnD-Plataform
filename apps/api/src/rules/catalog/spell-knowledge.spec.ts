import {
  modeloDePreparacion,
  trucosConocidos,
  conjurosConocidos,
  topeDePreparados,
  tamanoDelLibro,
} from "./spell-knowledge";

describe("spell-knowledge — tablas del SRD 5.1", () => {
  it("modelo por clase", () => {
    expect(modeloDePreparacion("cleric")).toBe("PREPARA_DE_LISTA");
    expect(modeloDePreparacion("druid")).toBe("PREPARA_DE_LISTA");
    expect(modeloDePreparacion("paladin")).toBe("PREPARA_DE_LISTA");
    expect(modeloDePreparacion("wizard")).toBe("LIBRO");
    for (const c of ["bard", "sorcerer", "warlock", "ranger"])
      expect(modeloDePreparacion(c)).toBe("CONOCIDOS");
    for (const c of ["fighter", "barbarian", "rogue", "monk", undefined])
      expect(modeloDePreparacion(c)).toBe("NINGUNO");
  });
  it("trucos conocidos: 1.º/4.º/10.º", () => {
    expect(trucosConocidos("wizard", 1)).toBe(3);
    expect(trucosConocidos("wizard", 4)).toBe(4);
    expect(trucosConocidos("wizard", 10)).toBe(5);
    expect(trucosConocidos("sorcerer", 3)).toBe(4);
    expect(trucosConocidos("bard", 20)).toBe(4);
    expect(trucosConocidos("paladin", 5)).toBe(0);
    expect(trucosConocidos("fighter", 5)).toBe(0);
  });
  it("conjuros conocidos de tabla", () => {
    expect(conjurosConocidos("sorcerer", 1)).toBe(2);
    expect(conjurosConocidos("sorcerer", 3)).toBe(4);
    expect(conjurosConocidos("bard", 3)).toBe(6);
    expect(conjurosConocidos("warlock", 20)).toBe(15);
    expect(conjurosConocidos("ranger", 1)).toBe(0);
    expect(conjurosConocidos("ranger", 2)).toBe(2);
    expect(conjurosConocidos("wizard", 3)).toBeNull();
  });
  it("tope de preparados: el paladín es MEDIO nivel", () => {
    expect(topeDePreparados("cleric", 3, 3)).toBe(6);
    expect(topeDePreparados("wizard", 3, 3)).toBe(6);
    expect(topeDePreparados("paladin", 5, 2)).toBe(4);
    expect(topeDePreparados("paladin", 3, 2)).toBe(3);
    expect(topeDePreparados("cleric", 1, -2)).toBe(1); // mínimo de uno
    expect(topeDePreparados("sorcerer", 3, 3)).toBeNull();
  });
  it("tamaño del libro del mago: 6 + 2 por nivel", () => {
    expect(tamanoDelLibro("wizard", 1)).toBe(6);
    expect(tamanoDelLibro("wizard", 3)).toBe(10);
    expect(tamanoDelLibro("cleric", 3)).toBeNull();
  });
});
