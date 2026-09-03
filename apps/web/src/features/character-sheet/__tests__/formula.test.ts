import { describe, expect, it } from "vitest";
import type { DerivedValue, TraceStep } from "@dnd/shared";
import { formulaDeUnaLinea, resumenDeAjustes } from "../formula";

// `resumenDeAjustes` nació con la adopción de la maqueta y resuelve un problema que la casilla
// vieja no tenía: con el modificador GRANDE encima de la puntuación pequeña, las dos cifras se
// leen juntas — y la puntuación que se pinta es la **base editable**, mientras que el modificador
// sale de la **derivada**. Un enano con Constitución 14 y su +2 racial enseñaría «+2» sobre un
// «14», que no cuadra. Esta función es la línea que lo explica.

function paso(labelKey: string, amount: number, op: TraceStep["op"] = "add"): TraceStep {
  return { op, amount, sourceType: "race", sourceKey: "dwarf", labelKey };
}

function valor(total: number, steps: TraceStep[]): DerivedValue {
  return { key: "ability.con", total, steps };
}

describe("resumenDeAjustes", () => {
  it("cuando la raza sube la puntuación, dice cuánto y de dónde", () => {
    const v = valor(16, [paso("ability.con.base", 14, "base"), paso("race.dwarf.con", 2)]);
    expect(resumenDeAjustes(v)).toBe("+2 enano");
  });

  it("sin nada que ajustar devuelve la cadena vacía, y la casilla no pinta ninguna línea", () => {
    // Es el caso normal —un humano sin bonificadores— y el que decide que la casilla quede
    // limpia. Si esto devolviera algo, las seis casillas llevarían una línea de ruido.
    expect(resumenDeAjustes(valor(14, [paso("ability.con.base", 14, "base")]))).toBe("");
  });

  it("un paso que no mueve el total no se cuenta: no explica nada", () => {
    const v = valor(14, [paso("ability.con.base", 14, "base"), paso("race.human.con", 0)]);
    expect(resumenDeAjustes(v)).toBe("");
  });

  it("un ajuste negativo se escribe con el signo menos tipográfico, no con un guion", () => {
    const v = valor(12, [paso("ability.con.base", 14, "base"), paso("race.dwarf.con", -2)]);
    expect(resumenDeAjustes(v)).toBe("−2 enano");
  });
});

describe("formulaDeUnaLinea sigue en pie tras mudarse de fichero", () => {
  it("empieza por la base y encadena los pasos que mueven el total", () => {
    const v = valor(16, [paso("ability.con.base", 14, "base"), paso("race.dwarf.con", 2)]);
    expect(formulaDeUnaLinea(v)).toBe("14 puntuación de constitución +2 enano");
  });

  // Carril B3 (fase 2B) — la CA con armadura pesada equipada. `traducirLabelKey` da al paso
  // «recorta» el nombre completo «Tope de Destreza de Cota de malla» (para la traza larga, donde
  // no repite nada); en la línea de una fila eso duplicaba el nombre de la armadura que ya está
  // en la base — «16 cota de malla +2 destreza −2 tope de destreza de cota de malla» — y dejaba
  // de leerse de un vistazo. La línea dice el motivo del recorte, no el nombre otra vez.
  it("el recorte de Destreza se resume como «recorte», sin repetir el nombre de la armadura", () => {
    const v: DerivedValue = {
      key: "ac",
      total: 16,
      steps: [
        {
          op: "base",
          amount: 16,
          sourceType: "item",
          sourceKey: "SRD:chain-mail",
          labelKey: "item.SRD:chain-mail",
        },
        {
          op: "add",
          amount: 2,
          sourceType: "ability",
          sourceKey: "dex",
          labelKey: "abilityMod.dex",
        },
        {
          op: "cap",
          amount: -2,
          sourceType: "item",
          sourceKey: "SRD:chain-mail",
          labelKey: "ac.cap.SRD:chain-mail",
        },
      ],
    };
    expect(formulaDeUnaLinea(v)).toBe("16 cota de malla +2 modificador de destreza −2 recorte");
  });
});
