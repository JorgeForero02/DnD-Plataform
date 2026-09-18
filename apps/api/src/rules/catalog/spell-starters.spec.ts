import { ARRANQUE_POR_CLASE, arranqueDe } from "./spell-starters";
import { SRD_SPELL_POR_KEY } from "./generado";
import { modeloDePreparacion, tamanoDelLibro, conjurosConocidos } from "./spell-knowledge";

describe("spell-starters (D-CF-125)", () => {
  it("cada clave existe en el catálogo, es de la clase y de nivel 1", () => {
    for (const [clase, { conjuros }] of Object.entries(ARRANQUE_POR_CLASE)) {
      for (const key of conjuros) {
        const spell = SRD_SPELL_POR_KEY.get(key);
        expect(spell).toBeDefined();
        expect(spell!.classes).toContain(clase);
        expect(spell!.level).toBe(1);
      }
    }
  });
  it("el arranque cabe en el tope del nivel en que se siembra", () => {
    expect(arranqueDe("wizard", 1)).toHaveLength(tamanoDelLibro("wizard", 1)!);
    expect(arranqueDe("sorcerer", 1)).toHaveLength(conjurosConocidos("sorcerer", 1)!);
    expect(arranqueDe("bard", 1)).toHaveLength(conjurosConocidos("bard", 1)!);
    expect(arranqueDe("warlock", 1)).toHaveLength(conjurosConocidos("warlock", 1)!);
    expect(arranqueDe("ranger", 1)).toEqual([]);
    expect(arranqueDe("ranger", 2)).toHaveLength(conjurosConocidos("ranger", 2)!);
  });
  it("las clases que preparan de lista no siembran nada", () => {
    for (const c of ["cleric", "druid", "paladin", "fighter"]) {
      expect(
        modeloDePreparacion(c) === "PREPARA_DE_LISTA" || modeloDePreparacion(c) === "NINGUNO",
      ).toBe(true);
      expect(arranqueDe(c, 3)).toEqual([]);
    }
  });
});
