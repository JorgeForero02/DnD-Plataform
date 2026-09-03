import { describe, expect, it } from "vitest";
import {
  addInventoryItemSchema,
  changeMoneySchema,
  createCampaignItemSchema,
  itemEffectSchema,
  rollAttackSchema,
  updateCampaignItemSchema,
  updateInventoryItemSchema,
  COIN_VALUE_CP,
} from "./index";

// Capa 1 de `docs/08-pruebas.md`: que un cuerpo inválido se rechaza **antes** de que exista el
// endpoint. Lo que se prueba aquí es la forma; el negocio (ranuras, manos, tope de sintonización)
// vive en el servicio y se prueba allí.

const armaMinima = {
  name: "Espada larga",
  kind: "WEAPON" as const,
  weapon: {
    category: "MARTIAL" as const,
    range: "MELEE" as const,
    damageDice: "1d8",
    damageType: "SLASHING" as const,
    properties: ["VERSATILE" as const],
    versatileDice: "1d10",
  },
};

describe("createCampaignItemSchema", () => {
  it("acepta un arma con su dado y su tipo de daño, y le pone los valores por defecto", () => {
    const r = createCampaignItemSchema.parse(armaMinima);
    expect(r.visibility).toBe("PLAYERS");
    expect(r.weightOz).toBe(0);
    expect(r.effects).toEqual([]);
    expect(r.requiresAttunement).toBe(false);
  });

  it("rechaza un arma sin datos de arma: no podría tirar nada", () => {
    const r = createCampaignItemSchema.safeParse({ name: "Palo", kind: "WEAPON" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].path).toEqual(["weapon"]);
  });

  it("rechaza una armadura sin Clase de Armadura", () => {
    const r = createCampaignItemSchema.safeParse({ name: "Cota", kind: "ARMOR" });
    expect(r.success).toBe(false);
  });

  it("rechaza un escudo declarado con categoría de armadura de cuerpo", () => {
    const r = createCampaignItemSchema.safeParse({
      name: "Escudo raro",
      kind: "SHIELD",
      armor: { category: "HEAVY", baseAc: 2 },
    });
    expect(r.success).toBe(false);
  });

  it("rechaza una armadura de cuerpo declarada como escudo", () => {
    const r = createCampaignItemSchema.safeParse({
      name: "Cota rara",
      kind: "ARMOR",
      armor: { category: "SHIELD", baseAc: 16 },
    });
    expect(r.success).toBe(false);
  });

  it("rechaza un dado a dos manos en un arma que no es versátil", () => {
    const r = createCampaignItemSchema.safeParse({
      ...armaMinima,
      weapon: { ...armaMinima.weapon, properties: [], versatileDice: "1d10" },
    });
    expect(r.success).toBe(false);
  });

  it("rechaza un dado de daño mal escrito", () => {
    const r = createCampaignItemSchema.safeParse({
      ...armaMinima,
      weapon: { ...armaMinima.weapon, damageDice: "1d8+3" },
    });
    expect(r.success).toBe(false);
  });

  it("un objeto que no es arma ni armadura no necesita ninguno de los dos bloques", () => {
    expect(createCampaignItemSchema.safeParse({ name: "Cuerda", kind: "GEAR" }).success).toBe(true);
  });
});

describe("updateCampaignItemSchema", () => {
  it("acepta cambiar solo el nombre sin reenviar el arma entera", () => {
    expect(updateCampaignItemSchema.safeParse({ name: "Otro nombre" }).success).toBe(true);
  });

  it("pero si cambia el tipo a arma, exige los datos de arma", () => {
    expect(updateCampaignItemSchema.safeParse({ kind: "WEAPON" }).success).toBe(false);
  });
});

describe("itemEffectSchema — la lista es cerrada", () => {
  it("acepta los seis efectos de la lista", () => {
    const efectos = [
      { kind: "ac", amount: 1 },
      { kind: "abilityScore", ability: "str", mode: "set", amount: 21 },
      { kind: "save", amount: 1 },
      { kind: "maxHp", amount: 5 },
      { kind: "speed", movement: "walk", amount: -10 },
      { kind: "skillProficiency", skill: "stealth", level: "expertise" },
      { kind: "saveProficiency", ability: "wis" },
    ];
    for (const efecto of efectos) expect(itemEffectSchema.safeParse(efecto).success).toBe(true);
  });

  it("rechaza un efecto narrativo, que es justo lo que la regla dura prohíbe", () => {
    const r = itemEffectSchema.safeParse({
      kind: "advantage",
      skill: "deception",
      note: "ante la Casa Vhael",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza una característica que no existe", () => {
    expect(
      itemEffectSchema.safeParse({ kind: "abilityScore", ability: "luck", mode: "add", amount: 1 })
        .success,
    ).toBe(false);
  });
});

describe("inventario", () => {
  it("un objeto entra en la mochila por defecto, no puesto", () => {
    const r = addInventoryItemSchema.parse({ ref: { source: "SRD", key: "long-sword" } });
    expect(r.location).toBe("CARRIED");
    expect(r.quantity).toBe(1);
  });

  it("una actualización vacía se rechaza", () => {
    expect(updateInventoryItemSchema.safeParse({}).success).toBe(false);
  });

  it("la ranura se puede liberar con null", () => {
    expect(updateInventoryItemSchema.safeParse({ slot: null }).success).toBe(true);
  });
});

describe("dinero", () => {
  it("los cambios del SRD: 1 po = 10 pp = 100 pc, y 1 ppt = 10 po", () => {
    expect(COIN_VALUE_CP.gp).toBe(10 * COIN_VALUE_CP.sp);
    expect(COIN_VALUE_CP.gp).toBe(100 * COIN_VALUE_CP.cp);
    expect(COIN_VALUE_CP.pp).toBe(10 * COIN_VALUE_CP.gp);
  });

  it("un movimiento sin ninguna moneda se rechaza", () => {
    expect(changeMoneySchema.safeParse({ reason: "compra" }).success).toBe(false);
    expect(changeMoneySchema.safeParse({ gp: 0 }).success).toBe(false);
  });

  it("un delta negativo es legítimo: pagar", () => {
    expect(changeMoneySchema.safeParse({ gp: -20 }).success).toBe(true);
  });
});

describe("tirada de ataque", () => {
  it("por defecto es normal, a una mano y sin crítico", () => {
    const r = rollAttackSchema.parse({ part: "ATTACK" });
    expect(r).toMatchObject({ mode: "NORMAL", versatile: false, critical: false });
  });

  it("rechaza una mitad que no existe", () => {
    expect(rollAttackSchema.safeParse({ part: "BOTH" }).success).toBe(false);
  });
});
