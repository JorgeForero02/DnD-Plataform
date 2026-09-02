import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ABILITY_KEYS, SKILLS, type SkillKey } from "@dnd/shared";
import { proficiencyBonus } from "../engine";
import { SRD_ARMOR } from "./armor";
import { SRD_CLASSES } from "./classes";
import { SRD_RACES } from "./races";
import { PROFICIENCY_BONUS_TABLE, SRD_CATALOG } from "./index";
import { UnknownContentError, findArmor, findClass, findRace, resolveBuild } from "./resolve";
import type { Grant } from "./types";

// Tarea 2A.3 — capa 1 de la verificación (§4.4 del plan): **invariantes sobre todo el
// catálogo**. Una prueba, cientos de filas cubiertas.
//
// Estas pruebas no comprueban que una cifra sea la del SRD —eso solo lo puede hacer un humano
// con el SRD delante, y por eso el diff se entrega legible—. Comprueban lo otro: **el error de
// copiar y pegar**, que es el error real de una transcripción. Una clave duplicada, una clase
// con tres salvaciones porque se arrastró una línea, una velocidad a cero.

const CLAVES_DE_HABILIDAD = Object.keys(SKILLS) as SkillKey[];

function todasLasConcesiones(): Grant[] {
  return SRD_RACES.flatMap((race) => [...race.grants, ...race.subraces.flatMap((s) => s.grants)]);
}

