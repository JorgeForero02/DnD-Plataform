import { bonoDeCompetencia, proficiencyBonus } from "../engine";
import { SRD_CLASSES } from "./classes";
import { deriveCharacter } from "./index";
import { spellSlotsFor } from "./spell-slots";
import type { CharacterBuild } from "./resolve";

// Los cuatro huecos de mecánica que se cerraron el 2026-09-02, cada uno con su prueba.
//
// Salieron de un repaso pedido por el autor a mitad de fase, con 2A.1–2A.5 ya en producción, y
// están razonados en `docs/superpowers/specs/2026-09-02-huecos-de-mecanica-2A.md`. Los cuatro
// tienen la misma forma: **cerrarlos hoy es cambiar una forma de datos; cerrarlos mañana es
// migrar filas escritas**.

function ficha(parcial: Partial<CharacterBuild> = {}): CharacterBuild {
  return {
    abilities: { str: 10, dex: 14, con: 12, int: 13, wis: 12, cha: 15 },
    race: { source: "SRD", key: "human" },
    class: { source: "SRD", key: "fighter" },
    level: 1,
    ...parcial,
  };
}

describe("M1 · la media competencia, que dos clases del SRD ya usaban", () => {
  it.each([
    [2, 1],
    [4, 1],
    [5, 1],
    [8, 1],
    [9, 2],
    [12, 2],
    [13, 2],
    [17, 3],
    [20, 3],
  ])(
    "a nivel %i la media competencia vale %i: la mitad del bonificador, redondeando hacia abajo",
    (level, esperado) => {
      // Con competencia +3 son +1, no +1,5. La 5.ª edición redondea hacia abajo salvo que diga
      // lo contrario, y esta no lo dice.
      expect(bonoDeCompetencia("half", proficiencyBonus(level))).toBe(esperado);
    },
  );

  it("los cuatro estados aportan lo que dicen, y ninguno se confunde con otro", () => {
    expect(bonoDeCompetencia("none", 4)).toBe(0);
    expect(bonoDeCompetencia("half", 4)).toBe(2);
    expect(bonoDeCompetencia("proficient", 4)).toBe(4);
    expect(bonoDeCompetencia("expertise", 4)).toBe(8);
  });

  it("una habilidad con media competencia suma la mitad, y lo enseña en la traza", () => {
    const hoja = deriveCharacter(ficha({ level: 5, skillProficiencies: { stealth: "half" } }));
    // Destreza 15 (14 base + 1 humano) → mod +2. Competencia a nivel 5 = +3 → la mitad, +1.
    expect(hoja.derived["skill.stealth"].total).toBe(3);
    expect(hoja.derived["skill.stealth"].steps.map((s) => s.labelKey)).toContain("halfProficiency");
  });

  it("gana la mejor y no se suman: competente NO recibe además la mitad", () => {
    const media = deriveCharacter(ficha({ level: 5, skillProficiencies: { stealth: "half" } }));
    const competente = deriveCharacter(
      ficha({ level: 5, skillProficiencies: { stealth: "proficient" } }),
    );
    expect(media.derived["skill.stealth"].total).toBe(3);
    expect(competente.derived["skill.stealth"].total).toBe(5);
  });

  it("las dos aptitudes que lo motivaron siguen en el catálogo, con su nivel", () => {
    // Si alguien las borra, esta forma deja de tener quien la use y hay que revisar el porqué.
    const bardo = SRD_CLASSES.find((c) => c.key === "bard")!;
    const campeon = SRD_CLASSES.find((c) => c.key === "fighter")!.subclasses[0];
    expect(bardo.features.find((f) => f.key === "jack-of-all-trades")?.level).toBe(2);
    expect(campeon.features.find((f) => f.key === "remarkable-athlete")?.level).toBe(7);
  });
});

