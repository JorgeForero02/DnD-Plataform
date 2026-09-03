import { pgMediosDe } from "@dnd/shared";
import { SRD_STATBLOCK_POR_REF } from "./catalog/monsters-srd";
import { derive, type Modifier } from "./engine";
import { entradaDeMotorDe } from "./monster";

/**
 * 2D.2 — el camino de monstruo del motor, probado contra los números que imprime el libro.
 *
 * Lo que estas pruebas defienden no es que el motor calcule: es que calcula **lo mismo que dice
 * el SRD** y que lo **explica**. Un PNJ derivado sin traza sería un paso atrás respecto de toda
 * la fase 2.
 */

function derivaDe(ref: string, modifiers: Modifier[] = []) {
  const statblock = SRD_STATBLOCK_POR_REF.get(ref);
  if (!statblock) throw new Error(`no existe ${ref}`);
  return derive({ ...entradaDeMotorDe(statblock), modifiers });
}

describe("el motor derivando un PNJ desde su statblock", () => {
  describe("los números son los del libro", () => {
    it("la CA del goblin es la que dice el statblock, no una fórmula de armadura", () => {
      const goblin = derivaDe("SRD:goblin");
      expect(goblin.derived.ac.total).toBe(15);
      // Y NO 10 + 2 de Destreza = 12, que es lo que saldría por el camino del personaje.
      expect(goblin.derived.ac.total).not.toBe(12);
    });

    it("la CA sale con la nota del libro en la traza, para que la mesa sepa por qué", () => {
      const goblin = derivaDe("SRD:goblin");
      const [primero] = goblin.derived.ac.steps;
      expect(primero.sourceType).toBe("statblock");
      expect(primero.sourceKey).toBe("armadura de cuero, escudo");
      expect(primero.amount).toBe(15);
    });

    it.each([
      ["SRD:commoner", 4],
      ["SRD:goblin", 7],
      ["SRD:orc", 15],
      ["SRD:ogre", 59],
      ["SRD:bandit-captain", 65],
      ["SRD:troll", 84],
      ["SRD:hill-giant", 105],
    ])("los PG máximos de %s son los %d del libro", (ref, pg) => {
      expect(derivaDe(ref).derived.maxHp.total).toBe(pg);
    });

    it("los PG del ogro se explican como media de dados más Constitución por dado", () => {
      // El SRD imprime «59 (7d10 + 21)»: 38 de media de 7d10 y 21 de Constitución.
      const ogro = derivaDe("SRD:ogre");
      const pasos = ogro.derived.maxHp.steps;
      expect(pasos[0].sourceType).toBe("statblock");
      expect(pasos[0].sourceKey).toBe("7d10");
      expect(pasos[0].amount).toBe(38);
      expect(pasos[1].sourceKey).toBe("con");
      expect(pasos[1].amount).toBe(21);
      expect(pasos[0].amount + pasos[1].amount).toBe(59);
    });

    it("el goblin no arrastra un paso de Constitución que vale cero", () => {
      // CON 10 → modificador 0. Un «+0 por Constitución» en la traza es ruido que la mesa lee
      // como si significara algo.
      const pasos = derivaDe("SRD:goblin").derived.maxHp.steps;
      expect(pasos).toHaveLength(1);
      expect(pasos[0].amount).toBe(7);
    });
  });

  describe("la competencia sale del desafío y no del nivel", () => {
    it("el troll de VD 5 tiene competencia +3", () => {
      const troll = derivaDe("SRD:troll");
      expect(troll.derived.proficiencyBonus.total).toBe(3);
      expect(troll.derived.proficiencyBonus.steps[0].sourceType).toBe("challenge");
      expect(troll.derived.proficiencyBonus.steps[0].sourceKey).toBe("5");
    });

    it("el goblin de VD 1/4 tiene competencia +2, y la traza lo dice en fracción", () => {
      const goblin = derivaDe("SRD:goblin");
      expect(goblin.derived.proficiencyBonus.total).toBe(2);
      // «1/4» y no «0.25»: es lo que está escrito en el libro y lo que la mesa dice en voz alta.
      expect(goblin.derived.proficiencyBonus.steps[0].sourceKey).toBe("1/4");
    });

    it("ningún PNJ deriva su competencia de un nivel", () => {
      for (const ref of ["SRD:commoner", "SRD:goblin", "SRD:troll", "SRD:hill-giant"]) {
        expect(derivaDe(ref).derived.proficiencyBonus.steps[0].sourceType).not.toBe("level");
      }
    });
  });

  describe("todo lo demás se deriva igual que en una hoja de personaje", () => {
    it("el sigilo del goblin es +6, descompuesto y no dicho", () => {
      const sigilo = derivaDe("SRD:goblin").derived["skill.stealth"];
      expect(sigilo.total).toBe(6);
      // DES +2, competencia +2, pericia +2: tres pasos, ninguno de ellos un «+6» pelado.
      expect(sigilo.steps.map((p) => p.amount)).toEqual([2, 2, 2]);
      expect(sigilo.steps[2].labelKey).toBe("expertise");
    });

    it("la salvación de Sabiduría del zombi es la del libro", () => {
      // El SRD imprime «Tiradas de salvación: Sab +0»: SAB 6 (−2) y competencia +2.
      const zombi = derivaDe("SRD:zombie");
      expect(zombi.derived["save.wis"].total).toBe(0);
      expect(zombi.derived["save.str"].total).toBe(1); // sin competencia: solo FUE 13 (+1)
    });

    it("la percepción pasiva es la que imprime el libro", () => {
      expect(derivaDe("SRD:goblin").derived.passivePerception.total).toBe(9);
      expect(derivaDe("SRD:owlbear").derived.passivePerception.total).toBe(13);
      expect(derivaDe("SRD:ogre").derived.passivePerception.total).toBe(8);
    });

    it("los sentidos y la velocidad salen del statblock", () => {
      const goblin = derivaDe("SRD:goblin");
      expect(goblin.derived["senses.darkvision"].total).toBe(60);
      expect(goblin.derived["speed.walk"].total).toBe(30);
      expect(derivaDe("SRD:dire-wolf").derived["speed.walk"].total).toBe(50);
      // El plebeyo no ve en la oscuridad, y eso es un 0 explícito, no un hueco.
      expect(derivaDe("SRD:commoner").derived["senses.darkvision"].total).toBe(0);
    });

    it("los bonos de ataque usan la competencia del desafío", () => {
      // Troll: FUE 18 (+4) y competencia +3 → +7, que es lo que dice su garra en el libro.
      expect(derivaDe("SRD:troll").derived["attack.melee"].total).toBe(7);
      // Goblin: DES 14 (+2) y competencia +2 → +4, el de su arco corto.
      expect(derivaDe("SRD:goblin").derived["attack.ranged"].total).toBe(4);
    });
  });

  describe("las anulaciones del DM siguen funcionando sobre un PNJ", () => {
    it("el DM puede subirle la CA a un goblin y sale en la traza con su delta", () => {
      const goblin = derivaDe("SRD:goblin", [
        {
          target: "ac",
          op: "override",
          amount: 18,
          sourceType: "manual",
          sourceKey: "dm",
          labelKey: "ac.manual",
        },
      ]);
      expect(goblin.derived.ac.total).toBe(18);
      const anulacion = goblin.derived.ac.steps.at(-1)!;
      expect(anulacion.op).toBe("override");
      expect(anulacion.amount).toBe(3); // el delta desde 15, no el 18 pelado
    });

    it("un objeto que suma PG a un PNJ se suma sobre los del statblock", () => {
      const ogro = derivaDe("SRD:ogre", [
        {
          target: "maxHp",
          op: "add",
          amount: 10,
          sourceType: "item",
          sourceKey: "amuleto",
          labelKey: "maxHp.item",
        },
      ]);
      expect(ogro.derived.maxHp.total).toBe(69);
    });
  });

  describe("una entrada mixta se rechaza, no se resuelve a medias", () => {
    const goblin = SRD_STATBLOCK_POR_REF.get("SRD:goblin")!;

    it("con statblock y nivel a la vez, lanza", () => {
      expect(() => derive({ ...entradaDeMotorDe(goblin), modifiers: [], level: 3 })).toThrow(
        /entrada mixta/,
      );
    });

    it("con statblock y dado de golpe de clase a la vez, lanza", () => {
      expect(() => derive({ ...entradaDeMotorDe(goblin), modifiers: [], hitDieSize: 8 })).toThrow(
        /entrada mixta/,
      );
    });

    it("con statblock y una fórmula de CA a la vez, lanza", () => {
      // Es la mezcla más peligrosa: las dos dan un número plausible y nadie se entera.
      expect(() =>
        derive({
          ...entradaDeMotorDe(goblin),
          modifiers: [],
          acFormulas: [
            {
              key: "chain-mail",
              labelKey: "ac.chain-mail",
              base: 16,
              sourceType: "item",
              sourceKey: "chain-mail",
            },
          ],
        }),
      ).toThrow(/entrada mixta/);
    });

    it("el mensaje dice qué chocó, para que se pueda arreglar sin leer el código", () => {
      expect(() => derive({ ...entradaDeMotorDe(goblin), modifiers: [], level: 3 })).toThrow(
        /level=3/,
      );
    });

    it("una hoja de personaje normal sigue derivando sin enterarse de nada de esto", () => {
      const personaje = derive({
        abilities: { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 8 },
        level: 5,
        hitDieSize: 10,
        modifiers: [],
        saveProficiencies: ["str", "con"],
        skillProficiencies: { athletics: "proficient" },
      });
      expect(personaje.derived.proficiencyBonus.total).toBe(3);
      expect(personaje.derived.proficiencyBonus.steps[0].sourceType).toBe("level");
      expect(personaje.derived.ac.total).toBe(12); // 10 + Destreza, sin armadura
    });
  });

  describe("el puente de statblock a motor", () => {
    it("pone nivel y dado de golpe a cero, que es lo que la comprobación exige", () => {
      const entrada = entradaDeMotorDe(SRD_STATBLOCK_POR_REF.get("SRD:troll")!);
      expect(entrada.level).toBe(0);
      expect(entrada.hitDieSize).toBe(0);
      expect(entrada.monster.hitDieSize).toBe(10); // el del tamaño Grande, ese sí
    });

    it("los quince del catálogo derivan sin lanzar, y con los PG que dice el esquema", () => {
      for (const [ref, statblock] of SRD_STATBLOCK_POR_REF) {
        const r = derive({ ...entradaDeMotorDe(statblock), modifiers: [] });
        expect(`${ref}:${r.derived.maxHp.total}`).toBe(`${ref}:${pgMediosDe(statblock)}`);
      }
    });
  });
});
