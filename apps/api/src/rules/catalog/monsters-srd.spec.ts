import {
  bonoDeCompetenciaPorVd,
  dadoDeGolpeDe,
  DADO_DE_GOLPE_POR_TAMANO,
  expresionDePgDe,
  pgMediosDe,
  SKILLS,
  statblockSchema,
  vdLegible,
  type AbilityKey,
  type SkillKey,
} from "@dnd/shared";
import { SRD_STATBLOCKS, SRD_STATBLOCK_POR_REF } from "./monsters-srd";

/**
 * Los PG que el SRD imprime para cada uno de los quince, **copiados del libro** y no calculados
 * aquí. Son el otro lado de la invariante: si `pgMediosDe` cambiara, esta tabla no cambia con
 * ella y la prueba se pone roja. Escribir `expect(pgMediosDe(x)).toBe(pgMediosDe(x))` habría
 * sido no probar nada.
 */
const PG_DEL_LIBRO: Record<string, number> = {
  "SRD:commoner": 4,
  "SRD:bandit": 11,
  "SRD:guard": 11,
  "SRD:goblin": 7,
  "SRD:skeleton": 13,
  "SRD:wolf": 11,
  "SRD:zombie": 22,
  "SRD:orc": 15,
  "SRD:dire-wolf": 37,
  "SRD:ogre": 59,
  "SRD:bandit-captain": 65,
  "SRD:owlbear": 59,
  "SRD:wight": 45,
  "SRD:troll": 84,
  "SRD:hill-giant": 105,
};

function modificador(valor: number): number {
  return Math.floor((valor - 10) / 2);
}

