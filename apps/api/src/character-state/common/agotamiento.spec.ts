import type { DerivedValue } from "@dnd/shared";
import { maxHpConAgotamiento, nivelDeAgotamiento } from "./agotamiento";

// Tarea 2C.4, hueco H-2C-5. **El nivel 4 de agotamiento parte los PG máximos por la mitad**
// (SRD 5.1: «Hit point maximum halved»). Hasta hoy las condiciones solo alimentaban la velocidad,
// así que una hoja con agotamiento 4 enseñaba unos PG que la regla dice que no tiene.

const maxHp: DerivedValue = {
  key: "maxHp",
  total: 25,
  steps: [
    { op: "base", amount: 10, sourceType: "class", sourceKey: "fighter", labelKey: "hp.hitDie" },
    { op: "add", amount: 15, sourceType: "level", sourceKey: "level", labelKey: "hp.levels" },
  ],
};

describe("nivelDeAgotamiento", () => {
  it("sin agotamiento es 0, y una condición sin nivel no lo inventa", () => {
    expect(nivelDeAgotamiento([])).toBe(0);
    expect(nivelDeAgotamiento([{ key: "poisoned" }])).toBe(0);
    expect(nivelDeAgotamiento([{ key: "exhaustion", level: null }])).toBe(0);
  });

  it("lee el nivel de la condición `exhaustion` y de ninguna otra", () => {
    expect(nivelDeAgotamiento([{ key: "exhaustion", level: 3 }])).toBe(3);
    expect(nivelDeAgotamiento([{ key: "frightened", level: 6 }])).toBe(0);
  });
});

describe("maxHpConAgotamiento", () => {
  it("por debajo del nivel 4 no toca nada, ni siquiera un paso en la traza", () => {
    for (const nivel of [0, 1, 2, 3]) {
      const r = maxHpConAgotamiento(maxHp, nivel);
      expect(r.total).toBe(25);
      expect(r.steps).toHaveLength(2);
    }
  });

  it("**en el nivel 4 los parte por la mitad, redondeando hacia abajo**", () => {
    // 25 con agotamiento 4 son 12, no 13: «halved» en 5.ª edición redondea hacia abajo salvo que
    // la regla diga lo contrario.
    expect(maxHpConAgotamiento(maxHp, 4).total).toBe(12);
  });

  it("y lo dice en la traza, con el delta — no es una resta silenciosa", () => {
    const r = maxHpConAgotamiento(maxHp, 4);
    const ultimo = r.steps[r.steps.length - 1];
    expect(ultimo).toMatchObject({ op: "cap", amount: -13, sourceKey: "exhaustion:4" });
    // La invariante de la traza: los pasos suman el total.
    expect(r.steps.reduce((suma, p) => suma + p.amount, 0)).toBe(12);
  });

  it("**no se acumula por nivel**: en el 5 y el 6 sigue siendo la mitad, no un cuarto", () => {
    // Partirlos otra vez en el 5 sería inventar una regla que la tabla del SRD no tiene.
    expect(maxHpConAgotamiento(maxHp, 5).total).toBe(12);
    expect(maxHpConAgotamiento(maxHp, 6).total).toBe(12);
  });

  it("con 1 PG máximo, la mitad es 0 — y eso es lo que dice la regla, no un mínimo inventado", () => {
    const uno: DerivedValue = { key: "maxHp", total: 1, steps: [] };
    expect(maxHpConAgotamiento(uno, 4).total).toBe(0);
  });
});
