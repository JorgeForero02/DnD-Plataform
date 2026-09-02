import { SRD_ARMOR } from "./armor";
import { SRD_CLASSES } from "./classes";
import { SRD_RACES } from "./races";
import type { AbilityGrant, Grant, SrdClass } from "./types";

// Tarea 2A.3, **añadido tras la revisión del 2026-09-02**.
//
// Esto existe porque los invariantes de `catalog.spec.ts` no bastaban, y la revisión lo
// demostró de la única forma que vale: mutando los datos. Cambió las salvaciones del clérigo de
// Sabiduría/Carisma a Inteligencia/Carisma, las mejoras del guerrero a las estándar, y la CA
// base de la media placa de 15 a 11 — y **las 210 pruebas siguieron verdes**.
//
// La razón es que los invariantes comprueban la **forma** («dos salvaciones, distintas y
// válidas») y no el **valor** («las del clérigo son Sabiduría y Carisma»). La forma caza el
// error de copiar y pegar; el valor caza el dígito mal transcrito, que es el otro error de una
// transcripción y el que ningún invariante puede ver.
//
// Así que aquí va la tabla, entera y a mano, en el orden del SRD. Es aburrida a propósito: se
// escribe una vez con el SRD delante y a partir de ahí **cualquier cifra que cambie sin querer
// pone una prueba en rojo**. La cuenta la lleva `toEqual` y no una aserción por campo, para que
// un campo nuevo sin comprobar también salte.
//
// **Lo que esta tabla NO fija, dicho a las claras:** el nombre y el nivel de cada una de las
// ~203 aptitudes de clase y subclase. Fijarlas aquí sería transcribir los mismos datos **dos
// veces**, y dos copias del mismo dato derivan — que es el argumento con el que las mejoras de
// característica viven solo en `asiLevels` y no también en `features`. La consecuencia se acepta
// y está declarada como deuda **S10** en `docs/06-pendientes.md`: mover una aptitud de nivel no
// pone nada en rojo. Lo que sí protege el diff es que se entregó legible para revisarlo con el
// SRD delante, y así se revisó.

type FilaClase = {
  hitDie: number;
  saves: string[];
  asi: number[];
  skills: number;
  spell: string | undefined;
  spellFrom: number | undefined;
  subclase: string;
  subclaseNivel: number;
};

const CLASES: Record<string, FilaClase> = {
  barbarian: {
    hitDie: 12,
    saves: ["str", "con"],
    asi: [4, 8, 12, 16, 19],
    skills: 2,
    spell: undefined,
    spellFrom: undefined,
    subclase: "berserker",
    subclaseNivel: 3,
  },
  bard: {
    hitDie: 8,
    saves: ["dex", "cha"],
    asi: [4, 8, 12, 16, 19],
    skills: 3,
    spell: "cha",
    spellFrom: undefined,
    subclase: "lore",
    subclaseNivel: 3,
  },
  cleric: {
    hitDie: 8,
    saves: ["wis", "cha"],
    asi: [4, 8, 12, 16, 19],
    skills: 2,
    spell: "wis",
    spellFrom: undefined,
    subclase: "life-domain",
    subclaseNivel: 1,
  },
  druid: {
    hitDie: 8,
    saves: ["int", "wis"],
    asi: [4, 8, 12, 16, 19],
    skills: 2,
    spell: "wis",
    spellFrom: undefined,
    subclase: "circle-of-the-land",
    subclaseNivel: 2,
  },
  fighter: {
    hitDie: 10,
    // La única clase con siete mejoras de característica.
    asi: [4, 6, 8, 12, 14, 16, 19],
    saves: ["str", "con"],
    skills: 2,
    spell: undefined,
    spellFrom: undefined,
    subclase: "champion",
    subclaseNivel: 3,
  },
  monk: {
    hitDie: 8,
    saves: ["str", "dex"],
    asi: [4, 8, 12, 16, 19],
    skills: 2,
    spell: undefined,
    spellFrom: undefined,
    subclase: "open-hand",
    subclaseNivel: 3,
  },
  paladin: {
    hitDie: 10,
    saves: ["wis", "cha"],
    asi: [4, 8, 12, 16, 19],
    skills: 2,
    spell: "cha",
    // Lanza desde el 2, no desde el 1.
    spellFrom: 2,
    subclase: "oath-of-devotion",
    subclaseNivel: 3,
  },
  ranger: {
    hitDie: 10,
    saves: ["str", "dex"],
    asi: [4, 8, 12, 16, 19],
    skills: 3,
    spell: "wis",
    spellFrom: 2,
    subclase: "hunter",
    subclaseNivel: 3,
  },
  rogue: {
    hitDie: 8,
    saves: ["dex", "int"],
    // El pícaro tiene una extra al 10.
    asi: [4, 8, 10, 12, 16, 19],
    skills: 4,
    spell: undefined,
    spellFrom: undefined,
    subclase: "thief",
    subclaseNivel: 3,
  },
  sorcerer: {
    hitDie: 6,
    saves: ["con", "cha"],
    asi: [4, 8, 12, 16, 19],
    skills: 2,
    spell: "cha",
    spellFrom: undefined,
    subclase: "draconic-bloodline",
    subclaseNivel: 1,
  },
  warlock: {
    hitDie: 8,
    saves: ["wis", "cha"],
    asi: [4, 8, 12, 16, 19],
    skills: 2,
    spell: "cha",
    spellFrom: undefined,
    subclase: "the-fiend",
    subclaseNivel: 1,
  },
  wizard: {
    hitDie: 6,
    saves: ["int", "wis"],
    asi: [4, 8, 12, 16, 19],
    skills: 2,
    spell: "int",
    spellFrom: undefined,
    subclase: "evocation",
    subclaseNivel: 2,
  },
};

