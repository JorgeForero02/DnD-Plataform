import { describe, it, expect } from "vitest";
import {
  describirEfecto,
  formatearPeso,
  formatearPrecio,
  kgAOz,
  poACp,
  subtituloDeObjeto,
} from "../vocabulario";

describe("vocabulario — unidades", () => {
  it("convierte onzas a kg y de vuelta sin desviarse en un objeto normal", () => {
    // 32 oz = 2 libras = 0,90718474 kg
    expect(formatearPeso(32)).toBe("0,91 kg");
    expect(kgAOz(0.9)).toBeGreaterThan(30);
  });

  it("da un precio legible en po, y «sin precio» cuando no lo hay", () => {
    expect(formatearPrecio(2500)).toBe("25 po");
    expect(formatearPrecio(null)).toBe("Sin precio");
    expect(formatearPrecio(undefined)).toBe("Sin precio");
    expect(poACp(25)).toBe(2500);
  });
});

describe("vocabulario — describirEfecto", () => {
  it("describe un bono de CA", () => {
    expect(describirEfecto({ kind: "ac", amount: 1 })).toBe("+1 a la Clase de Armadura");
  });

  it("distingue sumar y fijar una característica", () => {
    expect(describirEfecto({ kind: "abilityScore", ability: "str", mode: "set", amount: 21 })).toBe(
      "Fija FUE a 21",
    );
    expect(describirEfecto({ kind: "abilityScore", ability: "dex", mode: "add", amount: 2 })).toBe(
      "+2 a DES",
    );
  });

  it("una salvación sin característica se dice «a todas»", () => {
    expect(describirEfecto({ kind: "save", amount: 1 })).toBe("+1 a todas las salvaciones");
  });
});

describe("vocabulario — subtituloDeObjeto", () => {
  it("un arma resume dado, tipo de daño y propiedades", () => {
    expect(
      subtituloDeObjeto({
        kind: "WEAPON",
        damageDice: "1d8",
        damageType: "PIERCING",
        weaponProperties: ["FINESSE"],
        baseAc: null,
        dexCap: null,
        effects: [],
      }),
    ).toBe("1d8 perforante, sutil");
  });

  it("una armadura media resume base + DES con tope", () => {
    expect(
      subtituloDeObjeto({
        kind: "ARMOR",
        baseAc: 12,
        dexCap: 2,
        effects: [],
      }),
    ).toBe("12 + DES (máx 2)");
  });

  it("sin arma, armadura ni efectos, lo dice", () => {
    expect(subtituloDeObjeto({ kind: "GEAR", effects: [] })).toBe("Sin datos numéricos");
  });
});
