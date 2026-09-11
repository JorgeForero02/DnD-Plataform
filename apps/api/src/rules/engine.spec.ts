import type { AbilityKey, Origen } from "@dnd/shared";
import {
  abilityModifier,
  averageHitDie,
  derive,
  proficiencyBonus,
  resolverOrigen,
  totalConModificadores,
  type AcFormula,
  type ContextoDeDerivacion,
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
  addAbilities: [{ ability: "dex", cap: 0 }],
  sourceType: "item",
  sourceKey: "chain-mail",
};

const ARMADURA_MEDIA: AcFormula = {
  key: "half-plate",
  labelKey: "ac.halfPlate",
  base: 15,
  addAbilities: [{ ability: "dex", cap: 2 }],
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
            addAbilities: [{ ability: "dex" }],
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

  // Ronda 2 de revisión (2026-09-11) — `passivePerception` es una de las cinco claves de
  // `OVERRIDABLE_KEYS` y `derived.passivePerception` se construía a mano, sin pasar por
  // `aplicar()`, así que una anulación del DM apuntada a ella no hacía nada: el ticket J7 existe
  // exactamente para que "la anulación del DM funciona y enseña su motivo", y una clave anulable
  // que el motor ignora contradice eso.
  it("ticket J7, ronda 2 — una anulación del DM sobre la percepción pasiva sustituye el total y lleva su motivo", () => {
    const r = derive(
      personaje({
        level: 5,
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 },
        skillProficiencies: { perception: "proficient" },
        modifiers: [
          {
            target: "passivePerception",
            op: "override",
            amount: 20,
            sourceType: "manual",
            sourceKey: "dm",
            labelKey: "override.manual",
            reason: "El DM lo dice",
          },
        ],
      }),
    );
    expect(r.derived.passivePerception.total).toBe(20);
    const anulacion = r.derived.passivePerception.steps.find((p) => p.op === "override");
    expect(anulacion).toMatchObject({ reason: "El DM lo dice" });
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

  it("ticket J7 — el motivo del DM viaja del modificador al paso de la traza", () => {
    const r = derive(
      personaje({
        modifiers: [
          {
            target: "ac",
            op: "override",
            amount: 18,
            sourceType: "manual",
            sourceKey: "dm",
            labelKey: "override.manual",
            reason: "El DM lo dice",
          },
        ],
      }),
    );
    const anulacion = r.derived.ac.steps.find((p) => p.op === "override");
    expect(anulacion).toMatchObject({ reason: "El DM lo dice" });
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

describe("un tope de Destreza de 0 no deja sumar, y tampoco deja restar", () => {
  const PLACAS: AcFormula = {
    key: "plate",
    labelKey: "armor.plate",
    base: 18,
    addAbilities: [{ ability: "dex", cap: 0 }],
    sourceType: "item",
    sourceKey: "plate",
  };

  it("con Destreza 8 (−1) la armadura pesada da 18, no 17", () => {
    const r = derive(
      personaje({
        abilities: { str: 16, dex: 8, con: 14, int: 10, wis: 10, cha: 10 },
        acFormulas: [PLACAS],
      }),
    );

    // SRD 5.1: la armadura pesada **no te deja sumar** el modificador de Destreza. No dice
    // «resta si es malo», y `Math.min(−1, 0)` lo hacía restar: era un punto de CA de menos justo
    // en el arquetipo que baja Destreza para subir Fuerza.
    expect(r.derived.ac.total).toBe(18);
    const pasos = r.derived.ac.steps;
    expect(pasos.reduce((suma, p) => suma + p.amount, 0)).toBe(18);
  });

  it("pero en armadura MEDIA una Destreza negativa sí resta: ahí el tope es un máximo", () => {
    const media: AcFormula = {
      ...PLACAS,
      key: "hide",
      base: 12,
      addAbilities: [{ ability: "dex", cap: 2 }],
    };
    const r = derive(
      personaje({
        abilities: { str: 16, dex: 8, con: 14, int: 10, wis: 10, cha: 10 },
        acFormulas: [media],
      }),
    );

    expect(r.derived.ac.total).toBe(11);
  });
});

describe("una fórmula de CA puede sumar MÁS DE UNA característica (paso 1, tarea 5)", () => {
  // **SRD 5.1, Barbarian, Unarmored Defense:** *«While you are not wearing any armor, your Armor
  // Class equals 10 + your Dexterity modifier + your Constitution modifier. You can use a shield
  // and still gain this benefit.»* Y el monje: *«While you are wearing no armor and not wielding a
  // shield, your AC equals 10 + your Dexterity modifier + your Wisdom modifier.»*
  //
  // Ninguna de las dos era expresable con una sola característica, así que un bárbaro salía con
  // **la CA más baja de lo que le toca y con la traza convincente al lado** — que es peor que un
  // error visible. **Ninguna de las dos topa nada**, y por eso el tope pasa a ser **por
  // característica** y no global: la armadura media sigue topando la Destreza en +2 sin que eso
  // diga nada de la Constitución.
  //
  // Esta tarea NO mecaniza la aptitud: no añade la Defensa sin armadura al catálogo de clases
  // —eso es el paso 2—. Lo que arregla es que el modelo pueda decirla.

  const DEFENSA_SIN_ARMADURA_BARBARO: AcFormula = {
    key: "unarmored-defense-barbarian",
    labelKey: "ac.unarmoredDefense",
    base: 10,
    addAbilities: [{ ability: "dex" }, { ability: "con" }],
    sourceType: "class",
    sourceKey: "barbarian",
  };

  it("un bárbaro con DES +2 y CON +3 sin armadura tiene CA 15, con los dos pasos en la traza", () => {
    const r = derive(
      personaje({
        // DES 14 => +2, CON 16 => +3.
        abilities: { str: 16, dex: 14, con: 16, int: 10, wis: 10, cha: 10 },
        acFormulas: [DEFENSA_SIN_ARMADURA_BARBARO],
      }),
    );

    expect(r.derived.ac.total).toBe(15);
    expect(r.derived.ac.steps.filter((p) => p.op === "add")).toHaveLength(2);
    // La traza tiene que **sumar el total**: una explicación que no cuadra es peor que ninguna.
    expect(r.derived.ac.steps.reduce((suma, p) => suma + p.amount, 0)).toBe(15);
  });

  it("y la traza nombra las DOS características, no una sola dos veces", () => {
    const r = derive(
      personaje({
        abilities: { str: 16, dex: 14, con: 16, int: 10, wis: 10, cha: 10 },
        acFormulas: [DEFENSA_SIN_ARMADURA_BARBARO],
      }),
    );

    const sumas = r.derived.ac.steps.filter((p) => p.op === "add").map((p) => p.labelKey);
    expect(sumas).toEqual(["abilityMod.dex", "abilityMod.con"]);
  });

  it("el monje suma Sabiduría, y una característica negativa RESTA cuando no hay tope", () => {
    // Sin tope la regla es una suma pelada: 10 + DES + SAB. Con SAB 8 (−1) el número baja, y eso
    // es correcto — el tope de la armadura es lo que convierte una suma en «suma, como mucho».
    const monje: AcFormula = {
      key: "unarmored-defense-monk",
      labelKey: "ac.unarmoredDefense",
      base: 10,
      addAbilities: [{ ability: "dex" }, { ability: "wis" }],
      sourceType: "class",
      sourceKey: "monk",
    };
    const r = derive(
      personaje({
        abilities: { str: 10, dex: 14, con: 10, int: 10, wis: 8, cha: 10 },
        acFormulas: [monje],
      }),
    );

    expect(r.derived.ac.total).toBe(11);
  });

  it("el tope es POR CARACTERÍSTICA: topar la Destreza no toca a la Constitución", () => {
    // Fórmula inventada a propósito para el caso que la interfaz vieja no podía ni escribir.
    const mixta: AcFormula = {
      key: "mixta",
      labelKey: "ac.unarmoredDefense",
      base: 10,
      addAbilities: [{ ability: "dex", cap: 2 }, { ability: "con" }],
      sourceType: "class",
      sourceKey: "mixta",
    };
    const r = derive(
      personaje({
        // DES 18 => +4 (topado a 2), CON 16 => +3 (sin tope).
        abilities: { str: 10, dex: 18, con: 16, int: 10, wis: 10, cha: 10 },
        acFormulas: [mixta],
      }),
    );

    expect(r.derived.ac.total).toBe(15);
    expect(r.derived.ac.steps.reduce((suma, p) => suma + p.amount, 0)).toBe(15);
  });

  it("con DOS topes distintos, cada paso de recorte dice a QUÉ característica recorta", () => {
    // El caso que faltaba, y el único donde la suma de la traza no es trivial. Hoy no es
    // alcanzable desde datos —solo la armadura topa, y solo la Destreza—, y por eso la prueba
    // existe: es la mina que el paso 2 pisaría.
    const dosTopes: AcFormula = {
      key: "dos-topes",
      labelKey: "ac.unarmoredDefense",
      base: 10,
      addAbilities: [
        { ability: "dex", cap: 2 },
        { ability: "con", cap: 1 },
      ],
      sourceType: "class",
      sourceKey: "dos-topes",
    };
    const r = derive(
      personaje({
        // DES 18 => +4 (topado a 2), CON 16 => +3 (topado a 1).
        abilities: { str: 10, dex: 18, con: 16, int: 10, wis: 10, cha: 10 },
        acFormulas: [dosTopes],
      }),
    );

    expect(r.derived.ac.total).toBe(13);
    expect(r.derived.ac.steps.reduce((suma, p) => suma + p.amount, 0)).toBe(13);

    const recortes = r.derived.ac.steps.filter((p) => p.op === "cap").map((p) => p.labelKey);
    // **Dos pasos distinguibles.** Con la clave de la fórmula sola serían idénticos, y la
    // pantalla traduciría los dos como «Tope de Destreza».
    expect(recortes).toEqual(["ac.cap.dos-topes.dex", "ac.cap.dos-topes.con"]);
  });

  it("sumar la misma característica dos veces es un error, no una CA inflada", () => {
    const repetida: AcFormula = {
      key: "repetida",
      labelKey: "ac.unarmoredDefense",
      base: 10,
      addAbilities: [{ ability: "dex" }, { ability: "dex" }],
      sourceType: "class",
      sourceKey: "repetida",
    };

    // Una traza con la Destreza repetida **cuadra**, así que ningún invariante de los que hay lo
    // cazaría: la CA saldría alta y su explicación diría que sí.
    expect(() => derive(personaje({ acFormulas: [repetida] }))).toThrow(/más de una vez/);
  });

  it("una fórmula sin características es un número pelado", () => {
    const armadura: AcFormula = {
      key: "natural",
      labelKey: "ac.natural",
      base: 17,
      sourceType: "base",
      sourceKey: "natural",
    };
    const r = derive(personaje({ acFormulas: [armadura] }));
    expect(r.derived.ac.total).toBe(17);
  });
});

// Tarea A4 (paso 2). `ctx()` construye un `ContextoDeDerivacion` de mentira: `resolverOrigen`
// no lee el catálogo de clases (eso es la tarea A10), así que la tabla de escala de estas
// pruebas es una tabla inventada a mano, igual que la clase y la armadura de arriba.
function ctx(parcial: Partial<ContextoDeDerivacion> = {}): ContextoDeDerivacion {
  return {
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    level: 1,
    escalas: new Map([
      [
        "rage-damage",
        [
          { desde: 1, valor: 2 },
          { desde: 9, valor: 3 },
          { desde: 16, valor: 4 },
        ],
      ],
    ]),
    ...parcial,
  };
}

describe("resolverOrigen: de dónde sale un número, nunca un cero en silencio", () => {
  it("fijo: devuelve el valor tal cual, con su paso entero", () => {
    const { valor, paso } = resolverOrigen({ tipo: "fijo", valor: 2 }, ctx({}));
    expect(valor).toBe(2);
    // Aserción de identidad, no `objectContaining`: si `sourceType` o `sourceKey` mintieran
    // sobre el origen (por ejemplo, "manual" en vez de "base"), esto lo cazaría.
    expect(paso).toEqual({
      op: "base",
      amount: 2,
      sourceType: "base",
      sourceKey: "fixed",
      labelKey: "fixedValue",
    });
  });

  it("fijo: un valor negativo también es un `Origen` válido", () => {
    // Cambiar el retorno de esta rama a `-origen.valor` dejaría esta prueba en rojo; sin ella,
    // `origen.schema.test.ts` (que nunca llama a `resolverOrigen`) no lo habría cazado.
    const { valor } = resolverOrigen({ tipo: "fijo", valor: -2 }, ctx({}));
    expect(valor).toBe(-2);
  });

  it("un modificador sale con su nombre en la traza, con su paso entero", () => {
    const { valor, paso } = resolverOrigen(
      { tipo: "modificador", ability: "str" },
      ctx({ abilities: { str: 16, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } }),
    );
    expect(valor).toBe(3);
    expect(paso).toEqual({
      op: "base",
      amount: 3,
      sourceType: "ability",
      sourceKey: "str",
      labelKey: "abilityMod.str",
    });
  });

  it("modificador: lanza si la puntuación no está en el contexto, en vez de devolver NaN", () => {
    // `EngineInput.abilities` obliga a las seis por el tipo, pero `ContextoDeDerivacion` lo
    // arma quien llama —un statblock incompleto, un PNJ importado a medias— y ahí el tipo ya
    // no protege nada en tiempo de ejecución. Sin la guarda, esto da `NaN`, no un throw.
    const abilities = {
      str: undefined,
      dex: 10,
      con: 10,
      int: 10,
      wis: 10,
      cha: 10,
    } as unknown as Record<AbilityKey, number>;
    expect(() =>
      resolverOrigen({ tipo: "modificador", ability: "str" }, ctx({ abilities })),
    ).toThrow();
  });

  it("la competencia sale del nivel, no de un número escrito a mano, con su paso entero", () => {
    const { valor, paso } = resolverOrigen({ tipo: "competencia" }, ctx({ level: 5 }));
    expect(valor).toBe(3);
    expect(paso).toEqual({
      op: "base",
      amount: 3,
      sourceType: "proficiency",
      sourceKey: "activity",
      labelKey: "proficiencyBonus",
    });
  });

  it("una escala lee la tabla por nivel, con su paso entero", () => {
    const { valor, paso } = resolverOrigen(
      { tipo: "escala", clave: "rage-damage" },
      ctx({ level: 9 }),
    );
    expect(valor).toBe(3);
    expect(paso).toEqual({
      op: "base",
      amount: 3,
      sourceType: "class",
      sourceKey: "rage-damage",
      labelKey: "scale.rage-damage",
    });
  });

  it("una escala en un nivel anterior lee el tramo anterior, no el más alto", () => {
    // Con la tabla de `rage-damage` (creciente y bien ordenada), el filtro por nivel ya deja un
    // solo tramo aplicable a nivel 3: esta prueba comprueba que se elige ESE tramo y no uno
    // posterior, pero no distingue por sí sola «mayor `desde`» de «mayor `valor`» — con un solo
    // candidato las dos reglas coinciden. Esa distinción la hacen las dos pruebas siguientes,
    // con una tabla que deja más de un tramo aplicable y que además no es monótona.
    const { valor } = resolverOrigen({ tipo: "escala", clave: "rage-damage" }, ctx({ level: 3 }));
    expect(valor).toBe(2);
  });

  it("una escala NO monótona: gana el tramo de mayor `desde`, no el de mayor `valor`", () => {
    // Mutación que esta prueba cazaría (verificada abajo, en el informe): cambiar
    // `actual.desde > mejor.desde` por `actual.valor > mejor.valor` da 2 en vez de 1.
    const noMonotona = new Map([
      [
        "no-monotona",
        [
          { desde: 1, valor: 2 },
          { desde: 9, valor: 1 },
        ],
      ],
    ]);
    const { valor } = resolverOrigen(
      { tipo: "escala", clave: "no-monotona" },
      ctx({ level: 9, escalas: noMonotona }),
    );
    expect(valor).toBe(1);
  });

  it("una escala con los tramos declarados al revés da el mismo resultado", () => {
    // Mismo caso que el anterior pero con el array en orden inverso: una implementación que
    // «coja el último tramo del array» en vez del de mayor `desde` daría 2 aquí (el último
    // elemento es `{ desde: 1, valor: 2 }`), y coincidiría por casualidad en la prueba de
    // arriba porque ahí el orden del array ya era el correcto.
    const invertida = new Map([
      [
        "no-monotona-invertida",
        [
          { desde: 9, valor: 1 },
          { desde: 1, valor: 2 },
        ],
      ],
    ]);
    const { valor } = resolverOrigen(
      { tipo: "escala", clave: "no-monotona-invertida" },
      ctx({ level: 9, escalas: invertida }),
    );
    expect(valor).toBe(1);
  });

  it("escala: lanza si la tabla no existe (un origen desconocido NO devuelve cero en silencio)", () => {
    // **La prueba que tiene que ponerse ROJA si se revierte a un cero en silencio.**
    expect(() =>
      resolverOrigen({ tipo: "escala", clave: "no-existe" } as Origen, ctx({})),
    ).toThrow();
  });

  it("escala: lanza si el nivel no llega al primer tramo de la tabla", () => {
    const tardia = new Map([["tardia", [{ desde: 5, valor: 1 }]]]);
    expect(() =>
      resolverOrigen({ tipo: "escala", clave: "tardia" }, ctx({ level: 1, escalas: tardia })),
    ).toThrow();
  });

  it("lanzamiento: usa el modificador de la característica de lanzamiento, con su paso entero", () => {
    const { valor, paso } = resolverOrigen(
      { tipo: "lanzamiento" },
      ctx({
        spellcastingAbility: "wis",
        abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 },
      }),
    );
    expect(valor).toBe(3);
    expect(paso).toEqual({
      op: "base",
      amount: 3,
      sourceType: "ability",
      sourceKey: "wis",
      labelKey: "abilityMod.wis",
    });
  });

  it("lanzamiento: lanza si el contexto no trae característica de lanzamiento", () => {
    // Un no-lanzador usando una actividad de conjuro es un fallo de datos, no un modificador de
    // cero: sin esta excepción, un PNJ mal etiquetado tiraría con un bono de 0 creíble.
    expect(() => resolverOrigen({ tipo: "lanzamiento" }, ctx({}))).toThrow();
  });

  it("lanzamiento: lanza si la característica de lanzamiento no tiene puntuación en el contexto", () => {
    const abilities = {
      str: 10,
      dex: 10,
      con: 10,
      int: 10,
      wis: undefined,
      cha: 10,
    } as unknown as Record<AbilityKey, number>;
    expect(() =>
      resolverOrigen({ tipo: "lanzamiento" }, ctx({ spellcastingAbility: "wis", abilities })),
    ).toThrow();
  });

  it("nivelDeEspacio: devuelve el nivel del espacio con el que se lanzó, con su paso entero", () => {
    const { valor, paso } = resolverOrigen({ tipo: "nivelDeEspacio" }, ctx({ nivelDeEspacio: 3 }));
    expect(valor).toBe(3);
    expect(paso).toEqual({
      op: "base",
      amount: 3,
      sourceType: "level",
      sourceKey: "spellSlot",
      labelKey: "spellSlotLevel",
    });
  });

  it("nivelDeEspacio: lanza si no hay ningún espacio en el contexto", () => {
    expect(() => resolverOrigen({ tipo: "nivelDeEspacio" }, ctx({}))).toThrow();
  });

  it("cdDeConjuro: devuelve la CD de conjuro ya derivada, apuntando a su propia clave", () => {
    const { valor, paso } = resolverOrigen({ tipo: "cdDeConjuro" }, ctx({ cdDeConjuro: 15 }));
    expect(valor).toBe(15);
    // `"base"`, no `"class"`: desde una actividad, `spellSaveDc` es un valor ya derivado que se
    // toma como dado. `derive()` la construye con pasos `"base"`/`"proficiency"`/`"ability"`;
    // ninguno de esos tres dice `"class"`.
    expect(paso).toEqual({
      op: "base",
      amount: 15,
      sourceType: "base",
      sourceKey: "spellSaveDc",
      labelKey: "spellSaveDc",
    });
  });

  it("cdDeConjuro: lanza si no hay ninguna CD derivada en el contexto", () => {
    expect(() => resolverOrigen({ tipo: "cdDeConjuro" }, ctx({}))).toThrow();
  });

  it("un tipo de origen que no existe en la unión también lanza, no cae en un switch en silencio", () => {
    // Distinto del caso "escala: lanza si la tabla no existe": aquí el `tipo` mismo es ajeno a
    // las siete variantes, así que golpea el `default` del switch y no una rama real. Llega así
    // cuando algo no pasó por `origenSchema.parse` — JSON crudo, un dato importado a medias.
    expect(() => resolverOrigen({ tipo: "no-existe" } as unknown as Origen, ctx({}))).toThrow();
  });
});
