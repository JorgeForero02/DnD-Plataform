import { combinarModo, modoContraObjetivo } from "./modo-contra-objetivo";

// Las citas del SRD 5.1 están en la cabecera del módulo, verificadas en inglés contra
// `dnd5eapi.co` el 2026-09-05. Aquí se prueba que el código dice lo mismo que la tabla.

const c = (...keys: string[]) => keys.map((key) => ({ key }));

describe("modoContraObjetivo — cómo tira quien ATACA a alguien con condiciones (D-OP-13)", () => {
  it("atacar a un ciego da VENTAJA", () => {
    // *"Attack rolls against the creature have advantage"*. Es la ficha que motivó todo esto: la
    // desventaja del ciego ya estaba implementada desde 2.5.5 y su otra mitad no.
    expect(modoContraObjetivo(c("blinded")).effect).toBe("ADVANTAGE");
  });

  it("y lo mismo las otras cinco que la dan sin depender de la distancia", () => {
    for (const key of ["paralyzed", "petrified", "restrained", "stunned", "unconscious"]) {
      expect(modoContraObjetivo(c(key)).effect).toBe("ADVANTAGE");
    }
  });

  it("atacar a un invisible da DESVENTAJA", () => {
    expect(modoContraObjetivo(c("invisible")).effect).toBe("DISADVANTAGE");
  });

  it("**`prone` no cuenta**, porque depende de la distancia y aquí no hay tablero", () => {
    // *"advantage if the attacker is within 5 feet... Otherwise, the attack roll has disadvantage."*
    // Elegir una de las dos mitades sería inventarse la mitad de las veces.
    expect(modoContraObjetivo(c("prone")).effect).toBe("NONE");
    expect(modoContraObjetivo(c("prone")).reasons).toEqual([]);
  });

  it("una condición que no cambia nada del ataque ajeno no cuenta", () => {
    // `charmed`, `deafened`, `poisoned`, `frightened`… penalizan a QUIEN las tiene, no a quien le
    // ataca. No estar en la tabla es la forma de decirlo.
    expect(modoContraObjetivo(c("frightened", "poisoned", "charmed")).effect).toBe("NONE");
  });

  it("dos causas del mismo signo siguen siendo UNA ventaja, no dos", () => {
    // *"you don't roll more than one additional d20"*.
    const r = modoContraObjetivo(c("blinded", "restrained"));
    expect(r.effect).toBe("ADVANTAGE");
    expect(r.reasons).toHaveLength(2);
  });

  it("**ventaja y desventaja se anulan**: un ciego invisible se ataca en NORMAL", () => {
    // *"If circumstances cause a roll to have both advantage and disadvantage, you are considered
    // to have neither of them, and you roll one d20."* Contar causas —dos ventajas contra una
    // desventaja— inventaría una regla de mayorías que la 5.ª edición no tiene.
    expect(modoContraObjetivo(c("blinded", "invisible")).effect).toBe("NONE");
    expect(modoContraObjetivo(c("blinded", "restrained", "invisible")).effect).toBe("NONE");
  });

  it("dice POR QUÉ, con la condición que lo causa", () => {
    expect(modoContraObjetivo(c("blinded")).reasons).toEqual([
      { effect: "ADVANTAGE", sourceKey: "blinded" },
    ]);
  });
});

describe("combinarModo — lo que pide quien tira y lo que impone el objetivo", () => {
  it("sin nada del objetivo, manda lo que se pidió", () => {
    expect(combinarModo("ADVANTAGE", "NONE")).toBe("ADVANTAGE");
    expect(combinarModo("NORMAL", "NONE")).toBe("NORMAL");
  });

  it("sin nada pedido, manda lo del objetivo", () => {
    expect(combinarModo("NORMAL", "ADVANTAGE")).toBe("ADVANTAGE");
    expect(combinarModo("NORMAL", "DISADVANTAGE")).toBe("DISADVANTAGE");
  });

  it("dos del mismo signo NO se acumulan: sigue siendo una", () => {
    expect(combinarModo("ADVANTAGE", "ADVANTAGE")).toBe("ADVANTAGE");
    expect(combinarModo("DISADVANTAGE", "DISADVANTAGE")).toBe("DISADVANTAGE");
  });

  it("**una de cada signo se anulan y sale NORMAL**", () => {
    // El caso de mesa: tiro con desventaja porque estoy asustado, y el objetivo está cegado. Ni
    // ventaja ni desventaja: un solo d20.
    expect(combinarModo("DISADVANTAGE", "ADVANTAGE")).toBe("NORMAL");
    expect(combinarModo("ADVANTAGE", "DISADVANTAGE")).toBe("NORMAL");
  });
});
