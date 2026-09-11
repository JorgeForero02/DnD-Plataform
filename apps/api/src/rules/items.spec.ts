import type { ResolvedItem } from "@dnd/shared";
import { derive } from "./engine";
import {
  assertValidArmorSet,
  equipmentToEngineInput,
  InvalidEquipmentError,
  type ArmorLike,
} from "./items";

// Carril A2 — los objetos equipados alimentan el motor. Los datos son **inventados a mano**,
// igual que `engine.spec.ts`: el catálogo real (armaduras, armas) es de otro agente en paralelo,
// y mezclar los dos haría que un fallo de transcripción pareciera un fallo de este carril.

function objeto(parcial: Partial<ResolvedItem> = {}): ResolvedItem {
  return {
    ref: "test-item",
    source: "SRD",
    name: "Objeto de prueba",
    kind: "OTHER",
    weightOz: 0,
    effects: [],
    requiresAttunement: false,
    ...parcial,
  };
}

describe("cada efecto de la lista cerrada, uno por uno", () => {
  it("`ac` es una suma plana a la CA", () => {
    const r = equipmentToEngineInput(
      [objeto({ ref: "ring-of-protection", effects: [{ kind: "ac", amount: 1 }] })],
      10,
    );
    expect(r.acBonuses).toEqual([
      {
        amount: 1,
        labelKey: "item.ring-of-protection",
        sourceType: "item",
        sourceKey: "ring-of-protection",
      },
    ]);
    expect(r.modifiers).toHaveLength(0);
  });

  it("`abilityScore` con `mode: add` SUMA la puntuación", () => {
    const r = equipmentToEngineInput(
      [
        objeto({
          ref: "gauntlets-of-ogre-power",
          effects: [{ kind: "abilityScore", ability: "str", mode: "add", amount: 2 }],
        }),
      ],
      10,
    );
    expect(r.modifiers).toEqual([
      {
        target: "ability.str",
        op: "add",
        amount: 2,
        sourceType: "item",
        sourceKey: "gauntlets-of-ogre-power",
        labelKey: "item.gauntlets-of-ogre-power",
      },
    ]);
  });

  it("`abilityScore` con `mode: set` FIJA la puntuación (`override`, no `add`)", () => {
    // El cinturón de fuerza de gigante de piedra: 23 de Fuerza, se tenga la que se tenga.
    const r = equipmentToEngineInput(
      [
        objeto({
          ref: "belt-of-giant-strength",
          effects: [{ kind: "abilityScore", ability: "str", mode: "set", amount: 23 }],
        }),
      ],
      10,
    );
    expect(r.modifiers[0]).toMatchObject({ target: "ability.str", op: "override", amount: 23 });
  });

  it("`save` con `ability` suma solo a esa salvación", () => {
    const r = equipmentToEngineInput(
      [
        objeto({
          ref: "cloak-of-dex-save",
          effects: [{ kind: "save", ability: "dex", amount: 1 }],
        }),
      ],
      10,
    );
    expect(r.modifiers).toEqual([
      {
        target: "save.dex",
        op: "add",
        amount: 1,
        sourceType: "item",
        sourceKey: "cloak-of-dex-save",
        labelKey: "item.cloak-of-dex-save",
      },
    ]);
  });

  it("`save` SIN `ability` suma a las seis salvaciones (la capa de protección)", () => {
    const r = equipmentToEngineInput(
      [objeto({ ref: "cloak-of-protection", effects: [{ kind: "save", amount: 1 }] })],
      10,
    );
    const objetivos = r.modifiers.map((m) => m.target).sort();
    expect(objetivos).toEqual([
      "save.cha",
      "save.con",
      "save.dex",
      "save.int",
      "save.str",
      "save.wis",
    ]);
    expect(r.modifiers.every((m) => m.op === "add" && m.amount === 1)).toBe(true);
  });

  it("`maxHp` suma a los puntos de golpe máximos", () => {
    const r = equipmentToEngineInput(
      [objeto({ ref: "amulet-of-health", effects: [{ kind: "maxHp", amount: 19 }] })],
      10,
    );
    expect(r.modifiers).toEqual([
      {
        target: "maxHp",
        op: "add",
        amount: 19,
        sourceType: "item",
        sourceKey: "amulet-of-health",
        labelKey: "item.amulet-of-health",
      },
    ]);
  });

  it("`speed` suma (o resta) al movimiento que declare", () => {
    const r = equipmentToEngineInput(
      [
        objeto({
          ref: "boots-of-striding",
          effects: [{ kind: "speed", movement: "walk", amount: 10 }],
        }),
      ],
      10,
    );
    expect(r.modifiers).toEqual([
      {
        target: "speed.walk",
        op: "add",
        amount: 10,
        sourceType: "item",
        sourceKey: "boots-of-striding",
        labelKey: "item.boots-of-striding",
      },
    ]);
  });

  it("`skillProficiency` anota la competencia en la habilidad", () => {
    const r = equipmentToEngineInput(
      [
        objeto({
          ref: "cloak-of-elvenkind",
          effects: [{ kind: "skillProficiency", skill: "stealth", level: "expertise" }],
        }),
      ],
      10,
    );
    expect(r.skillProficiencies).toEqual({ stealth: "expertise" });
  });

  it("`saveProficiency` anota la competencia en la salvación", () => {
    const r = equipmentToEngineInput(
      [objeto({ ref: "ring-of-warmth", effects: [{ kind: "saveProficiency", ability: "con" }] })],
      10,
    );
    expect(r.saveProficiencies).toEqual(["con"]);
  });
});

