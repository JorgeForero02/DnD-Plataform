import { resolvedItemSchema } from "@dnd/shared";
import { SRD_ARMOR } from "./armor";
import { findSrdItem, SRD_ITEMS } from "./items-srd";
import { SRD_WEAPONS } from "./weapons";

// Tarea 2B — carril A1: invariantes de verdad sobre el catálogo de objetos, no de fachada.
//
// Como en `catalog.spec.ts`, esto no comprueba que una cifra sea la del SRD —eso solo lo hace
// un humano con el libro delante—, comprueba el error de transcripción: un dado que falta, un
// `VERSATILE` sin su dado a dos manos, un `dexCap` puesto al revés.

describe("armas: invariantes estructurales", () => {
  it("toda arma tiene dado de daño y tipo de daño", () => {
    for (const weapon of SRD_WEAPONS) {
      expect(weapon.damageDice.length).toBeGreaterThan(0);
      expect(weapon.damageType.length).toBeGreaterThan(0);
    }
  });

  it("VERSATILE existe si y solo si hay dado a dos manos, y TWO_HANDED nunca es VERSATILE", () => {
    for (const weapon of SRD_WEAPONS) {
      const esVersatil = weapon.properties.includes("VERSATILE");
      expect(esVersatil).toBe(weapon.versatileDice !== undefined);
      if (weapon.properties.includes("TWO_HANDED")) {
        expect(weapon.properties.includes("VERSATILE")).toBe(false);
      }
    }
  });

  it("toda arma a distancia o arrojadiza declara alcance normal y largo", () => {
    for (const weapon of SRD_WEAPONS) {
      const necesitaAlcance = weapon.range === "RANGED" || weapon.properties.includes("THROWN");
      if (necesitaAlcance) {
        expect(weapon.rangeNormalFt).toBeGreaterThan(0);
        expect(weapon.rangeLongFt).toBeGreaterThan(0);
        expect(weapon.rangeLongFt!).toBeGreaterThan(weapon.rangeNormalFt!);
      } else {
        expect(weapon.rangeNormalFt).toBeUndefined();
        expect(weapon.rangeLongFt).toBeUndefined();
      }
    }
  });
});

describe("armaduras: invariantes estructurales", () => {
  it("toda armadura y escudo tiene su Clase de Armadura base", () => {
    for (const armor of SRD_ARMOR) {
      expect(armor.baseAc).toBeGreaterThan(0);
    }
  });

  it("dexCap distingue las tres categorías: undefined en ligera, 2 en media, 0 en pesada", () => {
    for (const armor of SRD_ARMOR) {
      if (armor.category === "LIGHT") expect(armor.dexCap).toBeUndefined();
      if (armor.category === "MEDIUM") expect(armor.dexCap).toBe(2);
      if (armor.category === "HEAVY") expect(armor.dexCap).toBe(0);
    }
  });
});

describe("SRD_ITEMS: claves y contrato", () => {
  it("ninguna clave se repite en todo el catálogo de objetos", () => {
    const claves = SRD_ITEMS.map((item) => item.ref);
    const repetidas = claves.filter((clave, i) => claves.indexOf(clave) !== i);
    expect(repetidas).toEqual([]);
  });

  it("ninguna clave lleva mayúsculas ni espacios", () => {
    for (const item of SRD_ITEMS) {
      const clave = item.ref.replace(/^SRD:/, "");
      expect(clave).toBe(clave.toLowerCase());
      expect(clave).not.toMatch(/\s/);
    }
  });

  it.each(SRD_ITEMS.map((item) => [item.ref, item] as const))(
    "%s pasa resolvedItemSchema.parse",
    (_ref, item) => {
      expect(() => resolvedItemSchema.parse(item)).not.toThrow();
    },
  );
});

describe("casos concretos del SRD, que cazan una transcripción mala", () => {
  it("espada larga: 1d8 cortante, versátil a 1d10, marcial", () => {
    const item = findSrdItem("long-sword");
    expect(item?.weapon).toMatchObject({
      category: "MARTIAL",
      range: "MELEE",
      damageDice: "1d8",
      damageType: "SLASHING",
      versatileDice: "1d10",
    });
    expect(item?.weapon?.properties).toContain("VERSATILE");
  });

  it("daga: 1d4 perforante, sutil, ligera, arrojadiza a 20/60 pies", () => {
    const item = findSrdItem("dagger");
    expect(item?.weapon).toMatchObject({
      category: "SIMPLE",
      damageDice: "1d4",
      damageType: "PIERCING",
      rangeNormalFt: 20,
      rangeLongFt: 60,
    });
    expect(item?.weapon?.properties).toEqual(
      expect.arrayContaining(["FINESSE", "LIGHT", "THROWN"]),
    );
  });

  it("arco largo: 1d8 perforante, munición, pesado, a dos manos, 150/600 pies", () => {
    const item = findSrdItem("longbow");
    expect(item?.weapon).toMatchObject({
      category: "MARTIAL",
      range: "RANGED",
      damageDice: "1d8",
      damageType: "PIERCING",
      rangeNormalFt: 150,
      rangeLongFt: 600,
    });
    expect(item?.weapon?.properties).toEqual(
      expect.arrayContaining(["AMMUNITION", "HEAVY", "TWO_HANDED"]),
    );
  });

  it("maza: 1d6 contundente, simple", () => {
    const item = findSrdItem("mace");
    expect(item?.weapon).toMatchObject({
      category: "SIMPLE",
      range: "MELEE",
      damageDice: "1d6",
      damageType: "BLUDGEONING",
    });
  });
});
