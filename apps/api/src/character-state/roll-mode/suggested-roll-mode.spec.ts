import { rollSuggestionsFor, suggestedRollMode } from "./suggested-roll-mode";

// Tarea 2.5.5, hueco M16 — las cifras del SRD 5.1, verificadas en **inglés** contra
// `dnd5eapi.co` el 2026-09-04. Las citas están en la cabecera del módulo.
//
// **Estas pruebas eligen casos que distinguen.** Casi todas comprueban a la vez lo que la regla
// hace y lo que NO hace —`restrained` en la salvación de Destreza *y* en la de Fuerza, el
// agotamiento 2 en las pruebas *y* en los ataques—, porque una aserción que solo mira el caso
// positivo pasa igual con una tabla que lo penalice todo.

const claves = (r: ReturnType<typeof suggestedRollMode>) => r.reasons.map((x) => x.sourceKey);

describe("suggestedRollMode()", () => {
  it("sin condiciones no sugiere nada, y lo dice sin causas", () => {
    const r = suggestedRollMode([], { kind: "ATTACK" });
    expect(r).toMatchObject({ mode: "NORMAL", cancelled: false, autoFail: false, reasons: [] });
  });

  describe("las condiciones que cambian el ataque de quien las tiene", () => {
    it.each([["blinded"], ["frightened"], ["poisoned"], ["prone"], ["restrained"]])(
      "%s: desventaja en el ataque",
      (key) => {
        const r = suggestedRollMode([{ key }], { kind: "ATTACK" });
        expect(r.mode).toBe("DISADVANTAGE");
        expect(claves(r)).toEqual([key]);
      },
    );

    it("invisible: **ventaja**, que es la única condición que la da", () => {
      const r = suggestedRollMode([{ key: "invisible" }], { kind: "ATTACK" });
      expect(r.mode).toBe("ADVANTAGE");
      expect(r.reasons).toEqual([
        { effect: "ADVANTAGE", sourceKey: "invisible", labelKey: "rollMode.condition.advantage" },
      ]);
    });

    it.each([["charmed"], ["deafened"], ["grappled"], ["incapacitated"]])(
      "%s no toca el ataque: está en el SRD y no cambia ninguna tirada propia",
      (key) => {
        expect(suggestedRollMode([{ key }], { kind: "ATTACK" }).mode).toBe("NORMAL");
      },
    );

    it("una clave que el motor no conoce se ignora, igual que en la velocidad efectiva", () => {
      const r = suggestedRollMode([{ key: "concentrándose en Bendición" }], { kind: "ATTACK" });
      expect(r).toMatchObject({ mode: "NORMAL", reasons: [] });
    });
  });

  describe("las pruebas de característica", () => {
    it.each([["frightened"], ["poisoned"]])("%s: desventaja en las pruebas", (key) => {
      expect(suggestedRollMode([{ key }], { kind: "CHECK" }).mode).toBe("DISADVANTAGE");
    });

    it("derribado NO toca las pruebas: solo el ataque", () => {
      expect(suggestedRollMode([{ key: "prone" }], { kind: "CHECK" }).mode).toBe("NORMAL");
      expect(suggestedRollMode([{ key: "prone" }], { kind: "ATTACK" }).mode).toBe("DISADVANTAGE");
    });

    it("**cegado no sugiere nada en una prueba**, aunque el SRD hable de ella", () => {
      // *"automatically fails any ability check that requires sight"* — el servidor no sabe si
      // ESTA prueba requiere vista, así que callar es lo honesto. La regla está en la cabecera.
      const r = suggestedRollMode([{ key: "blinded" }], { kind: "CHECK" });
      expect(r).toMatchObject({ mode: "NORMAL", autoFail: false, reasons: [] });
    });
  });

  describe("las salvaciones, que son las que distinguen característica", () => {
    it("apresado: desventaja en la de Destreza y **nada en la de Fuerza**", () => {
      expect(
        suggestedRollMode([{ key: "restrained" }], { kind: "SAVE", ability: "dex" }).mode,
      ).toBe("DISADVANTAGE");
      expect(
        suggestedRollMode([{ key: "restrained" }], { kind: "SAVE", ability: "str" }).mode,
      ).toBe("NORMAL");
    });

    it.each([["paralyzed"], ["petrified"], ["stunned"], ["unconscious"]])(
      "%s: **fallo automático** en Fuerza y Destreza — y eso NO es desventaja",
      (key) => {
        const dex = suggestedRollMode([{ key }], { kind: "SAVE", ability: "dex" });
        expect(dex.autoFail).toBe(true);
        // El modo sigue siendo NORMAL: un fallo automático no es una tirada con dos dados, es
        // que no hay tirada. Devolver "DISADVANTAGE" suavizaría la regla.
        expect(dex.mode).toBe("NORMAL");
        expect(suggestedRollMode([{ key }], { kind: "SAVE", ability: "str" }).autoFail).toBe(true);
        expect(suggestedRollMode([{ key }], { kind: "SAVE", ability: "wis" }).autoFail).toBe(false);
      },
    );

    it("una salvación sin decir de qué no recibe las reglas que dependen de la característica", () => {
      const r = suggestedRollMode([{ key: "paralyzed" }, { key: "restrained" }], { kind: "SAVE" });
      expect(r).toMatchObject({ mode: "NORMAL", autoFail: false, reasons: [] });
      expect(r.ability).toBeUndefined();
    });
  });

  describe("los seis niveles de agotamiento", () => {
    it("nivel 1: desventaja en las pruebas, y en nada más", () => {
      const c = [{ key: "exhaustion", level: 1 }];
      expect(suggestedRollMode(c, { kind: "CHECK" }).mode).toBe("DISADVANTAGE");
      expect(suggestedRollMode(c, { kind: "ATTACK" }).mode).toBe("NORMAL");
      expect(suggestedRollMode(c, { kind: "SAVE", ability: "dex" }).mode).toBe("NORMAL");
    });

    it("nivel 2: **sigue** con la desventaja en pruebas — los niveles se acumulan", () => {
      const c = [{ key: "exhaustion", level: 2 }];
      expect(suggestedRollMode(c, { kind: "CHECK" }).mode).toBe("DISADVANTAGE");
      expect(suggestedRollMode(c, { kind: "ATTACK" }).mode).toBe("NORMAL");
    });

    it("nivel 3: ataques y **todas** las salvaciones, además de las pruebas", () => {
      const c = [{ key: "exhaustion", level: 3 }];
      expect(suggestedRollMode(c, { kind: "ATTACK" }).mode).toBe("DISADVANTAGE");
      expect(suggestedRollMode(c, { kind: "CHECK" }).mode).toBe("DISADVANTAGE");
      expect(suggestedRollMode(c, { kind: "SAVE", ability: "wis" }).mode).toBe("DISADVANTAGE");
      expect(suggestedRollMode(c, { kind: "SAVE", ability: "cha" }).mode).toBe("DISADVANTAGE");
    });

    it("la causa dice **qué nivel**, no solo que hay agotamiento", () => {
      expect(
        claves(suggestedRollMode([{ key: "exhaustion", level: 5 }], { kind: "ATTACK" })),
      ).toEqual(["exhaustion:5"]);
    });

    it("una fila de agotamiento sin nivel no penaliza nada", () => {
      const c = [{ key: "exhaustion", level: null }];
      expect(suggestedRollMode(c, { kind: "CHECK" }).reasons).toEqual([]);
      expect(suggestedRollMode(c, { kind: "ATTACK" }).reasons).toEqual([]);
    });
  });

  describe("cuando concurren varias", () => {
    it("ventaja y desventaja **se anulan**, y las dos causas siguen nombradas", () => {
      const r = suggestedRollMode([{ key: "invisible" }, { key: "poisoned" }], { kind: "ATTACK" });
      expect(r.mode).toBe("NORMAL");
      expect(r.cancelled).toBe(true);
      expect(claves(r)).toEqual(["invisible", "poisoned"]);
    });

    it("dos desventajas **no ganan** a una ventaja: no hay mayorías en 5.ª edición", () => {
      const r = suggestedRollMode([{ key: "poisoned" }, { key: "prone" }, { key: "invisible" }], {
        kind: "ATTACK",
      });
      expect(r.mode).toBe("NORMAL");
      expect(r.cancelled).toBe(true);
      expect(r.reasons).toHaveLength(3);
    });

    it("dos desventajas siguen siendo una desventaja, con sus dos porqués", () => {
      const r = suggestedRollMode([{ key: "poisoned" }, { key: "frightened" }], {
        kind: "ATTACK",
      });
      expect(r.mode).toBe("DISADVANTAGE");
      expect(r.cancelled).toBe(false);
      expect(claves(r)).toEqual(["poisoned", "frightened"]);
    });

    it("un fallo automático **no anula** una desventaja ni la convierte en normal", () => {
      // Apresado y paralizado a la vez, salvación de Destreza: se falla sola, y la desventaja de
      // apresado sigue anotada. Son dos hechos, no uno que tape al otro.
      const r = suggestedRollMode([{ key: "restrained" }, { key: "paralyzed" }], {
        kind: "SAVE",
        ability: "dex",
      });
      expect(r.autoFail).toBe(true);
      expect(r.mode).toBe("DISADVANTAGE");
      expect(claves(r)).toEqual(["restrained", "paralyzed"]);
    });
  });
});

describe("rollSuggestionsFor()", () => {
  it("envenenado: ataque y prueba con desventaja, **las seis salvaciones intactas**", () => {
    const s = rollSuggestionsFor([{ key: "poisoned" }]);
    expect(s.attack.mode).toBe("DISADVANTAGE");
    expect(s.check.mode).toBe("DISADVANTAGE");
    expect(Object.values(s.saves).map((x) => x.mode)).toEqual(Array(6).fill("NORMAL"));
  });

  it("apresado: solo la salvación de Destreza cambia, y las otras cinco no", () => {
    const s = rollSuggestionsFor([{ key: "restrained" }]);
    expect(s.saves.dex!.mode).toBe("DISADVANTAGE");
    expect(
      Object.entries(s.saves)
        .filter(([ability]) => ability !== "dex")
        .map(([, v]) => v.mode),
    ).toEqual(Array(5).fill("NORMAL"));
  });

  it("cada salvación dice de qué característica es", () => {
    const s = rollSuggestionsFor([]);
    expect(s.saves.wis!.ability).toBe("wis");
    expect(s.attack.ability).toBeUndefined();
  });
});
