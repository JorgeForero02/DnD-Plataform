import { describe, expect, it } from "vitest";
import {
  BANDEJA_VACIA,
  admiteVentaja,
  conDado,
  conModificador,
  expresionDeBandeja,
  sinDado,
} from "../bandeja";

// Task 10 — **la composición de la bandeja, probada sola.** `BandejaDeDados.tsx` solo llama a
// estas cinco funciones; lo que puede romperse en silencio vive aquí, no en el componente:
// agrupar por caras en el orden de entrada, el signo del modificador, quitar por índice (no por
// valor, que confundiría dos dados iguales) y cuándo se ofrece ventaja.

describe("expresionDeBandeja", () => {
  it("compone 2d6+1d20+3 agrupando por caras y respetando el orden de entrada", () => {
    let b = conDado(conDado(conDado(BANDEJA_VACIA, 6), 20), 6);
    b = conModificador(b, 3);
    expect(expresionDeBandeja(b)).toBe("2d6+1d20+3");
  });

  it("un modificador negativo va con su signo y la bandeja vacía es la cadena vacía", () => {
    expect(expresionDeBandeja(conModificador(conDado(BANDEJA_VACIA, 8), -2))).toBe("1d8-2");
    expect(expresionDeBandeja(BANDEJA_VACIA)).toBe("");
  });

  it("un modificador de cero no se escribe: ni +0 ni -0", () => {
    expect(expresionDeBandeja(conDado(BANDEJA_VACIA, 6))).toBe("1d6");
  });
});

describe("conDado / sinDado", () => {
  it("quitar por índice quita ese dado y no otro con las mismas caras", () => {
    const b = sinDado(conDado(conDado(BANDEJA_VACIA, 6), 6), 0);
    expect(b.dados).toEqual([6]);
  });

  it("añadir no toca el modificador ni los demás dados", () => {
    const b = conDado(conModificador(conDado(BANDEJA_VACIA, 20), 5), 6);
    expect(b).toEqual({ dados: [20, 6], modificador: 5 });
  });
});

describe("admiteVentaja", () => {
  it("la ventaja solo se ofrece con exactamente un d20", () => {
    expect(admiteVentaja(conDado(BANDEJA_VACIA, 20))).toBe(true);
    expect(admiteVentaja(conDado(conDado(BANDEJA_VACIA, 20), 20))).toBe(false);
    expect(admiteVentaja(conDado(BANDEJA_VACIA, 6))).toBe(false);
    expect(admiteVentaja(BANDEJA_VACIA)).toBe(false);
  });
});
