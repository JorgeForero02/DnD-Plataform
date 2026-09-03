import {
  abilityModifier,
  averageHitDie,
  derive,
  proficiencyBonus,
  totalConModificadores,
  type AcFormula,
  type EngineInput,
  type Modifier,
} from "./engine";

// Tarea 2A.2. Los datos son **inventados a mano**: una clase y una armadura de mentira. El
// catálogo real es 2A.3, y mezclarlos haría que un fallo del motor pareciera un fallo de
// transcripción.

function personaje(parcial: Partial<EngineInput> = {}): EngineInput {
  return {
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    level: 1,
    hitDieSize: 10,
    modifiers: [],
    saveProficiencies: [],
    skillProficiencies: {},
    ...parcial,
  };
}

const COTA_DE_MALLA: AcFormula = {
  key: "chain-mail",
  labelKey: "ac.chainMail",
  base: 16,
  // Armadura pesada: la Destreza **no suma nada**. Tope 0, no «sin Destreza»: la diferencia
  // importa porque el recorte se enseña en la traza.
  addAbility: "dex",
  abilityCap: 0,
  sourceType: "item",
  sourceKey: "chain-mail",
};

const ARMADURA_MEDIA: AcFormula = {
  key: "half-plate",
  labelKey: "ac.halfPlate",
  base: 15,
  addAbility: "dex",
  abilityCap: 2,
  sourceType: "item",
  sourceKey: "half-plate",
};

describe("las fórmulas del SRD 5.1, una por una", () => {
  it.each([
    [1, -5],
    [2, -4],
    [3, -4],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [15, 2],
    [20, 5],
    [30, 10],
  ])("el modificador de una puntuación %i es %i", (puntuacion, esperado) => {
    expect(abilityModifier(puntuacion)).toBe(esperado);
  });

  it.each([
    [1, 2],
    [4, 2],
    [5, 3],
    [8, 3],
    [9, 4],
    [12, 4],
    [13, 5],
    [16, 5],
    [17, 6],
    [20, 6],
  ])("el bonificador de competencia a nivel %i es +%i", (nivel, esperado) => {
    expect(proficiencyBonus(nivel)).toBe(esperado);
  });

  it.each([
    [6, 4],
    [8, 5],
    [10, 6],
    [12, 7],
  ])("la media de un d%i se redondea hacia arriba: %i", (dado, esperado) => {
    // d10 da 6, no 5,5 ni 5. Redondear hacia abajo aquí resta un punto de vida por nivel a
    // todos los personajes del juego.
    expect(averageHitDie(dado)).toBe(esperado);
  });
});

describe("la CA: el caso que un modelo aditivo calcula mal", () => {
  it("cota de malla + escudo + Destreza 14 da 18, con la Destreza CAPADA a 0", () => {
    // Es el caso del §2 del plan. Una suma ingenua daría 16 + 2 + 2 = 20, y sería un error
    // silencioso: nadie nota que un personaje es más difícil de acertar de lo que debe.
    const r = derive(
      personaje({
        abilities: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
        acFormulas: [COTA_DE_MALLA],
        acBonuses: [{ amount: 2, labelKey: "ac.shield", sourceType: "item", sourceKey: "shield" }],
      }),
    );

    expect(r.derived.ac.total).toBe(18);

    const pasos = r.derived.ac.steps;
    expect(pasos).toHaveLength(4);
    expect(pasos[0]).toMatchObject({ op: "base", amount: 16, sourceKey: "chain-mail" });
    // El paso de la característica lleva el modificador **bruto** (+2) y el recorte va aparte
    // (−2): así los pasos suman el total. Con el recortado en el paso y el recorte además
    // restando, la explicación de un 18 sumaba 16.
    expect(pasos[1]).toMatchObject({ op: "add", amount: 2, sourceKey: "dex" });
    // El recorte se **enseña**: sin este paso, «CA 18 con Destreza 14» parece una resta perdida.
    expect(pasos[2]).toMatchObject({ op: "cap", amount: -2, sourceKey: "chain-mail" });
    expect(pasos[3]).toMatchObject({ op: "add", amount: 2, sourceKey: "shield" });
    expect(pasos.reduce((suma, paso) => suma + paso.amount, 0)).toBe(r.derived.ac.total);
  });

  it("la armadura media capa la Destreza a 2, ni más ni menos", () => {
    const r = derive(
      personaje({
        abilities: { str: 10, dex: 20, con: 10, int: 10, wis: 10, cha: 10 },
        acFormulas: [ARMADURA_MEDIA],
      }),
    );
    expect(r.derived.ac.total).toBe(17);
    expect(r.derived.ac.steps.find((p) => p.op === "cap")).toMatchObject({ amount: -3 });
  });

  it("con Destreza baja, el tope no inventa un recorte que no existe", () => {
    const r = derive(
      personaje({
        abilities: { str: 10, dex: 12, con: 10, int: 10, wis: 10, cha: 10 },
        acFormulas: [ARMADURA_MEDIA],
      }),
    );
    expect(r.derived.ac.total).toBe(16);
    expect(r.derived.ac.steps.some((p) => p.op === "cap")).toBe(false);
  });

  it("gana la fórmula mayor, y la descartada sale como AVISO con su total", () => {
    const r = derive(
      personaje({
        abilities: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 },
        // Sin armadura con Destreza 18 da 14; la cota de malla da 16. Gana la cota.
        acFormulas: [
          {
            key: "unarmored",
            labelKey: "ac.unarmored",
            base: 10,
            addAbility: "dex",
            sourceType: "base",
            sourceKey: "unarmored",
          },
          COTA_DE_MALLA,
        ],
      }),
    );
    expect(r.derived.ac.total).toBe(16);
    const aviso = r.warnings.find((w) => w.code === "ac_formula_discarded");
    expect(aviso).toBeDefined();
    expect(aviso?.data).toMatchObject({ formula: "unarmored", total: 14 });
  });

  it("sin armadura son 10 + Destreza, sin tope", () => {
    const r = derive(
      personaje({ abilities: { str: 10, dex: 20, con: 10, int: 10, wis: 10, cha: 10 } }),
    );
    expect(r.derived.ac.total).toBe(15);
  });
});