describe("M2 · Ataque Extra: la hoja ya no miente al nivel 5", () => {
  it.each([
    [1, 1],
    [4, 1],
    [5, 2],
    [10, 2],
    [11, 3],
    [19, 3],
    [20, 4],
  ])("el guerrero de nivel %i tiene %i ataques por acción", (level, esperado) => {
    expect(deriveCharacter(ficha({ level })).attacksPerAction).toBe(esperado);
  });

  it.each(["barbarian", "monk", "paladin", "ranger"])(
    "%s llega a dos al nivel 5 y se queda ahí",
    (clave) => {
      expect(
        deriveCharacter(ficha({ class: { source: "SRD", key: clave }, level: 4 })).attacksPerAction,
      ).toBe(1);
      expect(
        deriveCharacter(ficha({ class: { source: "SRD", key: clave }, level: 5 })).attacksPerAction,
      ).toBe(2);
      expect(
        deriveCharacter(ficha({ class: { source: "SRD", key: clave }, level: 20 }))
          .attacksPerAction,
      ).toBe(2);
    },
  );

  it.each(["rogue", "wizard", "bard", "cleric", "druid", "sorcerer", "warlock"])(
    "%s NO tiene Ataque Extra ni al nivel 20",
    (clave) => {
      expect(
        deriveCharacter(ficha({ class: { source: "SRD", key: clave }, level: 20 }))
          .attacksPerAction,
      ).toBe(1);
    },
  );
});

