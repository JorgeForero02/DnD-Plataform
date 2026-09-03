import type { AbilityKey, ResolvedItem, WeaponData } from "@dnd/shared";
import { abilityModifier } from "./engine";
import { buildAttacks } from "./attacks";

// Carril A5 (fase 2C) — pruebas del cuadro de ataques. Cada bloque es un caso de mesa real, no
// una combinación abstracta: son justo los que el encargo señala como «donde se falla».

function arma(overrides: Partial<WeaponData> = {}): WeaponData {
  return {
    category: "MARTIAL",
    range: "MELEE",
    damageDice: "1d8",
    damageType: "SLASHING",
    properties: [],
    ...overrides,
  };
}

function objeto(overrides: Partial<ResolvedItem> & { weapon: WeaponData }): ResolvedItem {
  return {
    name: "Arma de prueba",
    kind: "WEAPON",
    weightOz: 48,
    effects: [],
    requiresAttunement: false,
    ref: "SRD:test-weapon",
    source: "SRD",
    ...overrides,
  };
}

const SIN_MODIFICADORES: Record<AbilityKey, number> = {
  str: 0,
  dex: 0,
  con: 0,
  int: 0,
  wis: 0,
  cha: 0,
};

function mods(overrides: Partial<Record<AbilityKey, number>>): Record<AbilityKey, number> {
  return { ...SIN_MODIFICADORES, ...overrides };
}

