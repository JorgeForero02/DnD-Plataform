import { describe, expect, it } from "vitest";
import {
  BANDEJA_VACIA,
  admiteVentaja,
  admiteVentajaEnTexto,
  conDado,
  conModificador,
  esCaraConocida,
  expresionDeBandeja,
  sinDado,
} from "../bandeja";

// Task 10 — **la composición de la bandeja, probada sola.** `BandejaDeDados.tsx` solo llama a
// estas funciones; lo que puede romperse en silencio vive aquí, no en el componente: agrupar
// por caras, el signo del modificador, quitar por índice (no por valor, que confundiría dos
// dados iguales) y cuándo se ofrece ventaja.

describe("expresionDeBandeja", () => {
  it("agrupa por caras en el orden de entrada cuando no hay d20", () => {
    const b = conDado(conDado(BANDEJA_VACIA, 6), 6);
    expect(expresionDeBandeja(b)).toBe("2d6");
  });

  // Round 1 de revisión (IMPORTANT #1) — **el d20 va PRIMERO cuando hay exactamente uno**, sin
  // importar cuándo se pulsó: el servidor solo convierte un `d20` en ventaja/desventaja cuando
  // está al principio de la expresión (`conVentaja`, `apps/api/src/rolls/rolls.service.ts:436`).
  // Componer `2d6+1d20+3` —el orden de entrada, sin más— ofrecería el radio de «Ventaja» sobre
  // una expresión que el servidor tira normal: el defecto que este caso fija.
  it("con exactamente un d20, su grupo va primero aunque se haya pulsado el último", () => {
    let b = conDado(conDado(conDado(BANDEJA_VACIA, 6), 20), 6);
    b = conModificador(b, 3);
    expect(expresionDeBandeja(b)).toBe("1d20+2d6+3");
  });

  it("el caso mínimo del defecto: d6 y luego d20 da 1d20+1d6, no 1d6+1d20", () => {
    expect(expresionDeBandeja(conDado(conDado(BANDEJA_VACIA, 6), 20))).toBe("1d20+1d6");
  });

  it("con dos d20 no se reordena: ninguno de los dos ofrece ventaja por sí solo", () => {
    const b = conDado(conDado(conDado(BANDEJA_VACIA, 6), 20), 20);
    expect(expresionDeBandeja(b)).toBe("1d6+2d20");
  });

  it("un modificador negativo va con su signo y la bandeja vacía es la cadena vacía", () => {
    expect(expresionDeBandeja(conModificador(conDado(BANDEJA_VACIA, 8), -2))).toBe("1d8-2");
    expect(expresionDeBandeja(BANDEJA_VACIA)).toBe("");
  });

  it("un modificador de cero no se escribe: ni +0 ni -0", () => {
    expect(expresionDeBandeja(conDado(BANDEJA_VACIA, 6))).toBe("1d6");
  });

  // Round 1 de revisión (extra pedido) — **sin dados, la cadena vacía, incluso con
  // modificador**: un modificador solo no es una tirada, y dejarlo pasar como `"+3"` sería
  // inventar una expresión que nadie compuso (y que el evaluador del servidor rechazaría igual).
  it("sin dados no hay expresión, ni siquiera con el modificador puesto", () => {
    expect(expresionDeBandeja(conModificador(BANDEJA_VACIA, 3))).toBe("");
    expect(expresionDeBandeja(conModificador(BANDEJA_VACIA, -5))).toBe("");
  });
});

describe("admiteVentajaEnTexto", () => {
  it("un d20 al principio del texto la ofrece, con o sin el 1 explícito", () => {
    expect(admiteVentajaEnTexto("1d20")).toBe(true);
    expect(admiteVentajaEnTexto("d20")).toBe(true);
    expect(admiteVentajaEnTexto("1d20+3")).toBe(true);
  });

  it("un d20 que no abre la expresión no la ofrece — el servidor tampoco la daría", () => {
    expect(admiteVentajaEnTexto("1d6+1d20")).toBe(false);
    expect(admiteVentajaEnTexto("3+1d20")).toBe(false);
  });

  it("un dado de más caras que empieza igual (d200) no cuenta como d20", () => {
    expect(admiteVentajaEnTexto("1d200")).toBe(false);
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

// Revisión final de la rama (2026-09-13) — **la guarda de tipo que separa «se dibuja» de «se
// nombra»**: siete caras conocidas, y cualquier otra (`d3`, `d7`, `d1000` escritas en «Modo
// avanzado») no es un `Caras` y no lleva icono.
describe("esCaraConocida", () => {
  it("acepta exactamente las siete caras de la mesa", () => {
    expect([4, 6, 8, 10, 12, 20, 100].every(esCaraConocida)).toBe(true);
  });

  it("rechaza cualquier otro número, incluidos los que el servidor sí admite tirar", () => {
    expect([1, 2, 3, 7, 30, 1000].some(esCaraConocida)).toBe(false);
  });
});