function fila(clase: SrdClass): FilaClase {
  return {
    hitDie: clase.hitDie,
    saves: clase.saveProficiencies,
    asi: clase.asiLevels,
    skills: clase.skillChoice.choose,
    spell: clase.spellcastingAbility,
    spellFrom: clase.spellcastingFromLevel,
    subclase: clase.subclasses[0].key,
    subclaseNivel: clase.subclasses[0].chosenAtLevel,
  };
}

describe("la tabla de clases del SRD 5.1, cifra a cifra", () => {
  it("están las doce y ninguna más", () => {
    expect(SRD_CLASSES.map((c) => c.key).sort()).toEqual(Object.keys(CLASES).sort());
  });

  it.each(Object.keys(CLASES))("%s coincide con el SRD en todas sus cifras", (clave) => {
    const clase = SRD_CLASSES.find((c) => c.key === clave)!;
    expect(fila(clase)).toEqual(CLASES[clave]);
  });
});

// --- Armaduras: CA base, tope de Destreza, Fuerza mínima y desventaja en Sigilo ---

const ARMADURAS: Record<string, [number, number | undefined, number, boolean]> = {
  padded: [11, undefined, 0, true],
  leather: [11, undefined, 0, false],
  "studded-leather": [12, undefined, 0, false],
  hide: [12, 2, 0, false],
  "chain-shirt": [13, 2, 0, false],
  "scale-mail": [14, 2, 0, true],
  breastplate: [14, 2, 0, false],
  "half-plate": [15, 2, 0, true],
  "ring-mail": [14, 0, 0, true],
  "chain-mail": [16, 0, 13, true],
  splint: [17, 0, 15, true],
  plate: [18, 0, 15, true],
  shield: [2, undefined, 0, false],
};

describe("la tabla de armaduras del SRD 5.1, cifra a cifra", () => {
  it("están las doce armaduras y el escudo, y ninguna más", () => {
    expect(SRD_ARMOR.map((a) => a.key).sort()).toEqual(Object.keys(ARMADURAS).sort());
    expect(SRD_ARMOR.filter((a) => a.category !== "SHIELD")).toHaveLength(12);
  });

  it.each(Object.keys(ARMADURAS))("%s coincide con el SRD", (clave) => {
    const armor = SRD_ARMOR.find((a) => a.key === clave)!;
    expect([
      armor.baseAc,
      armor.dexCap,
      armor.strengthRequirement,
      armor.stealthDisadvantage,
    ]).toEqual(ARMADURAS[clave]);
  });
});

// --- Razas: los bonificadores, la velocidad, el tamaño y la visión en la oscuridad ---

const RAZAS: Record<
  string,
  { bonos: Record<string, number>; velocidad: number; tamano: string; oscuridad: number }