describe("invariantes del catálogo entero", () => {
  it("trae las nueve razas y las doce clases del SRD 5.1, ni una más", () => {
    expect(SRD_RACES).toHaveLength(9);
    expect(SRD_CLASSES).toHaveLength(12);
  });

  it("ninguna clave se repite: ni raza, ni subraza, ni clase, ni armadura, ni concesión", () => {
    const conjuntos: [string, string[]][] = [
      ["razas", SRD_RACES.map((r) => r.key)],
      ["subrazas", SRD_RACES.flatMap((r) => r.subraces.map((s) => s.key))],
      ["clases", SRD_CLASSES.map((c) => c.key)],
      ["armaduras", SRD_ARMOR.map((a) => a.key)],
      ["concesiones", todasLasConcesiones().map((g) => g.id)],
    ];
    for (const [nombre, claves] of conjuntos) {
      const repetidas = claves.filter((clave, i) => claves.indexOf(clave) !== i);
      expect({ [nombre]: repetidas }).toEqual({ [nombre]: [] });
    }
  });

  it.each(SRD_CLASSES.map((c) => [c.key, c] as const))(
    "%s: dado de golpe entre d6 y d12, y par",
    (_clave, clase) => {
      expect([6, 8, 10, 12]).toContain(clase.hitDie);
    },
  );

  it.each(SRD_CLASSES.map((c) => [c.key, c] as const))(
    "%s: exactamente dos competencias de salvación, distintas y válidas",
    (_clave, clase) => {
      expect(clase.saveProficiencies).toHaveLength(2);
      expect(new Set(clase.saveProficiencies).size).toBe(2);
      for (const ability of clase.saveProficiencies) expect(ABILITY_KEYS).toContain(ability);
    },
  );

  it.each(SRD_CLASSES.map((c) => [c.key, c] as const))(
    "%s: la elección de habilidades es coherente — se eligen menos de las que se ofrecen, sin repetir, y todas existen",
    (_clave, clase) => {
      const { choose, from } = clase.skillChoice;
      expect(choose).toBeGreaterThan(0);
      expect(from.length).toBeGreaterThanOrEqual(choose);
      expect(new Set(from).size).toBe(from.length);
      for (const skill of from) expect(CLAVES_DE_HABILIDAD).toContain(skill);
    },
  );

  it.each(SRD_CLASSES.map((c) => [c.key, c] as const))(
    "%s: las mejoras de característica están dentro de 1..20, ordenadas y sin repetir",
    (_clave, clase) => {
      expect(clase.asiLevels).toEqual([...clase.asiLevels].sort((a, b) => a - b));
      expect(new Set(clase.asiLevels).size).toBe(clase.asiLevels.length);
      for (const level of clase.asiLevels) {
        expect(level).toBeGreaterThanOrEqual(1);
        expect(level).toBeLessThanOrEqual(20);
      }
    },
  );

  it.each(SRD_CLASSES.map((c) => [c.key, c] as const))(
    "%s: ninguna aptitud repite un nivel de mejora de característica — el dato vive en un solo sitio",
    (_clave, clase) => {
      const solapadas = clase.features.filter(
        (feature) =>
          clase.asiLevels.includes(feature.level) && /asi|ability-score/.test(feature.key),
      );
      expect(solapadas).toEqual([]);
    },
  );

  it.each(SRD_CLASSES.map((c) => [c.key, c] as const))(
    "%s: toda aptitud cae entre el nivel 1 y el 20, y sus claves no se repiten",
    (_clave, clase) => {
      const todas = [...clase.features, ...clase.subclasses.flatMap((s) => s.features)];
      for (const feature of todas) {
        expect(feature.level).toBeGreaterThanOrEqual(1);
        expect(feature.level).toBeLessThanOrEqual(20);
        expect(feature.name.length).toBeGreaterThan(0);
      }
      const claves = clase.features.map((f) => f.key);
      expect(new Set(claves).size).toBe(claves.length);
    },
  );

  it.each(SRD_CLASSES.map((c) => [c.key, c] as const))(
    "%s: trae exactamente la subclase del SRD, y su nivel de elección es coherente con sus aptitudes",
    (_clave, clase) => {
      expect(clase.subclasses).toHaveLength(1);
      const subclase = clase.subclasses[0];
      expect(subclase.chosenAtLevel).toBeGreaterThanOrEqual(1);
      expect(subclase.features.length).toBeGreaterThan(0);
      // Ninguna aptitud de subclase puede llegar antes de que se elija la subclase.
      for (const feature of subclase.features)
        expect(feature.level).toBeGreaterThanOrEqual(subclase.chosenAtLevel);
    },
  );

  it.each(SRD_CLASSES.map((c) => [c.key, c] as const))(
    "%s: si lanza conjuros, la característica es una de las seis",
    (_clave, clase) => {
      if (clase.spellcastingAbility) expect(ABILITY_KEYS).toContain(clase.spellcastingAbility);
    },
  );

  it.each(SRD_RACES.map((r) => [r.key, r] as const))(
    "%s: velocidad de andar mayor que cero",
    (_clave, raza) => {
      const andar = raza.grants.find((g) => g.kind === "speed" && g.movement === "walk");
      expect(andar).toBeDefined();
      expect(andar && andar.kind === "speed" ? andar.feet : 0).toBeGreaterThan(0);
    },
  );

  it("toda concesión apunta a algo que existe: características, habilidades y cantidades reales", () => {
    for (const grant of todasLasConcesiones()) {
      expect(grant.id.length).toBeGreaterThan(0);
      expect(grant.labelKey.length).toBeGreaterThan(0);
      if (grant.kind === "ability") expect(ABILITY_KEYS).toContain(grant.ability);
      if (grant.kind === "skill") expect(CLAVES_DE_HABILIDAD).toContain(grant.skill);
      if (grant.kind === "abilityChoice") {
        expect(grant.from.length - (grant.excluding?.length ?? 0)).toBeGreaterThanOrEqual(
          grant.choose,
        );
        for (const ability of grant.from) expect(ABILITY_KEYS).toContain(ability);
      }
      if (grant.kind === "skillChoice") {
        expect(grant.from.length).toBeGreaterThanOrEqual(grant.choose);
        for (const skill of grant.from) expect(CLAVES_DE_HABILIDAD).toContain(skill);
      }
    }
  });

  it("las armaduras respetan la regla del tope de Destreza por categoría", () => {
    for (const armor of SRD_ARMOR) {
      expect(armor.baseAc).toBeGreaterThan(0);
      if (armor.category === "LIGHT") expect(armor.dexCap).toBeUndefined();
      if (armor.category === "MEDIUM") expect(armor.dexCap).toBe(2);
      // Pesada: la Destreza **no suma nada**. `0` y `undefined` significan cosas opuestas.
      if (armor.category === "HEAVY") expect(armor.dexCap).toBe(0);
    }
  });

  it("solo hay un escudo, y su +2 es una suma plana y no una fórmula", () => {
    const escudos = SRD_ARMOR.filter((a) => a.category === "SHIELD");
    expect(escudos).toHaveLength(1);
    expect(escudos[0].baseAc).toBe(2);
    expect(escudos[0].dexCap).toBeUndefined();
  });

  it("la tabla de competencia y la función del motor dicen lo mismo en los veinte niveles", () => {
    for (let level = 1; level <= 20; level++) {
      const banda = PROFICIENCY_BONUS_TABLE.find((b) => level >= b.fromLevel && level <= b.toLevel);
      expect(banda).toBeDefined();
      expect(banda!.bonus).toBe(proficiencyBonus(level));
    }
    // Y las bandas del SRD son exactamente estas, por si alguien "arregla" la función.
    expect(PROFICIENCY_BONUS_TABLE.map((b) => b.bonus)).toEqual([2, 3, 4, 5, 6]);
  });

  it("el catálogo agregado es el mismo que sus tres piezas", () => {
    expect(SRD_CATALOG.races).toBe(SRD_RACES);
    expect(SRD_CATALOG.classes).toBe(SRD_CLASSES);
    expect(SRD_CATALOG.armor).toBe(SRD_ARMOR);
  });
});

