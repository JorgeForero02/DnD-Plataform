import { describe, expect, it } from "vitest";
import { fechaCorta, fechaLarga } from "../fechas";

// Task 7 (2026-09-19) — se comprobó a mano que el Node de este proyecto SÍ da salida en español
// para `toLocaleDateString("es-ES", …)` (a diferencia de `toLocaleString` sobre un número, que
// pierde el agrupado de miles bajo ICU pequeño). Por si el entorno que corra esto algún día
// resolviera otro locale, las aserciones solo miran lo que la regla de negocio promete —la
// presencia o ausencia del año—, no el nombre exacto del día de la semana.

describe("fechaCorta", () => {
  it("sin año cuando la fecha es del año en curso", () => {
    const esteAno = new Date().getFullYear();
    const resultado = fechaCorta(new Date(esteAno, 8, 19));
    expect(resultado).not.toContain(String(esteAno));
  });

  it("con año cuando la fecha NO es del año en curso", () => {
    const resultado = fechaCorta(new Date(2020, 2, 1));
    expect(resultado).toContain("2020");
  });
});

describe("fechaLarga", () => {
  it("siempre lleva el año, sea del año en curso o no", () => {
    const esteAno = new Date().getFullYear();
    expect(fechaLarga(new Date(esteAno, 8, 19))).toContain(String(esteAno));
    expect(fechaLarga(new Date(2020, 2, 1))).toContain("2020");
  });

  it("acepta un ISO en cadena, igual que un Date", () => {
    expect(fechaLarga("2020-03-01T20:00:00.000Z")).toContain("2020");
  });
});