describe("puntos de golpe máximos", () => {
  it("a nivel 1 son el dado entero más Constitución", () => {
    const r = derive(
      personaje({ abilities: { str: 10, dex: 10, con: 14, int: 10, wis: 10, cha: 10 } }),
    );
    expect(r.derived.maxHp.total).toBe(12);
  });

  it("la Constitución se suma en CADA nivel, no una sola vez", () => {
    // Nivel 5, d10, Constitución 16 (+3): 10+3, y luego cuatro veces (6+3) = 13 + 36 = 49.
    // El error clásico es sumar el modificador una vez y quedarse en 37.
    const r = derive(
      personaje({
        level: 5,
        abilities: { str: 10, dex: 10, con: 16, int: 10, wis: 10, cha: 10 },
      }),
    );
    expect(r.derived.maxHp.total).toBe(49);
  });

  it("nunca baja de 1 punto por nivel, por mala que sea la Constitución", () => {
    const r = derive(
      personaje({
        level: 3,
        hitDieSize: 6,
        abilities: { str: 10, dex: 10, con: 1, int: 10, wis: 10, cha: 10 },
      }),
    );
    // 6−5 = 1, y luego dos veces (4−5) = −2 → daría 1. El suelo lo deja en 3.
    expect(r.derived.maxHp.total).toBe(3);
    expect(r.derived.maxHp.steps.some((p) => p.labelKey === "maxHp.minimum")).toBe(true);
  });
});

describe("salvaciones, habilidades y pericia", () => {
  it("una salvación con competencia suma el bonificador; sin ella, no", () => {
    const r = derive(
      personaje({
        level: 5,
        abilities: { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 },
        saveProficiencies: ["dex"],
      }),
    );
    expect(r.derived["save.dex"].total).toBe(3 + 3);
    expect(r.derived["save.str"].total).toBe(0);
  });

  it("la pericia DUPLICA el bonificador, y la traza lo enseña en dos pasos", () => {
    // Un booleano no puede representar esto, y por eso la competencia es un enum de tres
    // estados. Nivel 5 (+3), Destreza 16 (+3): competente da 6, con pericia da 9.
    const r = derive(
      personaje({
        level: 5,
        abilities: { str: 10, dex: 16, con: 10, int: 10, wis: 10, cha: 10 },
        skillProficiencies: { stealth: "expertise", acrobatics: "proficient", athletics: "none" },
      }),
    );
    expect(r.derived["skill.stealth"].total).toBe(9);
    expect(r.derived["skill.acrobatics"].total).toBe(6);
    expect(r.derived["skill.athletics"].total).toBe(0);
    expect(r.derived["skill.stealth"].steps.filter((p) => p.op === "add")).toHaveLength(2);
  });

  it("las dieciocho habilidades del SRD salen todas, no solo las competentes", () => {
    const r = derive(personaje());
    const habilidades = Object.keys(r.derived).filter((k) => k.startsWith("skill."));
    expect(habilidades).toHaveLength(18);
  });

  it("la percepción pasiva es 10 más el bono de Percepción", () => {
    const r = derive(
      personaje({
        level: 5,
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 },
        skillProficiencies: { perception: "proficient" },
      }),
    );
    expect(r.derived.passivePerception.total).toBe(10 + 3 + 3);
  });
});

