import { SRD_CLASSES } from "./classes";
import { deriveCharacter } from "./index";
import { InvalidEquipmentError, resolveBuild, type CharacterBuild } from "./resolve";

// Añadido el 2026-09-02 tras la revisión de 2A.3 y 2A.4.
//
// Cada `describe` de aquí abajo corresponde a un hallazgo de la revisión, y existe para que
// **la corrección no se pueda deshacer sin que algo se ponga rojo**. Un arreglo sin prueba es
// una promesa, y la promesa se rompe sola dentro de tres meses.

function ficha(parcial: Partial<CharacterBuild> = {}): CharacterBuild {
  return {
    abilities: { str: 10, dex: 12, con: 12, int: 13, wis: 10, cha: 15 },
    race: { source: "SRD", key: "human" },
    class: { source: "SRD", key: "fighter" },
    level: 1,
    ...parcial,
  };
}

describe("la entrada se valida antes de calcular nada", () => {
  // El hallazgo: `CharacterBuild` era una interfaz de TypeScript sin esquema, así que una
  // `abilities` incompleta daba `undefined` y el `NaN` se propagaba a **todos** los derivados
  // —modificadores, PG máximos, CA— sin que nadie lo parase, porque nadie validaba a la salida.

  it("una característica que falta es un error, no un NaN silencioso en toda la hoja", () => {
    const rota = { ...ficha(), abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10 } };
    expect(() => resolveBuild(rota as unknown as CharacterBuild)).toThrow();
  });

  it("una característica que no es un entero se rechaza", () => {
    expect(() => resolveBuild(ficha({ abilities: { ...ficha().abilities, str: 12.5 } }))).toThrow();
  });

  it.each([0, -3, 21, 100])("el nivel %i se rechaza: la tabla del SRD llega a 20", (level) => {
    // Sin esto, el nivel 21 daba bonificador de competencia +7 —fuera de la tabla— y el nivel 0
    // daba PG máximos negativos, porque el suelo del motor es `level` y no 1.
    expect(() => resolveBuild(ficha({ level }))).toThrow();
  });

  it("los niveles 1 y 20 sí valen, que son los extremos legítimos", () => {
    expect(() => resolveBuild(ficha({ level: 1 }))).not.toThrow();
    expect(() => resolveBuild(ficha({ level: 20 }))).not.toThrow();
  });
});

describe("equipo imposible", () => {
  // El hallazgo: dos escudos sumaban **+4**, y dos armaduras de cuerpo dejaban la descartada
  // como un aviso que en pantalla parece una sugerencia («con cuero tendrías 13»).

  it("dos armaduras de cuerpo a la vez se rechazan", () => {
    expect(() =>
      resolveBuild(
        ficha({
          armor: [
            { source: "SRD", key: "chain-mail" },
            { source: "SRD", key: "leather" },
          ],
        }),
      ),
    ).toThrow(InvalidEquipmentError);
  });

  it("dos escudos a la vez se rechazan: si no, sumaban +4", () => {
    expect(() =>
      resolveBuild(
        ficha({
          armor: [
            { source: "SRD", key: "shield" },
            { source: "SRD", key: "shield" },
          ],
        }),
      ),
    ).toThrow(InvalidEquipmentError);
  });

  it("una armadura y un escudo, que es lo normal, sigue valiendo", () => {
    const hoja = deriveCharacter(
      ficha({
        abilities: { str: 15, dex: 14, con: 13, int: 10, wis: 12, cha: 8 },
        armor: [
          { source: "SRD", key: "chain-mail" },
          { source: "SRD", key: "shield" },
        ],
      }),
    );
    // Humano: +1 a todo, así que Destreza 15 → mod +2, capado a 0 por la cota de malla.
    expect(hoja.derived.ac.total).toBe(18);
  });
});

describe("paladín y explorador no lanzan conjuros hasta el nivel 2", () => {
  // El hallazgo: `spellcastingAbility` se pasaba al motor sin mirar el nivel, y el propio
  // `classes.ts` llevaba un comentario que decía la regla correcta y que el código no aplicaba.

  it.each(["paladin", "ranger"])("%s de nivel 1 no tiene CD de conjuro", (clave) => {
    const hoja = deriveCharacter(ficha({ class: { source: "SRD", key: clave }, level: 1 }));
    expect(hoja.derived.spellSaveDc).toBeUndefined();
    expect(hoja.derived["attack.spell"]).toBeUndefined();
  });

  it.each(["paladin", "ranger"])("%s de nivel 2 sí la tiene", (clave) => {
    const hoja = deriveCharacter(ficha({ class: { source: "SRD", key: clave }, level: 2 }));
    expect(hoja.derived.spellSaveDc).toBeDefined();
  });

  it("un mago de nivel 1 sí lanza, que es la diferencia", () => {
    const hoja = deriveCharacter(ficha({ class: { source: "SRD", key: "wizard" }, level: 1 }));
    expect(hoja.derived.spellSaveDc).toBeDefined();
  });
});

