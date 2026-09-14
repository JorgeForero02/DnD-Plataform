import { describe, expect, it } from "vitest";
import { awardXpSchema, nivelPorXp, umbralDeNivel, UMBRALES_DE_NIVEL, xpPorVd } from "../xp";

describe("UMBRALES_DE_NIVEL (SRD 5.1, Character Advancement)", () => {
  it("son los 20 umbrales exactos, índice = nivel − 1", () => {
    expect([...UMBRALES_DE_NIVEL]).toEqual([
      0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000,
      165000, 195000, 225000, 265000, 305000, 355000,
    ]);
  });
});

describe("nivelPorXp", () => {
  it("899 → 2, 900 → 3 (el empate sube), 355000 → 20, 999999 → 20", () => {
    expect(nivelPorXp(899)).toBe(2);
    expect(nivelPorXp(900)).toBe(3);
    expect(nivelPorXp(355000)).toBe(20);
    expect(nivelPorXp(999999)).toBe(20);
  });

  it("0 y 299 se quedan en nivel 1; 300 sube a nivel 2", () => {
    expect(nivelPorXp(0)).toBe(1);
    expect(nivelPorXp(299)).toBe(1);
    expect(nivelPorXp(300)).toBe(2);
  });
});

describe("umbralDeNivel", () => {
  it("umbralDeNivel(1) === 0, umbralDeNivel(20) === 355000, umbralDeNivel(21) === null", () => {
    expect(umbralDeNivel(1)).toBe(0);
    expect(umbralDeNivel(20)).toBe(355000);
    expect(umbralDeNivel(21)).toBeNull();
  });

  it("umbralDeNivel(2) === 300", () => {
    expect(umbralDeNivel(2)).toBe(300);
  });
});

describe("xpPorVd (SRD 5.1, Experience Points by Challenge Rating)", () => {
  it("los valores de los cinco primeros escalones y los dos extremos de la tabla", () => {
    expect(xpPorVd(0)).toBe(10);
    expect(xpPorVd(0.125)).toBe(25);
    expect(xpPorVd(0.25)).toBe(50);
    expect(xpPorVd(0.5)).toBe(100);
    expect(xpPorVd(1)).toBe(200);
    expect(xpPorVd(13)).toBe(10000);
    expect(xpPorVd(30)).toBe(155000);
  });

  it("un VD que no está en la tabla (31) lanza RangeError", () => {
    expect(() => xpPorVd(31)).toThrow(RangeError);
  });
});

describe("awardXpSchema", () => {
  it("rechaza amount: 0 y acepta un amount negativo", () => {
    expect(
      awardXpSchema.safeParse({ characterIds: ["clh1234567890123456789012"], amount: 0 }).success,
    ).toBe(false);
    expect(
      awardXpSchema.safeParse({ characterIds: ["clh1234567890123456789012"], amount: -50 }).success,
    ).toBe(true);
  });
});
