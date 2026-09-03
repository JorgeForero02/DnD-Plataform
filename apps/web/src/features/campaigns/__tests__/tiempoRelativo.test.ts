import { describe, it, expect } from "vitest";
import { tiempoRelativo } from "../tiempoRelativo";

// El reloj se pasa por parámetro a propósito: una prueba que dependa de `Date.now()` real
// cambia de resultado a medianoche.
const AHORA = new Date("2026-09-02T12:00:00.000Z").getTime();
const hace = (ms: number) => new Date(AHORA - ms).toISOString();

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

describe("tiempoRelativo", () => {
  it("dice los días en palabras, y «ayer» cuando es uno", () => {
    expect(tiempoRelativo(hace(6 * DIA), AHORA)).toBe("hace 6 días");
    expect(tiempoRelativo(hace(1 * DIA), AHORA)).toBe("ayer");
  });

  it("baja a horas y minutos cuando el hueco es corto", () => {
    expect(tiempoRelativo(hace(3 * HORA), AHORA)).toBe("hace 3 horas");
    expect(tiempoRelativo(hace(5 * MINUTO), AHORA)).toBe("hace 5 minutos");
  });

  it("sube a meses y años cuando el hueco es largo", () => {
    expect(tiempoRelativo(hace(90 * DIA), AHORA)).toBe("hace 3 meses");
    expect(tiempoRelativo(hace(400 * DIA), AHORA)).toBe("el año pasado");
  });

  it("una fecha futura no se escribe con un número negativo", () => {
    const dentro = new Date(AHORA + 2 * DIA).toISOString();
    expect(tiempoRelativo(dentro, AHORA)).toBe("pasado mañana");
  });

  it("una fecha que no se entiende no pinta nada", () => {
    expect(tiempoRelativo("no soy una fecha", AHORA)).toBe("");
  });
});