describe("las aptitudes de clase llegan a la hoja", () => {
  // El hallazgo: `features` solo traía rasgos de raza, y la ficha S2 de 06 afirmaba que la hoja
  // ya podía decir «al nivel 5 ganas Ataque adicional». Era falso.

  it("un guerrero de nivel 5 tiene su Ataque adicional en la lista", () => {
    const hoja = deriveCharacter(ficha({ level: 5 }));
    expect(hoja.features.map((f) => f.name)).toContain("Ataque adicional");
  });

  it("y uno de nivel 4 todavía no", () => {
    const hoja = deriveCharacter(ficha({ level: 4 }));
    expect(hoja.features.map((f) => f.name)).not.toContain("Ataque adicional");
  });

  it("las de subclase entran también, y no antes de su nivel — habiéndola elegido (encargo A8)", () => {
    // Desde el encargo A8 (2026-09-07) un rasgo de subclase solo entra si la ficha eligió esa
    // subclase: sin `subclass`, esto ya no aparecería ni al nivel 3. La subclase del guerrero es
    // "campeón" (`champion`), y "Crítico mejorado" es uno de sus rasgos.
    const subclass = { source: "SRD" as const, key: "champion" };
    const nivel3 = deriveCharacter(ficha({ level: 3, subclass }));
    const nivel2 = deriveCharacter(ficha({ level: 2, subclass }));
    expect(nivel3.features.map((f) => f.name)).toContain("Crítico mejorado");
    expect(nivel2.features.map((f) => f.name)).not.toContain("Crítico mejorado");
  });

  it("los rasgos raciales siguen ahí, junto a los de clase", () => {
    const hoja = deriveCharacter(ficha({ race: { source: "SRD", key: "dwarf" }, level: 1 }));
    expect(hoja.features.map((f) => f.name)).toContain("Resistencia enana");
    expect(hoja.features.map((f) => f.name)).toContain("Tomar aliento");
  });
});

describe("la hoja no filtra hacia el catálogo compartido", () => {
  it("ordenar la lista de una elección pendiente no toca el catálogo del proceso", () => {
    // El hallazgo: `pendingChoices.from` exponía **por referencia** el mismo array que vive en
    // `SRD_CLASSES`, así que un consumidor que lo ordenara corrompía el catálogo de todo el
    // proceso — un fallo que aparecería en otra petición, no en la suya.
    const antes = [...SRD_CLASSES.find((c) => c.key === "fighter")!.skillChoice.from];
    const resuelto = resolveBuild(ficha());
    const pendiente = resuelto.pendingChoices.find((c) => c.grantId === "fighter-skills")!;
    pendiente.from.sort();
    pendiente.from.push("inventada");
    expect(SRD_CLASSES.find((c) => c.key === "fighter")!.skillChoice.from).toEqual(antes);
  });
});

describe("una competencia fija repetida tampoco se calla", () => {
  it("el elfo da Percepción, y el guerrero que la elige recibe su aviso", () => {
    const hoja = deriveCharacter(
      ficha({
        race: { source: "SRD", key: "elf" },
        choices: { "fighter-skills": ["perception", "athletics"] },
      }),
    );
    expect(hoja.warnings.find((w) => w.code === "duplicate_skill_choice")?.data).toMatchObject({
      skill: "perception",
    });
  });
});

describe("build.items — carril A2: el equipo equipado entra por la misma puerta", () => {
  it("un objeto que suma velocidad sube `speeds.walk` Y el derivado con su traza", () => {
    const hoja = deriveCharacter(
      ficha({
        items: [
          {
            ref: "boots-of-striding",
            source: "SRD",
            name: "Botas de zancada",
            kind: "GEAR",
            weightOz: 16,
            effects: [{ kind: "speed", movement: "walk", amount: 10 }],
            requiresAttunement: false,
            attuned: false,
          },
        ],
      }),
    );
    // Humano: 30 pies base. `ResolvedBuild.speeds` conserva su forma de siempre (números
    // planos), pero el número ya sale del equipo, no solo de la raza.
    expect(hoja.speeds.walk).toBe(40);
    expect(hoja.derived["speed.walk"].total).toBe(40);
    expect(hoja.derived["speed.walk"].steps.some((p) => p.sourceKey === "boots-of-striding")).toBe(
      true,
    );
  });

  it("dos escudos en `build.items` también son equipo imposible", () => {
    const escudo = {
      ref: "shield",
      source: "SRD" as const,
      name: "Escudo",
      kind: "SHIELD" as const,
      weightOz: 0,
      effects: [],
      requiresAttunement: false,
      attuned: false,
      armor: {
        category: "SHIELD" as const,
        baseAc: 2,
        strengthRequirement: 0,
        stealthDisadvantage: false,
      },
    };
    expect(() => resolveBuild(ficha({ items: [escudo, { ...escudo, ref: "shield-2" }] }))).toThrow(
      InvalidEquipmentError,
    );
  });

  it("la competencia de un objeto compite con la de la clase: gana la mejor", () => {
    // El guerrero elige Atletismo competente; unas botas dan Atletismo con pericia. Gana la
    // pericia, y no se duplica en la lista.
    const hoja = deriveCharacter(
      ficha({
        choices: { "fighter-skills": ["athletics", "perception"] },
        items: [
          {
            ref: "boots-of-athletics",
            source: "SRD",
            name: "Botas de atletismo",
            kind: "GEAR",
            weightOz: 16,
            effects: [{ kind: "skillProficiency", skill: "athletics", level: "expertise" }],
            requiresAttunement: false,
            attuned: false,
          },
        ],
      }),
    );
    expect(hoja.derived["skill.athletics"].steps.filter((p) => p.op === "add")).toHaveLength(2);
  });
});

