import { describe, expect, it } from "vitest";
import type { DerivedValue, RollResultRevealed } from "@dnd/shared";
import { dadosDeLaTirada, lineaDeDesglose, sumandosDeLaTirada } from "../desglose";

// Lo que importa aquí: que **el dado descartado siga siendo identificable** y que **la suma se
// explique**. Las dos cosas son la tarea F3 entera; un total suelto ya lo sabía enseñar la
// versión anterior.

function tirada(parcial: Partial<RollResultRevealed> = {}): RollResultRevealed {
  return {
    // 2C.1: el resultado es una unión discriminada, y estas pruebas miran el desglose.
    revealed: true,
    audience: "PUBLIC",
    eventId: "e1",
    expression: "1d20+3",
    rolls: [12],
    kept: [12],
    dropped: [],
    modifier: 3,
    total: 15,
    natural: "NONE",
    outcome: "NO_DC",
    ...parcial,
  };
}

describe("dadosDeLaTirada", () => {
  it("conserva el orden en que cayeron y marca el descartado", () => {
    const dados = dadosDeLaTirada({ rolls: [8, 17], dropped: [8] });
    expect(dados).toEqual([
      { valor: 8, conservado: false },
      { valor: 17, conservado: true },
    ]);
  });

  it("con dos dados iguales tacha uno solo, no los dos", () => {
    // El caso que rompe el cotejo ingenuo por valor: con ventaja se sacan dos ochos, se conserva
    // uno y se descarta el otro. Si se marcaran los dos como descartados, la pantalla diría que
    // no se quedó ninguno.
    const dados = dadosDeLaTirada({ rolls: [8, 8], dropped: [8] });
    expect(dados.filter((d) => d.conservado)).toHaveLength(1);
    expect(dados.filter((d) => !d.conservado)).toHaveLength(1);
  });

  it("sin descartes, todos cuentan", () => {
    expect(dadosDeLaTirada({ rolls: [12], dropped: [] })).toEqual([
      { valor: 12, conservado: true },
    ]);
  });
});

describe("sumandosDeLaTirada", () => {
  it("sin valor derivado, el modificador se atribuye a lo que se tiraba", () => {
    const partes = sumandosDeLaTirada(tirada({ kept: [12], modifier: 3 }), "Percepción");
    expect(partes).toEqual([
      { texto: "dado", cantidad: 12, esBase: true },
      { texto: "percepción", cantidad: 3, esBase: false },
    ]);
  });

  it("con el valor derivado, el modificador se abre en sus pasos", () => {
    const derivado: DerivedValue = {
      key: "skill.perception",
      total: 5,
      steps: [
        {
          op: "add",
          amount: 3,
          sourceType: "ability",
          sourceKey: "wis",
          labelKey: "abilityMod.wis",
        },
        {
          op: "add",
          amount: 2,
          sourceType: "proficiency",
          sourceKey: "proficient",
          labelKey: "proficiencyBonus",
        },
      ],
    };
    const partes = sumandosDeLaTirada(tirada({ kept: [12], modifier: 5 }), "Percepción", derivado);
    expect(partes).toEqual([
      { texto: "dado", cantidad: 12, esBase: true },
      { texto: "modificador de sabiduría", cantidad: 3, esBase: false },
      { texto: "bonificador de competencia", cantidad: 2, esBase: false },
    ]);
  });

  it("si el derivado no cuadra con el modificador que sumó el servidor, no se usa", () => {
    // La hoja del navegador y la tirada del servidor estarían hablando de números distintos.
    // Desglosar con el que no cuenta sería inventarse la explicación de una suma ajena.
    const derivado: DerivedValue = {
      key: "skill.perception",
      total: 99,
      steps: [
        {
          op: "add",
          amount: 99,
          sourceType: "ability",
          sourceKey: "wis",
          labelKey: "abilityMod.wis",
        },
      ],
    };
    const partes = sumandosDeLaTirada(tirada({ kept: [12], modifier: 5 }), "Percepción", derivado);
    expect(partes).toEqual([
      { texto: "dado", cantidad: 12, esBase: true },
      { texto: "percepción", cantidad: 5, esBase: false },
    ]);
  });

  it("un modificador de cero no inventa un sumando", () => {
    expect(sumandosDeLaTirada(tirada({ kept: [9], modifier: 0 }), "Sigilo")).toEqual([
      { texto: "dado", cantidad: 9, esBase: true },
    ]);
  });
});

describe("lineaDeDesglose", () => {
  it("escribe la suma entera, nunca un número solo", () => {
    const linea = lineaDeDesglose(17, [
      { texto: "dado", cantidad: 12, esBase: true },
      { texto: "destreza", cantidad: 3, esBase: false },
      { texto: "competencia", cantidad: 2, esBase: false },
    ]);
    expect(linea).toBe("17 = 12 dado +3 destreza +2 competencia");
  });

  it("un sumando negativo lleva el signo menos tipográfico, no un guion", () => {
    const linea = lineaDeDesglose(9, [
      { texto: "dado", cantidad: 11, esBase: true },
      { texto: "agotamiento", cantidad: -2, esBase: false },
    ]);
    expect(linea).toBe("9 = 11 dado \u22122 agotamiento");
  });

  it("a partir de tres sumandos resume: la base, los dos que más pesan, y «y N más»", () => {
    const linea = lineaDeDesglose(20, [
      { texto: "dado", cantidad: 10, esBase: true },
      { texto: "uno", cantidad: 1, esBase: false },
      { texto: "cuatro", cantidad: 4, esBase: false },
      { texto: "cinco", cantidad: 5, esBase: false },
    ]);
    expect(linea).toBe("20 = 10 dado +5 cinco +4 cuatro y 1 más");
  });
});