> = {
  dwarf: { bonos: { con: 2 }, velocidad: 25, tamano: "MEDIUM", oscuridad: 60 },
  elf: { bonos: { dex: 2 }, velocidad: 30, tamano: "MEDIUM", oscuridad: 60 },
  halfling: { bonos: { dex: 2 }, velocidad: 25, tamano: "SMALL", oscuridad: 0 },
  human: {
    bonos: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    velocidad: 30,
    tamano: "MEDIUM",
    oscuridad: 0,
  },
  dragonborn: { bonos: { str: 2, cha: 1 }, velocidad: 30, tamano: "MEDIUM", oscuridad: 0 },
  gnome: { bonos: { int: 2 }, velocidad: 25, tamano: "SMALL", oscuridad: 60 },
  "half-elf": { bonos: { cha: 2 }, velocidad: 30, tamano: "MEDIUM", oscuridad: 60 },
  "half-orc": { bonos: { str: 2, con: 1 }, velocidad: 30, tamano: "MEDIUM", oscuridad: 60 },
  tiefling: { bonos: { int: 1, cha: 2 }, velocidad: 30, tamano: "MEDIUM", oscuridad: 60 },
};

/** Solo los **fijos**: el «+1 a dos a tu elección» del semielfo no es un bono de tabla. */
function bonosFijos(grants: Grant[]): Record<string, number> {
  return Object.fromEntries(
    grants.filter((g): g is AbilityGrant => g.kind === "ability").map((g) => [g.ability, g.amount]),
  );
}

function velocidadDe(grants: Grant[]): number {
  const andar = grants.find((g) => g.kind === "speed" && g.movement === "walk");
  return andar && andar.kind === "speed" ? andar.feet : 0;
}

describe("la tabla de razas del SRD 5.1, cifra a cifra", () => {
  it("están las nueve y ninguna más", () => {
    expect(SRD_RACES.map((r) => r.key).sort()).toEqual(Object.keys(RAZAS).sort());
  });

  it.each(Object.keys(RAZAS))("%s coincide con el SRD", (clave) => {
    const raza = SRD_RACES.find((r) => r.key === clave)!;
    expect({
      bonos: bonosFijos(raza.grants),
      velocidad: velocidadDe(raza.grants),
      tamano: raza.size,
      oscuridad: raza.darkvisionFeet,
    }).toEqual(RAZAS[clave]);
  });
});

// --- Subrazas: las cuatro del SRD, con su bono ---

const SUBRAZAS: Record<string, { padre: string; bonos: Record<string, number> }> = {
  "dwarf-hill": { padre: "dwarf", bonos: { wis: 1 } },
  "elf-high": { padre: "elf", bonos: { int: 1 } },
  "halfling-lightfoot": { padre: "halfling", bonos: { cha: 1 } },
  "gnome-rock": { padre: "gnome", bonos: { con: 1 } },
};

describe("las cuatro subrazas del SRD 5.1", () => {
  it("son exactamente esas cuatro: el SRD no trae más y no se inventan", () => {
    const todas = SRD_RACES.flatMap((r) => r.subraces.map((s) => s.key));
    expect(todas.sort()).toEqual(Object.keys(SUBRAZAS).sort());
  });

  it.each(Object.keys(SUBRAZAS))("%s cuelga de su raza y da su bono", (clave) => {
    const padre = SRD_RACES.find((r) => r.subraces.some((s) => s.key === clave))!;
    const subraza = padre.subraces.find((s) => s.key === clave)!;
    expect(padre.key).toBe(SUBRAZAS[clave].padre);
    expect(bonosFijos(subraza.grants)).toEqual(SUBRAZAS[clave].bonos);
  });

  it("solo el enano de las colinas da PG por nivel, y da exactamente uno", () => {
    const porNivel = SRD_RACES.flatMap((r) =>
      r.subraces.flatMap((s) =>
        s.grants.filter((g) => g.kind === "hpPerLevel").map((g) => [s.key, g]),
      ),
    );
    expect(porNivel).toHaveLength(1);
    const [clave, grant] = porNivel[0] as [string, Grant];
    expect(clave).toBe("dwarf-hill");
    expect(grant.kind === "hpPerLevel" ? grant.amount : 0).toBe(1);
  });
});
