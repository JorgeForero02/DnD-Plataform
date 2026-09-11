import { effectiveSpeed } from "./effective-speed";

// Tarea 2A.12 — cifras exactas del SRD 5.1, sección 5 de
// `docs/superpowers/specs/2026-09-02-distancias-y-movimiento-design.md`.

describe("effectiveSpeed()", () => {
  it("sin condiciones, la velocidad efectiva es la base", () => {
    const res = effectiveSpeed(30, []);
    expect(res.total).toBe(30);
    expect(res.steps).toHaveLength(1); // solo el paso "base"
  });

  describe("una condición con su cifra exacta del SRD", () => {
    it("derribado (prone): la mitad, redondeando hacia abajo", () => {
      expect(effectiveSpeed(30, [{ key: "prone" }]).total).toBe(15);
    });

    it("agarrado (grappled): 0", () => {
      expect(effectiveSpeed(30, [{ key: "grappled" }]).total).toBe(0);
    });

    it("apresado (restrained): 0", () => {
      expect(effectiveSpeed(30, [{ key: "restrained" }]).total).toBe(0);
    });

    it("paralizado (paralyzed): 0", () => {
      expect(effectiveSpeed(30, [{ key: "paralyzed" }]).total).toBe(0);
    });

    it("inconsciente (unconscious): 0", () => {
      expect(effectiveSpeed(30, [{ key: "unconscious" }]).total).toBe(0);
    });

    it("aturdido (stunned): 0", () => {
      expect(effectiveSpeed(30, [{ key: "stunned" }]).total).toBe(0);
    });

    it("petrificado (petrified): 0", () => {
      expect(effectiveSpeed(30, [{ key: "petrified" }]).total).toBe(0);
    });
  });

  describe("los seis niveles de agotamiento", () => {
    it("nivel 1: sin efecto en la velocidad", () => {
      expect(effectiveSpeed(30, [{ key: "exhaustion", level: 1 }]).total).toBe(30);
    });

    it("nivel 2: la velocidad se reduce a la mitad", () => {
      expect(effectiveSpeed(30, [{ key: "exhaustion", level: 2 }]).total).toBe(15);
    });

    it("nivel 3: sin efecto adicional en la velocidad (el efecto nuevo es en ataques y salvaciones)", () => {
      expect(effectiveSpeed(30, [{ key: "exhaustion", level: 3 }]).total).toBe(15);
    });

    it("nivel 4: sin efecto adicional en la velocidad (el efecto nuevo son los PG máximos)", () => {
      expect(effectiveSpeed(30, [{ key: "exhaustion", level: 4 }]).total).toBe(15);
    });

    it("nivel 5: la velocidad se reduce a 0", () => {
      expect(effectiveSpeed(30, [{ key: "exhaustion", level: 5 }]).total).toBe(0);
    });

    it("nivel 6: sigue en 0 (el efecto nuevo del SRD es la muerte, no una velocidad menor)", () => {
      expect(effectiveSpeed(30, [{ key: "exhaustion", level: 6 }]).total).toBe(0);
    });
  });

  describe("dos condiciones a la vez", () => {
    it("MUTACIÓN CLAVE: derribado + agotamiento nivel 2 (dos mitades) sigue en la mitad, NUNCA un cuarto", () => {
      const res = effectiveSpeed(30, [{ key: "prone" }, { key: "exhaustion", level: 2 }]);
      expect(res.total).toBe(15); // no 7 (que sería 30 * 0.5 * 0.5, redondeado)
    });

    it("una condición a 0 gana sobre una a la mitad, en cualquier orden", () => {
      expect(effectiveSpeed(30, [{ key: "prone" }, { key: "grappled" }]).total).toBe(0);
      expect(effectiveSpeed(30, [{ key: "grappled" }, { key: "prone" }]).total).toBe(0);
    });

    it("dos condiciones a 0 a la vez siguen en 0, no se «restan» dos veces", () => {
      expect(effectiveSpeed(30, [{ key: "grappled" }, { key: "restrained" }]).total).toBe(0);
    });
  });

  it("la traza nombra TODAS las causas, no solo la primera", () => {
    const res = effectiveSpeed(30, [{ key: "grappled" }, { key: "restrained" }]);
    const causas = res.steps.map((s) => s.sourceKey);
    expect(causas).toContain("grappled");
    expect(causas).toContain("restrained");
  });

  it("la traza también nombra las dos causas cuando ambas reducen a la mitad", () => {
    const res = effectiveSpeed(30, [{ key: "prone" }, { key: "exhaustion", level: 2 }]);
    const causas = res.steps.map((s) => s.sourceKey);
    expect(causas).toContain("prone");
    expect(causas.some((c) => c.startsWith("exhaustion"))).toBe(true);
  });

  it("una clave que el motor no entiende no calcula nada (no es un error, ni cambia el total)", () => {
    const res = effectiveSpeed(30, [{ key: "concentrating-on-bless" }]);
    expect(res.total).toBe(30);
  });

  it("condiciones del SRD sin efecto en movimiento (p. ej. cegado) tampoco cambian la velocidad", () => {
    expect(effectiveSpeed(30, [{ key: "blinded" }]).total).toBe(30);
    expect(effectiveSpeed(30, [{ key: "frightened" }]).total).toBe(30);
    expect(effectiveSpeed(30, [{ key: "poisoned" }]).total).toBe(30);
  });

  it('el paso base siempre lleva la velocidad de partida, con signo op="base"', () => {
    const res = effectiveSpeed(25, [{ key: "grappled" }]);
    expect(res.steps[0]).toMatchObject({ op: "base", amount: 25 });
  });

  // Migración 6 (D-CF-16) — SRD 5.1, Variant: Encumbrance. La reducción de velocidad se aplica
  // ANTES de que las condiciones actúen sobre el resultado (spec §5 de
  // docs/superpowers/specs/2026-09-02-distancias-y-movimiento-design.md sigue el mismo orden que
  // el SRD dicta implícitamente: primero la sobrecarga cambia la velocidad "de partida", luego
  // una condición la recorta o la anula).
  describe("la sobrecarga (variante SRD 5.1, tercer parámetro opcional)", () => {
    it("sin el parámetro, nada cambia (variante apagada por defecto)", () => {
      expect(effectiveSpeed(30, []).total).toBe(30);
      expect(effectiveSpeed(30, [], null).total).toBe(30);
    });

    it("cargado (encumbered): la velocidad baja 10 pies", () => {
      const res = effectiveSpeed(30, [], "encumbered");
      expect(res.total).toBe(20);
      expect(res.steps.find((s) => s.sourceKey === "encumbrance")).toMatchObject({
        op: "add",
        amount: -10,
        labelKey: "speed.encumbered",
      });
    });

    it("muy cargado (heavily): la velocidad baja 20 pies", () => {
      const res = effectiveSpeed(30, [], "heavily");
      expect(res.total).toBe(10);
      expect(res.steps.find((s) => s.sourceKey === "encumbrance")).toMatchObject({
        op: "add",
        amount: -20,
        labelKey: "speed.heavily-encumbered",
      });
    });

    it("la velocidad no baja de 0 (muy cargado con una base menor que 20)", () => {
      expect(effectiveSpeed(15, [], "heavily").total).toBe(0);
    });

    it("muy cargado Y derribado: la mitad se calcula SOBRE la velocidad ya reducida, no sobre la base", () => {
      // 30 -20 (muy cargado) = 10; derribado la deja a la mitad redondeando hacia abajo: 5.
      // NUNCA 15 (mitad de la base) ni 30 - 20 - 15 (restar dos veces sobre la base).
      const res = effectiveSpeed(30, [{ key: "prone" }], "heavily");
      expect(res.total).toBe(5);
    });

    it("muy cargado Y una condición a 0: sigue en 0", () => {
      expect(effectiveSpeed(30, [{ key: "grappled" }], "heavily").total).toBe(0);
    });
  });
});