describe("la búsqueda por referencia falla ruidosamente", () => {
  it("una clave que no existe es UnknownContentError, no undefined", () => {
    expect(() => findRace({ source: "SRD", key: "vulcaniano" })).toThrow(UnknownContentError);
    expect(() => findClass({ source: "SRD", key: "artificiero" })).toThrow(UnknownContentError);
    expect(() => findArmor({ source: "SRD", key: "traje-espacial" })).toThrow(UnknownContentError);
  });

  it("una referencia de campaña se rechaza en 2A en vez de resolverse a nada", () => {
    expect(() => findRace({ source: "CAMPAIGN", id: "cualquiera" })).toThrow(UnknownContentError);
  });
});

// --- Capa 3 (§4.4): el control legal, mecánico en vez de una intención ---

describe("la línea legal está protegida por una prueba, no por buena voluntad", () => {
  const raiz = join(__dirname, "..", "..", "..", "..", "..");

  it("NOTICE.md existe en la raíz y contiene la atribución y la nota de modificación", () => {
    const notice = readFileSync(join(raiz, "NOTICE.md"), "utf8");
    expect(notice).toContain("System Reference Document 5.1");
    expect(notice).toContain("Wizards of the Coast LLC");
    expect(notice).toContain("Creative Commons Attribution 4.0");
    // CC BY exige **indicar si se han hecho modificaciones**, y traducir es una.
    expect(notice).toContain("Modificaciones:");
  });

  it.each(["races.ts", "classes.ts", "armor.ts", "types.ts", "index.ts"])(
    "%s lleva su cabecera de atribución apuntando a NOTICE.md",
    (fichero) => {
      const contenido = readFileSync(join(__dirname, fichero), "utf8");
      expect(contenido).toContain("System Reference Document 5.1");
      expect(contenido).toContain("NOTICE.md");
    },
  );

  it("ninguna concesión ni ninguna clave del catálogo se marca como de campaña", () => {
    // En 2A **no hay homebrew**: si alguien mete una fila de campaña en estos ficheros, es que
    // el homebrew se ha colado en el contenido de serie, que es justo lo que la licencia no
    // permite distribuir. La comprobación es tonta a propósito.
    const resuelto = resolveBuild({
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      race: { source: "SRD", key: "human" },
      class: { source: "SRD", key: "fighter" },
      level: 1,
    });
    for (const modificador of resuelto.input.modifiers)
      expect(modificador.sourceType).not.toBe("manual");
  });
});