describe("conjuros", () => {
  it("la CD de salvación es 8 + competencia + la característica de lanzamiento", () => {
    const r = derive(
      personaje({
        level: 5,
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 18, cha: 10 },
        spellcastingAbility: "wis",
      }),
    );
    expect(r.derived.spellSaveDc.total).toBe(8 + 3 + 4);
    expect(r.derived["attack.spell"].total).toBe(3 + 4);
  });

  it("una clase que no lanza no tiene CD de conjuros: la clave NO existe", () => {
    // No es 0: es que no aplica. Un 0 en pantalla es una CD que alguien podría intentar superar.
    const r = derive(personaje());
    expect(r.derived.spellSaveDc).toBeUndefined();
    expect(r.derived["attack.spell"]).toBeUndefined();
  });
});

describe("modificadores externos", () => {
  const bonoRacial: Modifier = {
    target: "ability.str",
    op: "add",
    amount: 2,
    sourceType: "race",
    sourceKey: "dwarf-hill",
    labelKey: "race.dwarf.str",
  };

  it("la raza entra como modificador, no premezclada en la puntuación base", () => {
    const r = derive(
      personaje({
        abilities: { str: 15, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
        modifiers: [bonoRacial],
      }),
    );
    expect(r.derived["ability.str"].total).toBe(17);
    expect(r.derived["abilityMod.str"].total).toBe(3);
    // La traza dice de dónde salieron los 2 puntos, que es justo lo que un jugador pregunta.
    expect(r.derived["ability.str"].steps[1]).toMatchObject({ sourceKey: "dwarf-hill", amount: 2 });
  });

  it("una anulación manual del DM SUSTITUYE el valor, no se suma", () => {
    const r = derive(
      personaje({
        modifiers: [
          {
            target: "ac",
            op: "add",
            amount: 1,
            sourceType: "item",
            sourceKey: "ring",
            labelKey: "item.ring",
          },
          {
            target: "ac",
            op: "override",
            amount: 25,
            sourceType: "manual",
            sourceKey: "dm",
            labelKey: "manual.dm",
          },
        ],
      }),
    );
    // 10 + 1 = 11, y la anulación lo deja en 25. Si se sumara, daría 36.
    expect(r.derived.ac.total).toBe(25);
    const anulacion = r.derived.ac.steps.find((p) => p.op === "override");
    expect(anulacion).toMatchObject({ amount: 14, sourceKey: "dm" });
  });
});

describe("velocidades: base de la raza más lo que sumen (o resten) los objetos", () => {
  it("sin objetos, la velocidad es exactamente la base", () => {
    const r = derive(personaje({ baseSpeeds: { walk: 30 } }));
    expect(r.derived["speed.walk"].total).toBe(30);
    expect(r.derived["speed.walk"].steps).toEqual([
      {
        op: "base",
        amount: 30,
        sourceType: "race",
        sourceKey: "walk",
        labelKey: "speed.walk.base",
      },
    ]);
  });

  it("un objeto que suma velocidad la sube, y la traza enseña los dos pasos", () => {
    const r = derive(
      personaje({
        baseSpeeds: { walk: 30 },
        modifiers: [
          {
            target: "speed.walk",
            op: "add",
            amount: 10,
            sourceType: "item",
            sourceKey: "boots-of-striding",
            labelKey: "item.boots-of-striding",
          },
        ],
      }),
    );
    expect(r.derived["speed.walk"].total).toBe(40);
    expect(r.derived["speed.walk"].steps).toHaveLength(2);
  });

  it("un objeto que resta velocidad la baja (armadura sin la Fuerza necesaria)", () => {
    const r = derive(
      personaje({
        baseSpeeds: { walk: 30 },
        modifiers: [
          {
            target: "speed.walk",
            op: "add",
            amount: -10,
            sourceType: "item",
            sourceKey: "chain-mail",
            labelKey: "item.chain-mail.strengthPenalty",
          },
        ],
      }),
    );
    expect(r.derived["speed.walk"].total).toBe(20);
  });

  it("una anulación manual (OVERRIDABLE_KEYS incluye speed.walk) SUSTITUYE el total", () => {
    const r = derive(
      personaje({
        baseSpeeds: { walk: 30 },
        modifiers: [
          {
            target: "speed.walk",
            op: "add",
            amount: 10,
            sourceType: "item",
            sourceKey: "boots-of-striding",
            labelKey: "item.boots-of-striding",
          },
          {
            target: "speed.walk",
            op: "override",
            amount: 0,
            sourceType: "manual",
            sourceKey: "dm",
            labelKey: "override.manual",
          },
        ],
      }),
    );
    // Si se sumara en vez de sustituir, darían 40, no 0 (paralizado, por ejemplo).
    expect(r.derived["speed.walk"].total).toBe(0);
  });

  it("la traza suma exactamente el total: base + add + add", () => {
    const r = derive(
      personaje({
        baseSpeeds: { walk: 30 },
        modifiers: [
          {
            target: "speed.walk",
            op: "add",
            amount: 10,
            sourceType: "item",
            sourceKey: "boots-of-striding",
            labelKey: "item.boots-of-striding",
          },
          {
            target: "speed.walk",
            op: "add",
            amount: -5,
            sourceType: "manual",
            sourceKey: "difficult-terrain",
            labelKey: "manual.terrain",
          },
        ],
      }),
    );
    const suma = r.derived["speed.walk"].steps.reduce((acc, p) => acc + p.amount, 0);
    expect(suma).toBe(r.derived["speed.walk"].total);
    expect(suma).toBe(35);
  });

  it("un objeto puede conceder un tipo de movimiento que la base no tiene (vuelo)", () => {
    // Una raza sin velocidad de vuelo (no está en `baseSpeeds`) más un anillo de vuelo: el
    // motor tiene que poder derivar `speed.fly` partiendo de 0, no fallar por falta de base.
    const r = derive(
      personaje({
        baseSpeeds: { walk: 30 },
        modifiers: [
          {
            target: "speed.fly",
            op: "add",
            amount: 60,
            sourceType: "item",
            sourceKey: "ring-of-flying",
            labelKey: "item.ring-of-flying",
          },
        ],
      }),
    );
    expect(r.derived["speed.fly"].total).toBe(60);
    expect(r.derived["speed.fly"].steps[0]).toMatchObject({ op: "base", amount: 0 });
  });
});

describe("totalConModificadores: el mismo total que aplicar(), sin traza", () => {
  it("suma los `add` y deja ganar el último `override`", () => {
    const modifiers: Modifier[] = [
      {
        target: "speed.walk",
        op: "add",
        amount: 10,
        sourceType: "item",
        sourceKey: "a",
        labelKey: "a",
      },
      {
        target: "speed.walk",
        op: "add",
        amount: -5,
        sourceType: "item",
        sourceKey: "b",
        labelKey: "b",
      },
    ];
    expect(totalConModificadores(30, "speed.walk", modifiers)).toBe(35);

    const conOverride: Modifier[] = [
      ...modifiers,
      {
        target: "speed.walk",
        op: "override",
        amount: 0,
        sourceType: "manual",
        sourceKey: "dm",
        labelKey: "m",
      },
    ];
    expect(totalConModificadores(30, "speed.walk", conOverride)).toBe(0);
  });

  it("un modificador de otra clave no afecta al total", () => {
    const modifiers: Modifier[] = [
      {
        target: "speed.fly",
        op: "add",
        amount: 60,
        sourceType: "item",
        sourceKey: "a",
        labelKey: "a",
      },
    ];
    expect(totalConModificadores(30, "speed.walk", modifiers)).toBe(30);
  });
});

describe("el motor es determinista", () => {
  it("los mismos datos dan exactamente la misma salida", () => {
    const entrada = personaje({
      level: 7,
      abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
      acFormulas: [COTA_DE_MALLA, ARMADURA_MEDIA],
      saveProficiencies: ["str", "con"],
      skillProficiencies: { athletics: "expertise", perception: "proficient" },
      spellcastingAbility: "cha",
    });
    expect(derive(entrada)).toEqual(derive(entrada));
  });

  it("no usa el azar: sustituir Math.random por una trampa no cambia nada", () => {
    // La comprobación que el plan pide explícitamente. Si alguien mete una tirada dentro del
    // motor, este test la caza en vez de descubrirse con una hoja que cambia al recargar.
    const original = Math.random;
    Math.random = () => {
      throw new Error("El motor no puede usar azar: es determinista por contrato.");
    };
    try {
      expect(() => derive(personaje({ level: 5 }))).not.toThrow();
    } finally {
      Math.random = original;
    }
  });
});