describe("deriveCharacter devuelve todo lo que las pantallas de 2A necesitan", () => {
  it("rasgos, velocidades y las claves de raza y clase, no solo los números", () => {
    // El hallazgo: la «puerta de entrada» tiraba esto, así que 2A.10 y 2A.12 habrían tenido que
    // llamar a `resolveBuild` aparte y derivar dos veces.
    const hoja = deriveCharacter(
      ficha({
        race: { source: "SRD", key: "dwarf" },
        subrace: { source: "SRD", key: "dwarf-hill" },
      }),
    );
    expect(hoja.raceKey).toBe("dwarf");
    expect(hoja.subraceKey).toBe("dwarf-hill");
    expect(hoja.classKey).toBe("fighter");
    expect(hoja.speeds.walk).toBe(25);
    expect(hoja.features.length).toBeGreaterThan(0);
  });
});

describe("lo que encontró la auditoría de mecánica de 2B", () => {
  const enanoClerigo = {
    abilities: { str: 14, dex: 10, con: 14, int: 10, wis: 16, cha: 10 },
    race: { source: "SRD" as const, key: "dwarf" },
    subrace: { source: "SRD" as const, key: "dwarf-hill" },
    class: { source: "SRD" as const, key: "cleric" },
    level: 1,
    choices: { "cleric-skills": ["insight", "religion"] },
  };

  it("el enano trae sus cuatro armas: el clérigo enano SÍ es competente con el hacha de batalla", () => {
    const resuelto = resolveBuild(enanoClerigo);

    // «Entrenamiento de combate enano» era un rasgo de texto, así que la hoja del clérigo enano
    // decía «Sin competencia» en rojo sobre su propia hacha y le quitaba su bonificador.
    expect(resuelto.weaponProficiencies).toEqual(
      expect.arrayContaining(["battleaxe", "handaxe", "light-hammer", "warhammer"]),
    );
    // Y las de la clase siguen ahí.
    expect(resuelto.weaponProficiencies).toContain("simple");
  });

  it("la velocidad del enano NO baja por una armadura que le pide más Fuerza de la que tiene", () => {
    const conBandas = {
      ...enanoClerigo,
      items: [
        {
          ref: "SRD:splint",
          source: "SRD" as const,
          name: "Armadura de bandas",
          kind: "ARMOR" as const,
          weightOz: 1_000,
          effects: [],
          requiresAttunement: false,
          attuned: false,
          armor: {
            category: "HEAVY" as const,
            baseAc: 17,
            dexCap: 0,
            strengthRequirement: 15,
            stealthDisadvantage: true,
          },
        },
      ],
    };
    const resuelto = resolveBuild(conBandas);

    // SRD 5.1, enano: «Tu velocidad no se reduce por llevar armadura pesada». Con Fuerza 14 no
    // llega al requisito de 15, así que el aviso sale — pero los diez pies no se pierden.
    expect(resuelto.speeds.walk).toBe(25);
    expect(resuelto.warnings.some((a) => a.code === "armor_strength_requirement_unmet")).toBe(true);
  });

  it("pero a un humano sí le baja: la exención es del enano, no de la armadura", () => {
    const humano = {
      ...enanoClerigo,
      race: { source: "SRD" as const, key: "human" },
      subrace: undefined,
      items: [
        {
          ref: "SRD:splint",
          source: "SRD" as const,
          name: "Armadura de bandas",
          kind: "ARMOR" as const,
          weightOz: 1_000,
          effects: [],
          requiresAttunement: false,
          attuned: false,
          armor: {
            category: "HEAVY" as const,
            baseAc: 17,
            dexCap: 0,
            strengthRequirement: 15,
            stealthDisadvantage: true,
          },
        },
      ],
    };
    const resuelto = resolveBuild(humano);
    expect(resuelto.speeds.walk).toBe(20);
  });
});