describe("buildAttacks", () => {
  it("espada larga con Fuerza +3 y competencia: +6 al ataque, 1d8+3 cortante, 1d10+3 a dos manos", () => {
    const espadaLarga = objeto({
      ref: "SRD:long-sword",
      name: "Espada larga",
      weapon: arma({
        category: "MARTIAL",
        range: "MELEE",
        damageDice: "1d8",
        damageType: "SLASHING",
        properties: ["VERSATILE"],
        versatileDice: "1d10",
      }),
    });

    const { attacks, warnings } = buildAttacks({
      items: [espadaLarga],
      abilityMods: mods({ str: 3 }),
      proficiencyBonus: 3,
      weaponProficiencies: ["martial"],
    });

    expect(attacks).toHaveLength(1);
    const [ataque] = attacks;
    expect(ataque.ability).toBe("str");
    expect(ataque.proficient).toBe(true);
    expect(ataque.attackBonus.total).toBe(6);
    expect(ataque.damage).toEqual({
      expression: "1d8+3",
      dice: "1d8",
      modifier: 3,
      type: "SLASHING",
    });
    expect(ataque.versatileDamage).toEqual({
      expression: "1d10+3",
      dice: "1d10",
      modifier: 3,
      type: "SLASHING",
    });
    expect(warnings).toHaveLength(0);
  });

  it("la traza del bono de ataque suma exactamente el total (espada larga con competencia)", () => {
    const espadaLarga = objeto({
      ref: "SRD:long-sword",
      weapon: arma({ properties: ["VERSATILE"], versatileDice: "1d10" }),
    });

    const { attacks } = buildAttacks({
      items: [espadaLarga],
      abilityMods: mods({ str: 3 }),
      proficiencyBonus: 3,
      weaponProficiencies: ["martial"],
    });

    const suma = attacks[0].attackBonus.steps.reduce((total, paso) => total + paso.amount, 0);
    expect(suma).toBe(attacks[0].attackBonus.total);
    expect(attacks[0].attackBonus.steps).toHaveLength(2);
  });

  it("daga con Fuerza -1 y Destreza +4: sutil usa la mejor (+4), no la Fuerza (-1)", () => {
    const daga = objeto({
      ref: "SRD:dagger",
      name: "Daga",
      weapon: arma({
        category: "SIMPLE",
        range: "MELEE",
        damageDice: "1d4",
        damageType: "PIERCING",
        properties: ["FINESSE", "LIGHT", "THROWN"],
        rangeNormalFt: 20,
        rangeLongFt: 60,
      }),
    });

    const { attacks } = buildAttacks({
      items: [daga],
      abilityMods: mods({ str: -1, dex: 4 }),
      proficiencyBonus: 2,
      weaponProficiencies: ["simple"],
    });

    expect(attacks[0].ability).toBe("dex");
    expect(attacks[0].attackBonus.total).toBe(6); // 4 + 2 de competencia
    expect(attacks[0].damage.modifier).toBe(4);
  });

  it("arco corto: siempre Destreza, aunque no sea sutil", () => {
    const arcoCorto = objeto({
      ref: "SRD:shortbow",
      name: "Arco corto",
      weapon: arma({
        category: "SIMPLE",
        range: "RANGED",
        damageDice: "1d6",
        damageType: "PIERCING",
        properties: ["AMMUNITION"],
        rangeNormalFt: 80,
        rangeLongFt: 320,
      }),
    });

    const { attacks } = buildAttacks({
      items: [arcoCorto],
      abilityMods: mods({ str: 5, dex: 1 }),
      proficiencyBonus: 2,
      weaponProficiencies: ["simple"],
    });

    expect(attacks[0].ability).toBe("dex");
    expect(attacks[0].damage.modifier).toBe(1);
  });

  it("jabalina (arrojadiza, sin sutil): usa Fuerza aunque se lance", () => {
    const jabalina = objeto({
      ref: "SRD:javelin",
      name: "Jabalina",
      weapon: arma({
        category: "SIMPLE",
        range: "MELEE",
        damageDice: "1d6",
        damageType: "PIERCING",
        properties: ["THROWN"],
        rangeNormalFt: 30,
        rangeLongFt: 120,
      }),
    });

    const { attacks } = buildAttacks({
      items: [jabalina],
      abilityMods: mods({ str: 2, dex: 5 }),
      proficiencyBonus: 2,
      weaponProficiencies: ["simple"],
    });

    expect(attacks[0].ability).toBe("str");
    expect(attacks[0].damage.modifier).toBe(2);
  });

  it("mago sin competencia marcial con espada larga: el bono no incluye competencia, y avisa", () => {
    const espadaLarga = objeto({
      ref: "SRD:long-sword",
      name: "Espada larga",
      weapon: arma({ category: "MARTIAL" }),
    });

    const { attacks, warnings } = buildAttacks({
      items: [espadaLarga],
      abilityMods: mods({ str: 1 }),
      proficiencyBonus: 2,
      weaponProficiencies: ["simple"], // el mago solo tiene armas sencillas
    });

    expect(attacks[0].proficient).toBe(false);
    expect(attacks[0].attackBonus.total).toBe(1); // solo el modificador, sin +2
    expect(attacks[0].attackBonus.steps).toHaveLength(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe("attack_not_proficient");
    expect(warnings[0].key).toBe("attack.SRD:long-sword");
  });

  it("modificador cero: expresión sin +0", () => {
    const arma1d6 = objeto({ ref: "SRD:mace", weapon: arma({ damageDice: "1d6" }) });

    const { attacks } = buildAttacks({
      items: [arma1d6],
      abilityMods: mods({ str: 0 }),
      proficiencyBonus: 2,
      weaponProficiencies: ["martial"],
    });

    expect(attacks[0].damage.expression).toBe("1d6");
  });

  it("modificador negativo: 1d6-1", () => {
    const arma1d6 = objeto({ ref: "SRD:mace", weapon: arma({ damageDice: "1d6" }) });

    const { attacks } = buildAttacks({
      items: [arma1d6],
      abilityMods: mods({ str: -1 }),
      proficiencyBonus: 2,
      weaponProficiencies: ["martial"],
    });

    expect(attacks[0].damage.expression).toBe("1d6-1");
  });

  it("abilityModifier del motor y el modificador aquí concuerdan (16 de Fuerza → +3)", () => {
    expect(abilityModifier(16)).toBe(3);
  });

  // --- Prueba de mutación obligatoria ---
  //
  // Se rompió a propósito la regla de FINESSE (usar siempre Destreza en vez de la mejor de las
  // dos) copiando el fichero, editando `decidirCaracteristica` para que un arma FINESSE ignorase
  // Fuerza, y corriendo esta prueba: la que sigue detecta exactamente eso, porque la daga del
  // caso anterior con Fuerza +4 y Destreza -1 esperaría +4 (Fuerza) y una mutación FINESSE→dex
  // fijo daría -1.
  it("FINESSE elige realmente la mejor característica, no siempre Destreza (detecta la mutación)", () => {
    const daga = objeto({
      ref: "SRD:dagger",
      weapon: arma({ properties: ["FINESSE"] }),
    });

    const { attacks } = buildAttacks({
      items: [daga],
      abilityMods: mods({ str: 4, dex: -1 }),
      proficiencyBonus: 2,
      weaponProficiencies: ["simple"],
    });

    expect(attacks[0].ability).toBe("str");
    expect(attacks[0].damage.modifier).toBe(4);
  });

  it("TWO_HANDED no lleva variante versátil aunque traiga dado a dos manos por error de datos", () => {
    const armaGrande = objeto({
      ref: "SRD:greatsword",
      weapon: arma({ properties: ["TWO_HANDED"], damageDice: "2d6" }),
    });

    const { attacks } = buildAttacks({
      items: [armaGrande],
      abilityMods: mods({ str: 2 }),
      proficiencyBonus: 2,
      weaponProficiencies: ["martial"],
    });

    expect(attacks[0].versatileDamage).toBeUndefined();
  });

  it("ignora lo que no es arma equipada", () => {
    const noArma: ResolvedItem = {
      name: "Mochila",
      kind: "GEAR",
      weightOz: 32,
      effects: [],
      requiresAttunement: false,
      ref: "SRD:backpack",
      source: "SRD",
    };

    const { attacks } = buildAttacks({
      items: [noArma],
      abilityMods: SIN_MODIFICADORES,
      proficiencyBonus: 2,
      weaponProficiencies: [],
    });

    expect(attacks).toHaveLength(0);
  });

  it("desambigua la clave por mano cuando el mismo arma está en las dos manos", () => {
    const dagaMano = (slot: "MAIN_HAND" | "OFF_HAND") =>
      objeto({
        ref: "SRD:dagger",
        slot,
        weapon: arma({ properties: ["FINESSE", "LIGHT"] }),
      });

    const { attacks } = buildAttacks({
      items: [dagaMano("MAIN_HAND"), dagaMano("OFF_HAND")],
      abilityMods: mods({ dex: 2 }),
      proficiencyBonus: 2,
      weaponProficiencies: ["simple"],
    });

    expect(attacks).toHaveLength(2);
    expect(attacks[0].key).toBe("SRD:dagger:MAIN_HAND");
    expect(attacks[1].key).toBe("SRD:dagger:OFF_HAND");
  });
});

describe("lo que encontró la auditoría de mecánica de 2B", () => {
  const espadaLarga: ResolvedItem = {
    ref: "SRD:long-sword",
    source: "SRD",
    name: "Espada larga",
    kind: "WEAPON",
    weightOz: 48,
    effects: [],
    requiresAttunement: false,
    slot: "MAIN_HAND",
    weapon: {
      category: "MARTIAL",
      range: "MELEE",
      damageDice: "1d8",
      damageType: "SLASHING",
      properties: ["VERSATILE"],
      versatileDice: "1d10",
    },
  };
  const escudo: ResolvedItem = {
    ref: "SRD:shield",
    source: "SRD",
    name: "Escudo",
    kind: "SHIELD",
    weightOz: 96,
    effects: [],
    requiresAttunement: false,
    slot: "OFF_HAND",
    armor: { category: "SHIELD", baseAc: 2, strengthRequirement: 0, stealthDisadvantage: false },
  };
  const mods = { str: 3, dex: 1, con: 2, int: 0, wis: 0, cha: -1 };

  it("con la mano izquierda libre, el arma versátil ofrece su dado a dos manos", () => {
    const r = buildAttacks({
      items: [espadaLarga],
      abilityMods: mods,
      proficiencyBonus: 3,
      weaponProficiencies: ["martial"],
    });
    expect(r.attacks[0].versatileDamage?.expression).toBe("1d10+3");
  });

  it("con un escudo en la izquierda NO la ofrece, y lo dice", () => {
    // Versátil es «empuñada con las dos manos». Ofrecerla igual regala +1 de daño medio por
    // asalto a quien conserva su escudo —y su CA— toda la campaña.
    const r = buildAttacks({
      items: [espadaLarga, escudo],
      abilityMods: mods,
      proficiencyBonus: 3,
      weaponProficiencies: ["martial"],
    });
    expect(r.attacks[0].versatileDamage).toBeUndefined();
    expect(r.warnings.some((a) => a.code === "versatile_needs_both_hands")).toBe(true);
  });

  it("dos armas iguales, una en cada mano, no comparten clave de ataque", () => {
    const daga: ResolvedItem = {
      ...espadaLarga,
      ref: "SRD:dagger",
      name: "Daga",
      weapon: {
        category: "SIMPLE",
        range: "MELEE",
        damageDice: "1d4",
        damageType: "PIERCING",
        properties: ["FINESSE", "LIGHT"],
      },
    };
    const r = buildAttacks({
      items: [
        { ...daga, slot: "MAIN_HAND" },
        { ...daga, slot: "OFF_HAND" },
      ],
      abilityMods: mods,
      proficiencyBonus: 3,
      weaponProficiencies: ["simple"],
    });

    // Sin esto, `rollAttack` tira siempre la primera y React repite `key`.
    expect(r.attacks).toHaveLength(2);
    expect(r.attacks[0].key).not.toBe(r.attacks[1].key);
    // Y la de la otra mano avisa de la regla de combate con dos armas, sin cambiar el número:
    // usarla o no es decisión de quien juega, no de la ficha.
    expect(r.warnings.some((a) => a.code === "two_weapon_offhand_damage")).toBe(true);
  });
});