describe("la competencia de los objetos no se duplica: gana la mejor", () => {
  it("dos objetos que dan la misma habilidad se quedan con la mejor, no se suman", () => {
    const r = equipmentToEngineInput(
      [
        objeto({
          ref: "boots-of-quiet",
          effects: [{ kind: "skillProficiency", skill: "stealth", level: "half" }],
        }),
        objeto({
          ref: "cloak-of-elvenkind",
          effects: [{ kind: "skillProficiency", skill: "stealth", level: "expertise" }],
        }),
      ],
      10,
    );
    expect(r.skillProficiencies).toEqual({ stealth: "expertise" });
  });

  it("el orden no importa: la peor después de la mejor no la baja", () => {
    const r = equipmentToEngineInput(
      [
        objeto({
          ref: "cloak-of-elvenkind",
          effects: [{ kind: "skillProficiency", skill: "stealth", level: "expertise" }],
        }),
        objeto({
          ref: "boots-of-quiet",
          effects: [{ kind: "skillProficiency", skill: "stealth", level: "half" }],
        }),
      ],
      10,
    );
    expect(r.skillProficiencies).toEqual({ stealth: "expertise" });
  });

  it("dos objetos que dan la misma competencia de salvación no la duplican en la lista", () => {
    const r = equipmentToEngineInput(
      [
        objeto({ ref: "ring-a", effects: [{ kind: "saveProficiency", ability: "con" }] }),
        objeto({ ref: "ring-b", effects: [{ kind: "saveProficiency", ability: "con" }] }),
      ],
      10,
    );
    expect(r.saveProficiencies).toEqual(["con"]);
  });
});

describe("equipo imposible: dos armaduras de cuerpo, o dos escudos", () => {
  const cotaDeMalla = objeto({
    ref: "chain-mail",
    kind: "ARMOR",
    armor: {
      category: "HEAVY",
      baseAc: 16,
      dexCap: 0,
      strengthRequirement: 0,
      stealthDisadvantage: false,
    },
  });
  const cueroTachonado = objeto({
    ref: "studded-leather",
    kind: "ARMOR",
    armor: { category: "LIGHT", baseAc: 12, strengthRequirement: 0, stealthDisadvantage: false },
  });
  const escudo = objeto({
    ref: "shield",
    kind: "SHIELD",
    armor: { category: "SHIELD", baseAc: 2, strengthRequirement: 0, stealthDisadvantage: false },
  });
  const otroEscudo = objeto({
    ref: "shield-2",
    kind: "SHIELD",
    armor: { category: "SHIELD", baseAc: 2, strengthRequirement: 0, stealthDisadvantage: false },
  });

  it("dos armaduras de cuerpo a la vez lanza InvalidEquipmentError", () => {
    expect(() => equipmentToEngineInput([cotaDeMalla, cueroTachonado], 10)).toThrow(
      InvalidEquipmentError,
    );
  });

  it("dos escudos a la vez lanza InvalidEquipmentError", () => {
    expect(() => equipmentToEngineInput([escudo, otroEscudo], 10)).toThrow(InvalidEquipmentError);
  });

  it("una armadura y un escudo sí se pueden llevar juntos", () => {
    expect(() => equipmentToEngineInput([cotaDeMalla, escudo], 10)).not.toThrow();
  });
});

