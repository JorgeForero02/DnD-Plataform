import { describe, it, expect } from "vitest";
import { itemEffectSchema, type ItemEffect } from "@dnd/shared";
import {
  describirEfecto,
  formatearPeso,
  formatearPrecio,
  kgAOz,
  poACp,
  resumirEfecto,
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

// HP-10 (2026-09-12) — la forma CORTA de un efecto, la que cabe en el dato en cifras de la fila
// del inventario y que `DatoEnCifras` tacha cuando el efecto está inactivo por sintonización.
// Antes la fila solo ponía cifra al `ac`; los otros ocho tipos llevaban la marca sin nada tachado.
describe("vocabulario — resumirEfecto (HP-10)", () => {
  it.each<[string, ItemEffect, string]>([
    ["ac", { kind: "ac", amount: 1 }, "+1 CA"],
    ["ac negativo conserva el signo", { kind: "ac", amount: -1 }, "-1 CA"],
    ["weaponAttack", { kind: "weaponAttack", amount: 1 }, "+1 atq"],
    ["weaponDamage", { kind: "weaponDamage", amount: 1 }, "+1 dñ"],
    [
      "abilityScore add",
      { kind: "abilityScore", ability: "str", mode: "add", amount: 2 },
      "+2 FUE",
    ],
    [
      "abilityScore set",
      { kind: "abilityScore", ability: "str", mode: "set", amount: 19 },
      "FUE 19",
    ],
    ["save con característica", { kind: "save", ability: "wis", amount: 1 }, "+1 salv. SAB"],
    ["save sin característica", { kind: "save", amount: 1 }, "+1 salvaciones"],
    ["maxHp", { kind: "maxHp", amount: 5 }, "+5 PG máx."],
    ["speed (caminar)", { kind: "speed", movement: "walk", amount: 10 }, "+10 pies"],
    [
      "speed de otro movimiento lo nombra",
      { kind: "speed", movement: "fly", amount: 30 },
      "+30 pies al volar",
    ],
    ["speed negativa", { kind: "speed", movement: "walk", amount: -10 }, "-10 pies"],
    [
      "skillProficiency competente",
      { kind: "skillProficiency", skill: "stealth", level: "proficient" },
      "competencia en Sigilo",
    ],
    [
      "skillProficiency pericia",
      { kind: "skillProficiency", skill: "stealth", level: "expertise" },
      "pericia en Sigilo",
    ],
    [
      "skillProficiency media",
      { kind: "skillProficiency", skill: "stealth", level: "half" },
      "media competencia en Sigilo",
    ],
    [
      "skillProficiency ninguna",
      { kind: "skillProficiency", skill: "stealth", level: "none" },
      "sin competencia en Sigilo",
    ],
    ["saveProficiency", { kind: "saveProficiency", ability: "con" }, "competencia en salv. CON"],
  ])("%s", (_nombre, efecto, esperado) => {
    expect(resumirEfecto(efecto)).toBe(esperado);
  });

  it("cubre todos los tipos de `itemEffectSchema`, sin clave cruda ni «Sin traducir»", () => {
    // Una muestra válida por tipo; si el esquema gana un décimo tipo, esta lista se queda corta
    // y la prueba lo dice (además del `never` del `switch`, que rompe el typecheck).
    const muestras: Record<ItemEffect["kind"], ItemEffect> = {
      ac: { kind: "ac", amount: 2 },
      abilityScore: { kind: "abilityScore", ability: "dex", mode: "add", amount: 1 },
      save: { kind: "save", amount: 2 },
      maxHp: { kind: "maxHp", amount: -3 },
      speed: { kind: "speed", movement: "swim", amount: 20 },
      skillProficiency: { kind: "skillProficiency", skill: "arcana", level: "proficient" },
      saveProficiency: { kind: "saveProficiency", ability: "cha" },
      weaponAttack: { kind: "weaponAttack", amount: 3 },
      weaponDamage: { kind: "weaponDamage", amount: -2 },
    };
    const tipos = itemEffectSchema.options.map((o) => o.shape.kind.value);
    expect(tipos).toHaveLength(9);
    for (const kind of tipos) {
      const efecto = muestras[kind];
      expect(efecto, `falta muestra para ${kind}`).toBeDefined();
      const texto = resumirEfecto(efecto);
      expect(texto).not.toBe("");
      expect(texto).not.toMatch(/Sin traducir/);
      expect(texto).not.toContain(kind);
    }
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
