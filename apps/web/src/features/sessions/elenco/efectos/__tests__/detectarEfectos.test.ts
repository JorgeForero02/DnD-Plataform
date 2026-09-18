import { describe, expect, it } from "vitest";
import { detectarEfectos, type Instantanea } from "../detectarEfectos";

const base: Instantanea = { hp: 20, max: 20, temp: 0, nivel: 1, estado: "alive", condiciones: [] };

describe("detectarEfectos", () => {
  it("la primera lectura no dispara nada", () => {
    expect(detectarEfectos(null, base)).toEqual([]);
  });
  it("daño: delta negativo; fuerte si se lleva ≥ 25 % del máximo", () => {
    expect(detectarEfectos(base, { ...base, hp: 16 })).toEqual([
      { tipo: "dano", delta: -4, fuerte: false },
    ]);
    expect(detectarEfectos(base, { ...base, hp: 15 })).toEqual([
      { tipo: "dano", delta: -5, fuerte: true },
    ]);
  });
  it("cura y en pie", () => {
    expect(detectarEfectos({ ...base, hp: 0 }, { ...base, hp: 3 })).toEqual([
      { tipo: "cura", delta: 3 },
      { tipo: "en-pie" },
    ]);
  });
  it("temporales solo cuando suben", () => {
    expect(detectarEfectos(base, { ...base, temp: 5 })).toEqual([{ tipo: "temporales", delta: 5 }]);
    expect(detectarEfectos({ ...base, temp: 5 }, { ...base, temp: 2 })).toEqual([]);
  });
  it("cae a 0 sin morir → cae; muere → muerte y no cae", () => {
    expect(detectarEfectos(base, { ...base, hp: 0, estado: "dying" })).toEqual([
      { tipo: "dano", delta: -20, fuerte: true },
      { tipo: "cae" },
    ]);
    expect(detectarEfectos(base, { ...base, hp: 0, estado: "dead" })).toEqual([
      { tipo: "dano", delta: -20, fuerte: true },
      { tipo: "muerte" },
    ]);
  });
  it("nivel solo al subir", () => {
    expect(detectarEfectos(base, { ...base, nivel: 2 })).toEqual([{ tipo: "nivel", nivel: 2 }]);
    expect(detectarEfectos({ ...base, nivel: 2 }, { ...base, nivel: 1 })).toEqual([]);
  });
  it("condición puesta y terminada; una caducada no cuenta como activa", () => {
    const con = { ...base, condiciones: [{ id: "c1", key: "poisoned" }] };
    expect(detectarEfectos(base, con)).toEqual([
      { tipo: "condicion", nombre: "Envenenado", clave: "poisoned" },
    ]);
    expect(detectarEfectos(con, base)).toEqual([
      { tipo: "condicion-termina", nombre: "Envenenado" },
    ]);
    expect(
      detectarEfectos(con, {
        ...base,
        condiciones: [{ id: "c1", key: "poisoned", expired: true }],
      }),
    ).toEqual([{ tipo: "condicion-termina", nombre: "Envenenado" }]);
  });
});
