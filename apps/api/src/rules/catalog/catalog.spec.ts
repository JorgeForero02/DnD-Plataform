import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ABILITY_KEYS, SKILLS, type SkillKey } from "@dnd/shared";
import { proficiencyBonus } from "../engine";
import { SRD_ARMOR } from "./armor";
import { SRD_CLASSES } from "./classes";
import { SRD_RACES } from "./races";
import { PROFICIENCY_BONUS_TABLE, SRD_CATALOG } from "./index";
import { UnknownContentError, findArmor, findClass, findRace } from "./resolve";
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

  it("startingGold sigue la tabla Starting Wealth by Class del SRD 5.1, en po", () => {
    // SRD 5.1, «Starting Wealth by Class»: Barbarian 2d4×10, Bard 5d4×10, Cleric 5d4×10, Druid
    // 2d4×10, Fighter 5d4×10, Monk 5d4, Paladin 5d4×10, Ranger 5d4×10, Rogue 4d4×10, Sorcerer
    // 3d4×10, Warlock 4d4×10, Wizard 4d4×10.
    const esperado: Record<string, { dice: string; times: number }> = {
      barbarian: { dice: "2d4", times: 10 },
      bard: { dice: "5d4", times: 10 },
      cleric: { dice: "5d4", times: 10 },
      druid: { dice: "2d4", times: 10 },
      fighter: { dice: "5d4", times: 10 },
      monk: { dice: "5d4", times: 1 },
      paladin: { dice: "5d4", times: 10 },
      ranger: { dice: "5d4", times: 10 },
      rogue: { dice: "4d4", times: 10 },
      sorcerer: { dice: "3d4", times: 10 },
      warlock: { dice: "4d4", times: 10 },
      wizard: { dice: "4d4", times: 10 },
    };
    for (const clase of SRD_CLASSES) expect(clase.startingGold).toEqual(esperado[clase.key]);
    expect(Object.keys(esperado)).toHaveLength(SRD_CLASSES.length);
  });

  it("ninguna clave se repite: ni raza, ni subraza, ni clase, ni armadura, ni concesión", () => {
    const conjuntos: [string, string[]][] = [
      ["razas", SRD_RACES.map((r) => r.key)],
      ["subrazas", SRD_RACES.flatMap((r) => r.subraces.map((s) => s.key))],
      ["clases", SRD_CLASSES.map((c) => c.key)],
      ["armaduras", SRD_ARMOR.map((a) => a.key)],
      // Las claves de eleccion de habilidades de clase se fabrican al resolver
      // (`${clase}-skills`) pero **son las que 2A.6 persistira**, asi que entran aqui: una
      // concesion de raza llamada "rogue-skills" colisionaria en silencio.
      [
        "concesiones",
        [...todasLasConcesiones().map((g) => g.id), ...SRD_CLASSES.map((c) => `${c.key}-skills`)],
      ],
    ];
    for (const [nombre, claves] of conjuntos) {
      const repetidas = claves.filter((clave, i) => claves.indexOf(clave) !== i);
      expect({ [nombre]: repetidas }).toEqual({ [nombre]: [] });
    }
  });

  it.each(SRD_CLASSES.map((c) => [c.key, c] as const))(
    "%s: el dado de golpe es uno de los cuatro del SRD",
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
    "%s: la elección de habilidades es coherente — no se eligen mas de las que se ofrecen, sin repetir, y todas existen",
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
      // El filtro era `/asi|ability-score/` sobre la clave, y no casaba con **ninguna** de las
      // 203 aptitudes salvo por accidente de subcadena: "ev-asi-on". O sea, no comprobaba nada
      // y ademas disparaba en falso. Lo cazo la revision del 2026-09-02.
      //
      // Lo que de verdad hay que comprobar es que **ninguna clave de aptitud describa una
      // mejora de caracteristica**, viva en el nivel que viva: ese dato solo esta en
      // `asiLevels`, y repetirlo en dos sitios es como empiezan a discrepar.
      const solapadas = clase.features.filter((feature) =>
        /^(asi|ability-score)/.test(feature.key),
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
        // **`excluding` tambien se valida, y no solo `from`.** Con un `excluding: ["chr"]` mal
        // escrito, Carisma pasaria a ser elegible sin que nada avisara; y si `excluding`
        // contuviera algo ausente de `from`, la validacion devolveria NOT_IN_LIST antes que
        // EXCLUDED, rompiendo el orden que el comentario de `choices.ts` defiende.
        for (const ability of grant.excluding ?? []) {
          expect(ABILITY_KEYS).toContain(ability);
          expect(grant.from).toContain(ability);
        }
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
    // **La línea de atribución es la ESPAÑOLA desde el 2026-09-02**, porque es la edición
    // española del SRD la que usamos: los nombres son los de la traducción oficial de Wizards,
    // no una nuestra. Wizards da esa línea literalmente en ese PDF y pide que no se añada
    // ningún otro reconocimiento.
    expect(notice).toContain("Creative Commons Atribución/Reconocimiento 4.0");
    expect(notice).toContain("legalcode.es");
    // CC BY exige **indicar si se han hecho modificaciones**. La nuestra ya no es traducir
    // —eso ahora lo pone Wizards—, sino reorganizar y seleccionar.
    expect(notice).toContain("Modificaciones:");
    // Se mira **la línea de modificaciones**, no el fichero entero: el aviso explica más abajo
    // por qué antes decía otra cosa, y una búsqueda a lo bruto cazaría esa nota histórica.
    // El párrafo entero, no su primer renglón: la nota envuelve, y mirar solo la primera línea
    // dejaba la puerta abierta a colar la frase vieja en la segunda.
    const modificaciones = /\*\*Modificaciones:\*\*[\s\S]*?\r?\n\s*\r?\n/.exec(notice)?.[0] ?? "";
    expect(modificaciones).toContain("reorganizado como datos estructurados");
    expect(modificaciones).not.toContain("traducido al español");
  });

  // **La lista se derivaría sola si pudiera, y no puede: es la garantía legal.** Por eso se
  // escribe a mano y por eso `spell-slots.ts` entró aquí el 2026-09-02 — llevaba su cabecera
  // desde que se escribió, pero **perderla no ponía nada rojo**, así que la garantía cubría
  // cinco ficheros mientras NOTICE.md prometía «cada fichero de datos». Los que faltan de este
  // directorio (`choices.ts`, `resolve.ts`) son lógica, no datos del SRD.
  it.each([
    "races.ts",
    "classes.ts",
    "armor.ts",
    "types.ts",
    "index.ts",
    "spell-slots.ts",
    "weapons.ts",
    "gear.ts",
    "items-srd.ts",
  ])("%s lleva su cabecera de atribución apuntando a NOTICE.md", (fichero) => {
    const contenido = readFileSync(join(__dirname, fichero), "utf8");
    expect(contenido).toContain("System Reference Document 5.1");
    expect(contenido).toContain("NOTICE.md");
  });

  it("toda clave del catalogo esta en la lista blanca del SRD: nada de contenido propio", () => {
    // La prueba anterior afirmaba `sourceType !== "manual"` sobre los modificadores resueltos, y
    // `resolveBuild` **nunca** emite ese valor: no podia ponerse roja, y ademas no comprobaba lo
    // que su nombre decia. Lo cazo la revision del 2026-09-02.
    //
    // Esto si lo comprueba: la lista blanca son las claves que el SRD 5.1 trae. Si alguien mete
    // una raza, una clase o una armadura que no esta en el SRD, el contenido de serie deja de
    // ser distribuible bajo CC BY y esta prueba lo dice.
    expect(SRD_RACES.map((r) => r.key).sort()).toEqual(
      [
        "dragonborn",
        "dwarf",
        "elf",
        "gnome",
        "half-elf",
        "half-orc",
        "halfling",
        "human",
        "tiefling",
      ].sort(),
    );
    expect(SRD_CLASSES.map((c) => c.key).sort()).toEqual(
      [
        "barbarian",
        "bard",
        "cleric",
        "druid",
        "fighter",
        "monk",
        "paladin",
        "ranger",
        "rogue",
        "sorcerer",
        "warlock",
        "wizard",
      ].sort(),
    );
    // Y ninguna subclase fuera de la unica que el SRD trae por clase.
    expect(SRD_CLASSES.flatMap((c) => c.subclasses).length).toBe(12);
  });
});
