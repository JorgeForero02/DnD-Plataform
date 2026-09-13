import { BadRequestException } from "@nestjs/common";
import { findClass } from "./catalog";
import { rollExpression } from "../dice/dice";
import {
  comprobarPermitido,
  desgloseDeTirada,
  oroInicialDe,
  pgDeLosNivelesSiguientes,
  validarCaracteristicas,
} from "./table-rules";

const seis = (v: number[]) => ({
  str: v[0],
  dex: v[1],
  con: v[2],
  int: v[3],
  wis: v[4],
  cha: v[5],
});
const fijo = (n: number) => () => n;

describe("validarCaracteristicas", () => {
  it("LIBRE acepta cualquier cosa dentro del rango del esquema", () => {
    expect(() =>
      validarCaracteristicas({ metodo: "LIBRE" }, seis([3, 18, 30, 1, 10, 10])),
    ).not.toThrow();
  });
  it("MATRIZ exige una permutación exacta de 15 14 13 12 10 8", () => {
    expect(() =>
      validarCaracteristicas({ metodo: "MATRIZ" }, seis([8, 10, 12, 13, 14, 15])),
    ).not.toThrow();
    expect(() =>
      validarCaracteristicas({ metodo: "MATRIZ" }, seis([15, 15, 13, 12, 10, 8])),
    ).toThrow(BadRequestException);
  });
  it("PUNTOS: 8..15 y coste ≤ puntos; el mensaje trae el coste calculado", () => {
    expect(() =>
      validarCaracteristicas({ metodo: "PUNTOS", puntos: 27 }, seis([15, 15, 15, 8, 8, 8])),
    ).not.toThrow();
    expect(() =>
      validarCaracteristicas({ metodo: "PUNTOS", puntos: 27 }, seis([15, 15, 15, 9, 8, 8])),
    ).toThrow(/28/);
    expect(() =>
      validarCaracteristicas({ metodo: "PUNTOS", puntos: 27 }, seis([16, 8, 8, 8, 8, 8])),
    ).toThrow(BadRequestException);
  });
  it("DADOS con asignación libre: los seis son una permutación del intento; sin ella, el orden exacto", () => {
    const regla = {
      metodo: "DADOS" as const,
      expresion: "4d6kh3",
      intentos: 1,
      asignacionLibre: true,
    };
    expect(() =>
      validarCaracteristicas(regla, seis([12, 9, 15, 10, 14, 11]), {
        values: [15, 14, 12, 11, 10, 9],
      }),
    ).not.toThrow();
    expect(() =>
      validarCaracteristicas(regla, seis([18, 9, 15, 10, 14, 11]), {
        values: [15, 14, 12, 11, 10, 9],
      }),
    ).toThrow(BadRequestException);
    const enOrden = { ...regla, asignacionLibre: false };
    expect(() =>
      validarCaracteristicas(enOrden, seis([15, 14, 12, 11, 10, 9]), {
        values: [15, 14, 12, 11, 10, 9],
      }),
    ).not.toThrow();
    expect(() =>
      validarCaracteristicas(enOrden, seis([14, 15, 12, 11, 10, 9]), {
        values: [15, 14, 12, 11, 10, 9],
      }),
    ).toThrow(BadRequestException);
  });
  it("DADOS sin intento es 400", () => {
    expect(() =>
      validarCaracteristicas(
        { metodo: "DADOS", expresion: "4d6kh3", intentos: 1, asignacionLibre: true },
        seis([15, 14, 12, 11, 10, 9]),
      ),
    ).toThrow(BadRequestException);
  });
});

describe("comprobarPermitido", () => {
  it("lista vacía = todo; lista con la clave pasa; sin ella, 400 con el nombre legible", () => {
    expect(() => comprobarPermitido([], "wizard", "Mago", "clase")).not.toThrow();
    expect(() => comprobarPermitido(["wizard"], "wizard", "Mago", "clase")).not.toThrow();
    expect(() => comprobarPermitido(["fighter"], "wizard", "Mago", "clase")).toThrow(/Mago/);
  });
});

describe("pgDeLosNivelesSiguientes (SRD 5.1, Beyond 1st Level)", () => {
  it("MEDIA o nivel 1 → null (el motor ya hace la media)", () => {
    expect(pgDeLosNivelesSiguientes(10, 5, "MEDIA")).toBeNull();
    expect(pgDeLosNivelesSiguientes(10, 1, "MAXIMO")).toBeNull();
  });
  it("MAXIMO da el dado entero en cada nivel del 2 al N", () => {
    expect(pgDeLosNivelesSiguientes(10, 4, "MAXIMO")).toEqual({
      valores: [10, 10, 10],
      tiradas: [],
    });
  });
  it("TIRADA tira 1dX por nivel con el tirador dado y devuelve las tiradas para escribirlas", () => {
    const r = pgDeLosNivelesSiguientes(8, 3, "TIRADA", fijo(5));
    expect(r?.valores).toEqual([5, 5]);
    expect(r?.tiradas).toHaveLength(2);
    expect(r?.tiradas[0].expression).toBe("1d8");
  });
});

describe("oroInicialDe (SRD 5.1, Starting Wealth by Class)", () => {
  it("EQUIPO → null; ORO_FIJO → la cantidad; ORO_TABLA → dados de la clase × times", () => {
    const guerrero = findClass({ source: "SRD", key: "fighter" });
    const monje = findClass({ source: "SRD", key: "monk" });
    expect(oroInicialDe({ modo: "EQUIPO" }, guerrero)).toBeNull();
    expect(oroInicialDe({ modo: "ORO_FIJO", cantidadPo: 150 }, guerrero)).toEqual({ gp: 150 });
    expect(oroInicialDe({ modo: "ORO_TABLA" }, guerrero, fijo(4))?.gp).toBe(5 * 4 * 10);
    expect(oroInicialDe({ modo: "ORO_TABLA" }, monje, fijo(4))?.gp).toBe(5 * 4);
    expect(oroInicialDe({ modo: "ORO_TABLA" }, guerrero, fijo(4))?.tirada?.expression).toBe("5d4");
  });
});

describe("desgloseDeTirada (mismo desglose que RollsService.roll, Task 3/4)", () => {
  it("2d6+3 con un tirador fijo en 6: modificador 3 y los dos dados a 6, conservados", () => {
    const resultado = rollExpression("2d6+3", fijo(6));
    const d = desgloseDeTirada(resultado);
    expect(d.expression).toBe("2d6+3");
    expect(d.modifier).toBe(3);
    expect(d.rolls).toEqual([6, 6]);
    expect(d.kept).toEqual([6, 6]);
    expect(d.dropped).toEqual([]);
    expect(d.dice).toHaveLength(2);
    expect(d.dice.every((die) => die.sides === 6 && die.value === 6 && die.kept)).toBe(true);
    expect(d.total).toBe(resultado.total);
  });
});