describe("M3 · los espacios de conjuro que pidieron los jugadores", () => {
  it("el mago de nivel 1 tiene dos espacios de nivel 1, y nada más", () => {
    expect(spellSlotsFor("FULL", 1)).toEqual([{ spellLevel: 1, slots: 2 }]);
  });

  it("el mago de nivel 5 tiene 4/3/2", () => {
    expect(spellSlotsFor("FULL", 5)).toEqual([
      { spellLevel: 1, slots: 4 },
      { spellLevel: 2, slots: 3 },
      { spellLevel: 3, slots: 2 },
    ]);
  });

  it("el lanzador completo de nivel 20 llega a noveno", () => {
    expect(spellSlotsFor("FULL", 20)).toEqual([
      { spellLevel: 1, slots: 4 },
      { spellLevel: 2, slots: 3 },
      { spellLevel: 3, slots: 3 },
      { spellLevel: 4, slots: 3 },
      { spellLevel: 5, slots: 3 },
      { spellLevel: 6, slots: 2 },
      { spellLevel: 7, slots: 2 },
      { spellLevel: 8, slots: 1 },
      { spellLevel: 9, slots: 1 },
    ]);
  });

  it("el paladín de nivel 1 NO tiene espacios: la fila vacía es el punto", () => {
    // Es el error obvio de la tabla media, y por eso su primera fila está vacía a propósito.
    expect(spellSlotsFor("HALF", 1)).toEqual([]);
    expect(spellSlotsFor("HALF", 2)).toEqual([{ spellLevel: 1, slots: 2 }]);
  });

  it("el medio lanzador de nivel 20 se queda en quinto, no llega a noveno", () => {
    expect(spellSlotsFor("HALF", 20).map((s) => s.spellLevel)).toEqual([1, 2, 3, 4, 5]);
  });

  it("el brujo tiene pocos espacios, todos del mismo nivel", () => {
    expect(spellSlotsFor("PACT", 1)).toEqual([{ spellLevel: 1, slots: 1 }]);
    expect(spellSlotsFor("PACT", 5)).toEqual([{ spellLevel: 3, slots: 2 }]);
    expect(spellSlotsFor("PACT", 20)).toEqual([{ spellLevel: 5, slots: 4 }]);
  });

  it("y **repone en descanso corto**, que es lo que lo distingue de los otros dos", () => {
    expect(
      deriveCharacter(ficha({ class: { source: "SRD", key: "warlock" } })).spellSlotResetOn,
    ).toBe("SHORT_REST");
    expect(
      deriveCharacter(ficha({ class: { source: "SRD", key: "wizard" } })).spellSlotResetOn,
    ).toBe("LONG_REST");
  });

  it("quien no lanza no tiene espacios ni sitio donde reponerlos", () => {
    const guerrero = deriveCharacter(ficha({ level: 20 }));
    expect(guerrero.spellSlots).toEqual([]);
    expect(guerrero.spellSlotResetOn).toBe("NONE");
  });

  it("las ocho clases lanzadoras del SRD tienen progresión, y las cuatro marciales no", () => {
    const conProgresion = SRD_CLASSES.filter((c) => c.spellProgression).map((c) => c.key);
    expect(conProgresion.sort()).toEqual(
      ["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "warlock", "wizard"].sort(),
    );
  });

  it("la clase que lanza tiene característica de lanzamiento, y al revés", () => {
    for (const clase of SRD_CLASSES)
      expect(Boolean(clase.spellProgression)).toBe(Boolean(clase.spellcastingAbility));
  });

  it("un nivel fuera de 1..20 no inventa una tabla", () => {
    expect(spellSlotsFor("FULL", 0)).toEqual([]);
    expect(spellSlotsFor("FULL", 21)).toEqual([]);
  });
});

describe("M4 · la iniciativa, que estaba en la hoja y no se derivaba", () => {
  it("es el modificador de Destreza", () => {
    // Destreza 15 (14 base + 1 humano) → +2.
    expect(deriveCharacter(ficha()).derived.initiative.total).toBe(2);
  });

  it("no depende del nivel: no lleva bonificador de competencia", () => {
    expect(deriveCharacter(ficha({ level: 20 })).derived.initiative.total).toBe(2);
  });

  it("la traza dice de dónde sale, como todo lo demás", () => {
    const pasos = deriveCharacter(ficha()).derived.initiative.steps;
    expect(pasos[0]).toMatchObject({ sourceType: "ability", sourceKey: "dex" });
  });

  it("un modificador que apunte a la iniciativa se aplica", () => {
    // No hay nada en 2A que lo emita, pero la forma tiene que aceptarlo: el Alerta de 2B y el
    // Instinto Salvaje del bárbaro escriben justo aquí.
    const hoja = deriveCharacter(
      ficha({ race: { source: "SRD", key: "elf" }, abilities: { ...ficha().abilities, dex: 16 } }),
    );
    // Elfo: +2 Destreza → 18 → mod +4.
    expect(hoja.derived.initiative.total).toBe(4);
  });
});

describe("los sentidos llegan a la hoja, no se quedan en el catálogo", () => {
  // Media pregunta del hueco H5, y la que se oye en la mesa: «¿tú ves en la oscuridad?».
  // **Es un sentido, no iluminación**: dice cuánto alcanza la vista, no qué hay iluminado.
  // Lo segundo necesita posiciones y es la fase 3 (spec de distancias, §12 bis).
  it.each([
    ["dwarf", 60],
    ["elf", 60],
    ["gnome", 60],
    ["half-elf", 60],
    ["half-orc", 60],
    ["tiefling", 60],
    ["human", 0],
    ["halfling", 0],
    ["dragonborn", 0],
  ])("%s ve %i pies en la oscuridad", (raza, pies) => {
    const hoja = deriveCharacter(ficha({ race: { source: "SRD", key: raza } }));
    expect(hoja.derived["senses.darkvision"].total).toBe(pies);
  });

  it("la traza dice que viene de la raza, como todo lo demás", () => {
    const hoja = deriveCharacter(ficha({ race: { source: "SRD", key: "dwarf" } }));
    expect(hoja.derived["senses.darkvision"].steps[0]).toMatchObject({
      sourceType: "race",
      sourceKey: "darkvision",
    });
  });

  it("no ver en la oscuridad es cero, no la ausencia del valor: la hoja siempre puede decirlo", () => {
    const hoja = deriveCharacter(ficha({ race: { source: "SRD", key: "human" } }));
    expect(hoja.derived["senses.darkvision"]).toBeDefined();
    expect(hoja.derived["senses.darkvision"].total).toBe(0);
  });
});
