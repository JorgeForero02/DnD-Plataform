import { CONCENTRATION_KEY_PREFIX, concentrationSaveDc, estaConcentrado } from "./concentration";

describe("estaConcentrado", () => {
  it("sin ninguna condición, no está concentrado", () => {
    expect(estaConcentrado([], 0)).toBe(false);
  });

  it("con una condición de concentración vigente, sí", () => {
    expect(estaConcentrado([{ key: "concentrating-on-bless", expiresAtClock: null }], 0)).toBe(
      true,
    );
  });

  it("una condición que no empieza por el prefijo no cuenta, aunque se parezca", () => {
    // Distingue de una implementación que buscara "concentrat" en cualquier parte del texto en
    // vez de al principio de la clave.
    expect(estaConcentrado([{ key: "no-concentrating", expiresAtClock: null }], 0)).toBe(false);
  });

  it("una condición de concentración YA VENCIDA no cuenta", () => {
    expect(estaConcentrado([{ key: "concentrating-on-bless", expiresAtClock: 100 }], 200)).toBe(
      false,
    );
  });

  it("el prefijo exportado es el que de verdad reconoce la función", () => {
    // Sin esto, una implementación podría reconocer un prefijo distinto del que declara y la
    // constante exportada mentiría sobre la clave real.
    expect(
      estaConcentrado([{ key: `${CONCENTRATION_KEY_PREFIX}-x`, expiresAtClock: null }], 0),
    ).toBe(true);
  });

  it("otras condiciones activas, ninguna de concentración, no cuentan", () => {
    expect(
      estaConcentrado(
        [
          { key: "poisoned", expiresAtClock: null },
          { key: "prone", expiresAtClock: null },
        ],
        0,
      ),
    ).toBe(false);
  });
});

describe("concentrationSaveDc — SRD 5.1, «10 o la mitad del daño, lo que sea mayor»", () => {
  it("con poco daño, manda el suelo de 10", () => {
    expect(concentrationSaveDc(6)).toBe(10);
  });

  it("con 25 de daño, la mitad (12, redondeado hacia abajo) ya supera el suelo", () => {
    expect(concentrationSaveDc(25)).toBe(12);
  });

  it("el corte exacto: la mitad igual a 10 no sube de 10", () => {
    expect(concentrationSaveDc(20)).toBe(10);
  });

  it("justo por encima del corte, la mitad ya manda", () => {
    expect(concentrationSaveDc(22)).toBe(11);
  });

  it("redondea hacia abajo, no hacia el más cercano", () => {
    // Distingue de una implementación que redondeara con Math.round: 21/2 = 10.5, y la CD
    // correcta es 10 (floor), no 11 (round).
    expect(concentrationSaveDc(21)).toBe(10);
  });
});