describe("catálogo de statblocks del SRD 5.1", () => {
  it("trae la tanda declarada entera, y ni uno más", () => {
    expect(SRD_STATBLOCKS).toHaveLength(15);
    expect(new Set(SRD_STATBLOCKS.map((s) => s.ref)).size).toBe(15);
    expect(Object.keys(PG_DEL_LIBRO).sort()).toEqual(SRD_STATBLOCKS.map((s) => s.ref).sort());
  });

  it("cada statblock valida contra el esquema compartido", () => {
    for (const s of SRD_STATBLOCKS) {
      const r = statblockSchema.safeParse(s);
      expect(r.success ? null : `${s.name}: ${r.error.message}`).toBeNull();
    }
  });

  it("el índice por ref encuentra a todos", () => {
    for (const s of SRD_STATBLOCKS) {
      expect(SRD_STATBLOCK_POR_REF.get(s.ref)).toBe(s);
    }
    expect(SRD_STATBLOCK_POR_REF.get("SRD:no-existe")).toBeUndefined();
  });

  // --- Invariante 1: los PG dichos son la media de los dados más la Constitución por dado ---

  it.each(Object.entries(PG_DEL_LIBRO))(
    "los PG derivados de %s son los %d que imprime el libro",
    (ref, pgDelLibro) => {
      const s = SRD_STATBLOCK_POR_REF.get(ref);
      expect(s).toBeDefined();
      expect(pgMediosDe(s!)).toBe(pgDelLibro);
    },
  );

  it("la expresión de PG lleva la Constitución sumada por cada dado, no una sola vez", () => {
    // Ogro: 7 dados, CON 16 (+3) → 7d10+21, que es exactamente lo que dice el SRD.
    const ogro = SRD_STATBLOCK_POR_REF.get("SRD:ogre")!;
    expect(expresionDePgDe(ogro)).toBe("7d10+21");
    // Goblin: CON 10, modificador 0 → sin cola, no «2d6+0».
    expect(expresionDePgDe(SRD_STATBLOCK_POR_REF.get("SRD:goblin")!)).toBe("2d6");
    // Capitán bandido: 10 dados, CON 14 (+2) → 10d8+20.
    expect(expresionDePgDe(SRD_STATBLOCK_POR_REF.get("SRD:bandit-captain")!)).toBe("10d8+20");
  });

  // --- Invariante 2: el dado de golpe sale del tamaño de la criatura ---

  it("el dado de golpe es el del tamaño, en los quince", () => {
    for (const s of SRD_STATBLOCKS) {
      expect(s.hitDieSizeOverride).toBeUndefined();
      expect(dadoDeGolpeDe(s)).toBe(DADO_DE_GOLPE_POR_TAMANO[s.size]);
    }
    // Y los tamaños que la tanda cubre de verdad, con su dado, dichos a mano.
    expect(dadoDeGolpeDe(SRD_STATBLOCK_POR_REF.get("SRD:goblin")!)).toBe(6); // pequeño
    expect(dadoDeGolpeDe(SRD_STATBLOCK_POR_REF.get("SRD:orc")!)).toBe(8); // mediano
    expect(dadoDeGolpeDe(SRD_STATBLOCK_POR_REF.get("SRD:troll")!)).toBe(10); // grande
    expect(dadoDeGolpeDe(SRD_STATBLOCK_POR_REF.get("SRD:hill-giant")!)).toBe(12); // enorme
  });

  it("una anulación explícita gana al tamaño, que para eso está", () => {
    const goblin = SRD_STATBLOCK_POR_REF.get("SRD:goblin")!;
    expect(dadoDeGolpeDe({ ...goblin, hitDieSizeOverride: 12 })).toBe(12);
  });

  // --- Invariante 3: la competencia sale del VD, y las habilidades descomponen ---

  it("el bonificador de competencia sale del valor de desafío", () => {
    // La tabla del SRD, en sus bordes: la banda cambia en 5, en 9 y en 13.
    expect(bonoDeCompetenciaPorVd(0)).toBe(2);
    expect(bonoDeCompetenciaPorVd(0.125)).toBe(2);
    expect(bonoDeCompetenciaPorVd(0.25)).toBe(2);
    expect(bonoDeCompetenciaPorVd(0.5)).toBe(2);
    expect(bonoDeCompetenciaPorVd(1)).toBe(2);
    expect(bonoDeCompetenciaPorVd(4)).toBe(2);
    expect(bonoDeCompetenciaPorVd(5)).toBe(3);
    expect(bonoDeCompetenciaPorVd(8)).toBe(3);
    expect(bonoDeCompetenciaPorVd(9)).toBe(4);
    expect(bonoDeCompetenciaPorVd(12)).toBe(4);
    expect(bonoDeCompetenciaPorVd(13)).toBe(5);
    expect(bonoDeCompetenciaPorVd(17)).toBe(6);
    expect(bonoDeCompetenciaPorVd(21)).toBe(7);
    expect(bonoDeCompetenciaPorVd(25)).toBe(8);
    // **+9, la trampa que el contraste de reglas del 2026-09-02 dejó anotada**: la tabla de los
    // monstruos sigue subiendo donde la de un personaje se para. Un personaje de nivel 20 tiene
    // +6 y no puede pasar de ahí; un monstruo de VD 29 tiene +9. Reutilizar `proficiencyBonus`
    // del nivel habría dado +9 solo para un «nivel» 33, que no existe.
    expect(bonoDeCompetenciaPorVd(29)).toBe(9);
    expect(bonoDeCompetenciaPorVd(30)).toBe(9);
  });

  /**
   * Los bonos de habilidad que el SRD imprime, copiados del libro. Que el motor sepa
   * reconstruirlos a partir de «competente» o «pericia» es lo que permite que la traza los
   * explique en vez de enseñar un número sin origen.
   */
  const HABILIDADES_DEL_LIBRO: [string, SkillKey, number][] = [
    ["SRD:goblin", "stealth", 6], // pericia: DES +2 y el doble de competencia
    ["SRD:wight", "perception", 3],
    ["SRD:wight", "stealth", 4],
    ["SRD:dire-wolf", "perception", 3],
    ["SRD:dire-wolf", "stealth", 4],
    ["SRD:orc", "intimidation", 2],
    ["SRD:owlbear", "perception", 3],
    ["SRD:troll", "perception", 2],
    ["SRD:hill-giant", "perception", 2],
    ["SRD:guard", "perception", 2],
    ["SRD:bandit-captain", "athletics", 4],
    ["SRD:bandit-captain", "deception", 4],
    ["SRD:wolf", "perception", 3],
    ["SRD:wolf", "stealth", 4],
  ];

  it.each(HABILIDADES_DEL_LIBRO)(
    "%s tiene %s con el %d que imprime el libro",
    (ref, habilidad, bonoDelLibro) => {
      const s = SRD_STATBLOCK_POR_REF.get(ref)!;
      const nivel = s.skillProficiencies[habilidad];
      expect(nivel).toBeDefined();
      const prof = bonoDeCompetenciaPorVd(s.cr);
      const mod = modificador(s.abilities[SKILLS[habilidad] as AbilityKey]);
      const aporta =
        nivel === "expertise" ? prof * 2 : nivel === "half" ? Math.floor(prof / 2) : prof;
      expect(mod + aporta).toBe(bonoDelLibro);
    },
  );

  it("el sigilo del goblin es pericia, que es lo que explica el +6", () => {
    // Si esto fuera «proficient» saldría +4 y la ficha mentiría. Es el caso que obligó a
    // guardar el NIVEL de competencia y no el bono ya sumado.
    expect(SRD_STATBLOCK_POR_REF.get("SRD:goblin")!.skillProficiencies["stealth"]).toBe(
      "expertise",
    );
  });

  it("las salvaciones con competencia son las del libro", () => {
    expect(SRD_STATBLOCK_POR_REF.get("SRD:zombie")!.saveProficiencies).toEqual(["wis"]);
    expect(SRD_STATBLOCK_POR_REF.get("SRD:bandit-captain")!.saveProficiencies.sort()).toEqual([
      "dex",
      "str",
      "wis",
    ]);
    expect(SRD_STATBLOCK_POR_REF.get("SRD:goblin")!.saveProficiencies).toEqual([]);
  });

  // --- Lo que hace falta que el catálogo cubra para que el motor tenga con qué probarse ---

  it("cubre las formas que el motor tiene que saber tratar", () => {
    const conArmaduraDicha = SRD_STATBLOCKS.filter((s) => s.acNote?.includes("cuero"));
    expect(conArmaduraDicha.length).toBeGreaterThan(0);
    const conArmaduraNatural = SRD_STATBLOCKS.filter((s) => s.acNote === "armadura natural");
    expect(conArmaduraNatural.length).toBeGreaterThan(0);
    const sinNota = SRD_STATBLOCKS.filter((s) => !s.acNote);
    expect(sinNota.length).toBeGreaterThan(0); // plebeyo y zombi: CA a pelo
    expect(SRD_STATBLOCKS.some((s) => s.damageResistances.length > 0)).toBe(true);
    expect(SRD_STATBLOCKS.some((s) => s.conditionImmunities.length > 0)).toBe(true);
    expect(SRD_STATBLOCKS.some((s) => s.reactions.length > 0)).toBe(true);
    expect(SRD_STATBLOCKS.some((s) => s.traits.length > 0)).toBe(true);
    expect(SRD_STATBLOCKS.some((s) => (s.darkvisionFeet ?? 0) > 0)).toBe(true);
  });

  it("la resistencia del tumulario se guarda como la frase que es, no como un tipo de daño", () => {
    // Es el monstruo que obligó a que las resistencias fueran prosa: «contundente, cortante y
    // perforante de ataques no mágicos con armas que no sean de plata» no es un tipo de daño.
    const tumulario = SRD_STATBLOCK_POR_REF.get("SRD:wight")!;
    expect(tumulario.damageResistances.some((r) => r.split(" ").length > 3)).toBe(true);
    expect(tumulario.damageImmunities).toContain("poison");
  });

  it("la prosa está en español y no arrastra el monstruo siguiente", () => {
    const todas = SRD_STATBLOCKS.flatMap((s) => [...s.traits, ...s.actions, ...s.reactions]);
    expect(todas.length).toBeGreaterThan(20);
    for (const f of todas) {
      // Ningún nombre de rasgo es una frase entera: eso pasaba cuando el troceo se comía el
      // párrafo de ambientación.
      expect(f.name.split(" ").length).toBeLessThanOrEqual(5);
      // Y ninguna prosa termina en un encabezado colgado sin punto.
      expect(f.desc.trim().endsWith(".")).toBe(true);
    }
    expect(SRD_STATBLOCK_POR_REF.get("SRD:goblin")!.actions[0].desc).toContain("Ataque con arma");
  });

  it("los nombres son los de la traducción oficial, incluidos los dos que engañan", () => {
    // «Goblin» y no «trasgo»: trasgo es el colectivo de los goblinoides.
    expect(SRD_STATBLOCK_POR_REF.get("SRD:goblin")!.name).toBe("Goblin");
    // «Tumulario» y no «Espectro»: Espectro es el *specter*, que tiene CA 12 y 5d8.
    expect(SRD_STATBLOCK_POR_REF.get("SRD:wight")!.name).toBe("Tumulario");
    expect(SRD_STATBLOCK_POR_REF.get("SRD:dire-wolf")!.name).toBe("Lobo terrible");
    expect(SRD_STATBLOCK_POR_REF.get("SRD:owlbear")!.name).toBe("Oso lechuza");
  });

  it("el valor de desafío se escribe como fracción cuando lo es", () => {
    expect(vdLegible(0)).toBe("0");
    expect(vdLegible(0.125)).toBe("1/8");
    expect(vdLegible(0.25)).toBe("1/4");
    expect(vdLegible(0.5)).toBe("1/2");
    expect(vdLegible(5)).toBe("5");
  });
});