describe("armadura: el requisito de Fuerza y el sigilo", () => {
  it("por debajo del requisito de Fuerza, −10 pies de velocidad de caminar Y aviso", () => {
    const r = equipmentToEngineInput(
      [
        objeto({
          ref: "chain-mail",
          kind: "ARMOR",
          armor: {
            category: "HEAVY",
            baseAc: 16,
            dexCap: 0,
            strengthRequirement: 13,
            stealthDisadvantage: false,
          },
        }),
      ],
      10, // Fuerza 10, por debajo de 13
    );
    expect(r.modifiers).toContainEqual(
      expect.objectContaining({ target: "speed.walk", op: "add", amount: -10, sourceType: "item" }),
    );
    expect(r.warnings).toContainEqual(
      expect.objectContaining({ code: "armor_strength_requirement_unmet" }),
    );
  });

  // Migración 6, fix round 1 (ALTA-1) — SRD 5.1, «Variant: Encumbrance»: *"When you use this
  // variant, ignore the Strength column of the Armor table in chapter 5."* Con la variante de
  // sobrecarga encendida, el motor no resta los 10 pies por Fuerza insuficiente.
  //
  // Fix round 2 (MEDIA-A) — **tampoco emite el aviso.** La primera versión de este arreglo lo
  // dejaba («la mesa sigue queriendo saber que no llega al requisito»), y eso dejó
  // `vocabulario.ts` diciendo «la velocidad al caminar baja 10 pies» en una hoja donde la
  // velocidad no bajó: el texto mintiendo sobre una regla del servidor, justo lo que
  // `04-convenciones.md` prohíbe. Con la columna de Fuerza ignorada del todo (que es lo que pide
  // el SRD), no hay nada que avisar: ni número, ni aviso sobre un número que no existe.
  it("con la variante de sobrecarga encendida: SIN penalización de velocidad Y sin aviso — no hay nada que avisar", () => {
    const r = equipmentToEngineInput(
      [
        objeto({
          ref: "chain-mail",
          kind: "ARMOR",
          armor: {
            category: "HEAVY",
            baseAc: 16,
            dexCap: 0,
            strengthRequirement: 13,
            stealthDisadvantage: false,
          },
        }),
      ],
      10, // Fuerza 10, por debajo de 13
      false, // heavyArmorSpeedExempt
      undefined, // armorProficiencies
      true, // encumbranceVariant
    );
    expect(r.modifiers.some((m) => m.target === "speed.walk")).toBe(false);
    expect(r.warnings).toHaveLength(0);
  });

  it("con la variante de sobrecarga APAGADA (por defecto): el aviso se queda, junto con la penalización", () => {
    const r = equipmentToEngineInput(
      [
        objeto({
          ref: "chain-mail",
          kind: "ARMOR",
          armor: {
            category: "HEAVY",
            baseAc: 16,
            dexCap: 0,
            strengthRequirement: 13,
            stealthDisadvantage: false,
          },
        }),
      ],
      10,
      false,
      undefined,
      false, // encumbranceVariant apagada
    );
    expect(r.modifiers).toContainEqual(
      expect.objectContaining({ target: "speed.walk", op: "add", amount: -10 }),
    );
    expect(r.warnings).toContainEqual(
      expect.objectContaining({ code: "armor_strength_requirement_unmet" }),
    );
  });

  it("con la Fuerza suficiente, ni penalización ni aviso", () => {
    const r = equipmentToEngineInput(
      [
        objeto({
          ref: "chain-mail",
          kind: "ARMOR",
          armor: {
            category: "HEAVY",
            baseAc: 16,
            dexCap: 0,
            strengthRequirement: 13,
            stealthDisadvantage: false,
          },
        }),
      ],
      15,
    );
    expect(r.modifiers.some((m) => m.target === "speed.walk")).toBe(false);
    expect(r.warnings).toHaveLength(0);
  });

  it("la desventaja en Sigilo es SOLO un aviso: no toca ningún número", () => {
    const r = equipmentToEngineInput(
      [
        objeto({
          ref: "chain-mail",
          kind: "ARMOR",
          armor: {
            category: "HEAVY",
            baseAc: 16,
            dexCap: 0,
            strengthRequirement: 0,
            stealthDisadvantage: true,
          },
        }),
      ],
      10,
    );
    expect(r.modifiers).toHaveLength(0);
    expect(r.warnings).toContainEqual(
      expect.objectContaining({ code: "armor_stealth_disadvantage", key: "skill.stealth" }),
    );
  });
});

