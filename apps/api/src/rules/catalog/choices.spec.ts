import {
  InvalidChoiceError,
  assertNoUnknownChoices,
  validatePicks,
  type ChoiceGrant,
} from "./choices";
import { deriveCharacter } from "./index";
import { resolveBuild, type CharacterBuild } from "./resolve";

// Tarea 2A.4 — elecciones pendientes y avisos.
//
// Los cinco casos que pedía el plan (§5.4) están abajo, uno por `describe`, más los que
// aparecieron al escribirlo: la clave desconocida y la habilidad ya poseída.

const SEMIELFO_ASI: ChoiceGrant = {
  id: "half-elf-asi",
  labelKey: "race.halfElf.asi",
  kind: "abilityChoice",
  choose: 2,
  amount: 1,
  from: ["str", "dex", "con", "int", "wis", "cha"],
  excluding: ["cha"],
};

function ficha(parcial: Partial<CharacterBuild> = {}): CharacterBuild {
  return {
    abilities: { str: 10, dex: 12, con: 12, int: 13, wis: 10, cha: 15 },
    race: { source: "SRD", key: "half-elf" },
    class: { source: "SRD", key: "rogue" },
    level: 1,
    ...parcial,
  };
}

describe("validatePicks, la pieza pura", () => {
  it("elegir de menos no es un error: es una ficha a medio hacer", () => {
    expect(validatePicks(SEMIELFO_ASI, ["dex"])).toEqual({ picks: ["dex"], complete: false });
  });

  it("elegir justo las que pide está completa", () => {
    expect(validatePicks(SEMIELFO_ASI, ["dex", "int"])).toEqual({
      picks: ["dex", "int"],
      complete: true,
    });
  });

  it("no elegir nada tampoco lanza", () => {
    expect(validatePicks(SEMIELFO_ASI, undefined)).toEqual({ picks: [], complete: false });
  });

  it.each([
    [["dex", "int", "wis"], "TOO_MANY"],
    [["dex", "dex"], "DUPLICATE"],
    [["dex", "suerte"], "NOT_IN_LIST"],
    [["dex", "cha"], "EXCLUDED"],
  ])("%p se rechaza con %s", (picks, code) => {
    expect(() => validatePicks(SEMIELFO_ASI, picks as string[])).toThrow(InvalidChoiceError);
    try {
      validatePicks(SEMIELFO_ASI, picks as string[]);
    } catch (error) {
      expect((error as InvalidChoiceError).code).toBe(code);
    }
  });

  it("Carisma se rechaza por EXCLUDED y no por NOT_IN_LIST: el motivo importa", () => {
    // Está en `from` porque el mecanismo es genérico; lo prohíbe su +2 fijo. Un mensaje que
    // dijera «no está en la lista» mandaría a buscar el error donde no está.
    try {
      validatePicks(SEMIELFO_ASI, ["cha", "dex"]);
      throw new Error("debería haber lanzado");
    } catch (error) {
      expect((error as InvalidChoiceError).code).toBe("EXCLUDED");
      expect((error as InvalidChoiceError).pick).toBe("cha");
    }
  });
});

describe("semielfo sin elegir nada", () => {
  const hoja = deriveCharacter(ficha());

  it("avisa de las dos elecciones de la raza, más la de la clase", () => {
    const avisos = hoja.warnings.filter((w) => w.code === "unresolved_choice");
    expect(avisos.map((w) => w.key).sort()).toEqual([
      "half-elf-asi",
      "half-elf-skills",
      "rogue-skills",
    ]);
  });

  it("el aviso dice cuántas hacen falta y cuántas hay", () => {
    const aviso = hoja.warnings.find((w) => w.key === "half-elf-asi");
    expect(aviso?.data).toEqual({
      grantId: "half-elf-asi",
      kind: "abilityChoice",
      needed: 2,
      picked: 0,
    });
  });

  it("ninguna característica se altera salvo el +2 fijo de Carisma", () => {
    expect(hoja.derived["ability.cha"].total).toBe(17);
    expect(hoja.derived["ability.str"].total).toBe(10);
    expect(hoja.derived["ability.dex"].total).toBe(12);
    expect(hoja.derived["ability.con"].total).toBe(12);
    expect(hoja.derived["ability.int"].total).toBe(13);
    expect(hoja.derived["ability.wis"].total).toBe(10);
  });
});

describe("semielfo eligiendo mal", () => {
  it("eligiendo Carisma: rechazado por `excluding`", () => {
    expect(() => resolveBuild(ficha({ choices: { "half-elf-asi": ["cha", "dex"] } }))).toThrow(
      InvalidChoiceError,
    );
  });

  it("el pícaro eligiendo cinco habilidades cuando le tocan cuatro: rechazado", () => {
    expect(() =>
      resolveBuild(
        ficha({
          choices: {
            "rogue-skills": ["stealth", "acrobatics", "deception", "insight", "perception"],
          },
        }),
      ),
    ).toThrow(InvalidChoiceError);
  });

  it("al ESCRIBIR, una elección cuya concesión no existe es un error", () => {
    // Sin esto, una clave mal escrita haría desaparecer el bono sin explicación. Es el guardián
    // que llamará el `PATCH` de 2A.6, y por eso se prueba directamente.
    try {
      assertNoUnknownChoices({ "dwarf-hill-asi": ["con"] }, new Set(["half-elf-asi"]));
      throw new Error("debería haber lanzado");
    } catch (error) {
      expect((error as InvalidChoiceError).code).toBe("UNKNOWN_GRANT");
    }
  });

  it("al DERIVAR, en cambio, es un aviso: un dato viejo no es un dato inválido", () => {
    // Cambiado tras la revisión del 2026-09-02. Cuando las elecciones se persistan, cambiar de
    // raza o de clase deja filas huérfanas; si derivar lanzara, **el personaje se volvería
    // ilegible** por un dato caduco en vez de pintarse con un aviso al lado.
    const hoja = deriveCharacter(ficha({ choices: { "dwarf-hill-asi": ["con"] } }));
    const aviso = hoja.warnings.find((w) => w.code === "stale_choice");
    expect(aviso?.key).toBe("dwarf-hill-asi");
    // Y la hoja sale entera: Carisma sigue con su +2 fijo.
    expect(hoja.derived["ability.cha"].total).toBe(17);
  });
});