describe("armadura de cuerpo → fórmula candidata de CA; escudo → suma plana", () => {
  it("la cota de malla sale como fórmula, no como bono", () => {
    const r = equipmentToEngineInput(
      [
        objeto({
          ref: "chain-mail",
          kind: "ARMOR",
          armor: {
            category: "HEAVY",
            baseAc: 16,
            dexCap: 0,
            strengthRequirement: 0,
            stealthDisadvantage: false,
          },
        }),
      ],
      10,
    );
    expect(r.acFormulas).toEqual([
      {
        key: "chain-mail",
        labelKey: "item.chain-mail",
        base: 16,
        addAbilities: [{ ability: "dex", cap: 0 }],
        sourceType: "item",
        sourceKey: "chain-mail",
      },
    ]);
    expect(r.acBonuses).toHaveLength(0);
  });

  it("el escudo sale como suma plana, no como fórmula candidata", () => {
    const r = equipmentToEngineInput(
      [
        objeto({
          ref: "shield",
          kind: "SHIELD",
          armor: {
            category: "SHIELD",
            baseAc: 2,
            strengthRequirement: 0,
            stealthDisadvantage: false,
          },
        }),
      ],
      10,
    );
    expect(r.acFormulas).toHaveLength(0);
    expect(r.acBonuses).toEqual([
      { amount: 2, labelKey: "item.shield", sourceType: "item", sourceKey: "shield" },
    ]);
  });
});

describe("el caso de mesa completo: cota de malla + escudo + anillo de CA", () => {
  it("cota de malla (16, dexCap 0) + escudo (+2) + anillo +1 CA, con Destreza 20, da CA 19", () => {
    const cotaDeMalla = objeto({
      ref: "chain-mail",
      kind: "ARMOR",
      armor: {
        category: "HEAVY",
        baseAc: 16,
        dexCap: 0,
        strengthRequirement: 0,
        stealthDisadvantage: false,
      },
    });
    const escudo = objeto({
      ref: "shield",
      kind: "SHIELD",
      armor: { category: "SHIELD", baseAc: 2, strengthRequirement: 0, stealthDisadvantage: false },
    });
    const anillo = objeto({
      ref: "ring-of-protection",
      effects: [{ kind: "ac", amount: 1 }],
    });

    const equipo = equipmentToEngineInput([cotaDeMalla, escudo, anillo], 10);
    const r = derive({
      abilities: { str: 10, dex: 20, con: 10, int: 10, wis: 10, cha: 10 },
      level: 1,
      hitDieSize: 10,
      modifiers: equipo.modifiers,
      saveProficiencies: [],
      skillProficiencies: {},
      acFormulas: equipo.acFormulas,
      acBonuses: equipo.acBonuses,
    });

    // Si diera 21, el recorte de Destreza (armadura pesada, dexCap 0) no se habría aplicado.
    expect(r.derived.ac.total).toBe(19);

    // Cuatro pasos del equipo de armadura, más el quinto del anillo, que entra por
    // `modifiers` y se suma DESPUÉS de decidir la fórmula ganadora.
    const pasos = r.derived.ac.steps;
    expect(pasos).toHaveLength(5);
    expect(pasos[0]).toMatchObject({ op: "base", amount: 16, sourceKey: "chain-mail" });
    // **El paso de la característica lleva el modificador bruto y el recorte va aparte**, para
    // que los pasos sumen el total: 16 + 5 − 5 + 2 + 1 = 19. Antes llevaba el ya recortado (0) y
    // además el recorte (−5), así que la explicación sumaba 14 debajo de un 19.
    expect(pasos[1]).toMatchObject({ op: "add", amount: 5, sourceKey: "dex" });
    // El recorte se enseña: sin este paso, «Destreza 20 con armadura pesada» parece un error.
    expect(pasos[2]).toMatchObject({ op: "cap", amount: -5, sourceKey: "chain-mail" });
    expect(pasos.reduce((suma, paso) => suma + paso.amount, 0)).toBe(r.derived.ac.total);
    expect(pasos[3]).toMatchObject({ op: "add", amount: 2, sourceKey: "shield" });
    expect(pasos[4]).toMatchObject({ op: "add", amount: 1, sourceKey: "ring-of-protection" });
  });
});