describe("semielfo eligiendo solo una de las dos", () => {
  const hoja = deriveCharacter(ficha({ choices: { "half-elf-asi": ["dex"] } }));

  it("sigue avisando, y dice que hay una de dos", () => {
    const aviso = hoja.warnings.find((w) => w.key === "half-elf-asi");
    expect(aviso?.data).toMatchObject({ needed: 2, picked: 1 });
  });

  it("y NO aplica la mitad: una ficha con pinta de terminada y números mal es peor que un aviso", () => {
    expect(hoja.derived["ability.dex"].total).toBe(12);
  });

  it("la elección incompleta sigue en la lista de pendientes", () => {
    expect(hoja.pendingChoices.map((c) => c.grantId)).toContain("half-elf-asi");
  });
});

describe("semielfo eligiendo las dos", () => {
  const hoja = deriveCharacter(ficha({ choices: { "half-elf-asi": ["dex", "int"] } }));

  it("los dos +1 se aplican", () => {
    expect(hoja.derived["ability.dex"].total).toBe(13);
    expect(hoja.derived["ability.int"].total).toBe(14);
  });

  it("ya no hay aviso ni pendiente por esa concesión", () => {
    expect(hoja.warnings.filter((w) => w.key === "half-elf-asi")).toEqual([]);
    expect(hoja.pendingChoices.map((c) => c.grantId)).not.toContain("half-elf-asi");
  });

  it("en la traza son indistinguibles de un bono fijo: mismo `op` y mismo `sourceType`", () => {
    const elegido = hoja.derived["ability.dex"].steps.find((s) => s.op === "add");
    const fijo = hoja.derived["ability.cha"].steps.find((s) => s.op === "add");
    expect(elegido).toMatchObject({ op: "add", sourceType: "race", sourceKey: "half-elf" });
    expect(fijo).toMatchObject({ op: "add", sourceType: "race", sourceKey: "half-elf" });
    expect(elegido?.labelKey).toBe("race.halfElf.asi");
  });

  it("las otras características siguen intactas", () => {
    expect(hoja.derived["ability.str"].total).toBe(10);
    expect(hoja.derived["ability.wis"].total).toBe(10);
    expect(hoja.derived["ability.con"].total).toBe(12);
  });
});

describe("las habilidades elegidas llegan al cálculo", () => {
  const hoja = deriveCharacter(
    ficha({
      choices: {
        "rogue-skills": ["stealth", "acrobatics", "deception", "insight"],
        "half-elf-skills": ["perception", "investigation"],
        // Constitución e Inteligencia a propósito: no tocan la Destreza, y así el +3 de Sigilo
        // de abajo sigue midiendo la competencia y no un cambio de característica.
        "half-elf-asi": ["con", "int"],
      },
    }),
  );

  it("Sigilo pasa de +1 a +3: Destreza 12 más competencia", () => {
    expect(hoja.derived["skill.stealth"].total).toBe(3);
  });

  it("una habilidad no elegida no gana nada", () => {
    expect(hoja.derived["skill.athletics"].total).toBe(0);
  });

  it("con las tres elecciones resueltas no queda ningún pendiente", () => {
    expect(hoja.pendingChoices).toEqual([]);
    expect(hoja.warnings.filter((w) => w.code === "unresolved_choice")).toEqual([]);
  });
});

describe("elegir una habilidad que ya se tiene por otra vía", () => {
  // El elfo ya da Percepción. Si el jugador la elige otra vez con su clase, no gana nada — y
  // eso es exactamente lo que la hoja tiene que poder decirle. Guerrero porque su lista sí la
  // ofrece; con un mago sería un `NOT_IN_LIST` y se estaría probando otra cosa.
  const hoja = deriveCharacter({
    abilities: { str: 8, dex: 14, con: 14, int: 15, wis: 12, cha: 10 },
    race: { source: "SRD", key: "elf" },
    subrace: { source: "SRD", key: "elf-high" },
    class: { source: "SRD", key: "fighter" },
    level: 1,
    choices: { "fighter-skills": ["perception", "athletics"] },
  });

  it("no es un error: es un aviso que dice que esa elección no da nada", () => {
    const aviso = hoja.warnings.find((w) => w.code === "duplicate_skill_choice");
    expect(aviso?.data).toMatchObject({ skill: "perception", alreadyAt: "proficient" });
  });

  it("y la competencia no se duplica", () => {
    // +2 de competencia y +1 de Sabiduría 12, una sola vez.
    expect(hoja.derived["skill.perception"].total).toBe(3);
  });
});