describe("armadura sin competencia (Tarea 15, I6)", () => {
  // SRD 5.1, «Armor Proficiency»: *«If you wear armor that you lack proficiency with, you
  // have disadvantage on any ability check, saving throw, or attack roll that involves
  // Strength or Dexterity, and you can't cast spells.»* Es **solo aviso**: el motor cuenta y
  // avisa, no impide (doctrina del paso 2) — nadie le quita la CA por no tener el entrenamiento.
  const cotaDePlacas = objeto({
    ref: "plate",
    kind: "ARMOR",
    armor: {
      category: "HEAVY",
      baseAc: 18,
      dexCap: 0,
      strengthRequirement: 15,
      stealthDisadvantage: true,
    },
  });

  it("sin competencia `heavy`, avisa con la clave de la armadura y la categoría", () => {
    const r = equipmentToEngineInput([cotaDePlacas], 15, false, ["light", "medium"]);
    expect(r.warnings).toContainEqual(
      expect.objectContaining({
        code: "armor_not_proficient",
        data: expect.objectContaining({ armorKey: "plate", category: "heavy" }),
      }),
    );
  });

  it("con competencia `heavy`, no avisa", () => {
    const r = equipmentToEngineInput([cotaDePlacas], 15, false, ["light", "medium", "heavy"]);
    expect(r.warnings.some((w) => w.code === "armor_not_proficient")).toBe(false);
  });

  it("sin pasar `armorProficiencies` (compatibilidad), no avisa — el llamador no pidió el chequeo", () => {
    const r = equipmentToEngineInput([cotaDePlacas], 15);
    expect(r.warnings.some((w) => w.code === "armor_not_proficient")).toBe(false);
  });

  // Round 1 de revisión, Low — la categoría "shield" no tenía ningún caso propio: las tres
  // pruebas de arriba solo cubrían armadura de cuerpo (`HEAVY`). Un mago (`armorProficiencies:
  // []` en `classes.ts`) con un escudo cabe en el mismo mecanismo y no lo probaba nada.
  it("un mago con un escudo también avisa: `shield` es una categoría de armadura como cualquier otra", () => {
    const escudo = objeto({
      ref: "shield",
      kind: "SHIELD",
      armor: { category: "SHIELD", baseAc: 2, strengthRequirement: 0, stealthDisadvantage: false },
    });
    const r = equipmentToEngineInput([escudo], 10, false, []);
    expect(r.warnings).toContainEqual(
      expect.objectContaining({
        code: "armor_not_proficient",
        data: expect.objectContaining({ armorKey: "shield", category: "shield" }),
      }),
    );
  });
});

describe("`assertValidArmorSet`, el guardia que comparten las dos puertas del equipo", () => {
  it("no lanza con una armadura sola, o con una armadura y un escudo", () => {
    const armadura: ArmorLike = { category: "LIGHT", baseAc: 11 };
    const escudo: ArmorLike = { category: "SHIELD", baseAc: 2 };
    expect(() => assertValidArmorSet([armadura])).not.toThrow();
    expect(() => assertValidArmorSet([armadura, escudo])).not.toThrow();
  });
});
