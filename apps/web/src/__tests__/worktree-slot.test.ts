import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  apiPortForSlot,
  databaseNameForSlot,
  databaseUrlForSlot,
  getWorktreeSlot,
  webPortForSlot,
} from "../../worktree-slot";

// Colocado bajo src/ a propósito: vite.config.ts restringe vitest a `src/**` (los .spec.ts
// junto a los config son de Playwright, otro runner) — un test junto a worktree-slot.ts no
// lo recogería nadie y "parecería" verde sin haber corrido nunca.

describe("getWorktreeSlot", () => {
  // **Se limpia ANTES de cada caso, no solo después.** Solo limpiaba después, así que el caso
  // «sin definir la variable» leía lo que trajera el shell: quien corre `pnpm verify` con
  // `WORKTREE_SLOT=2` exportado —lo que pide `docs/02-entorno.md` para trabajar en paralelo—
  // veía «expected 2 to be +0» y una suite roja **por su propio entorno**, no por el código.
  // Medido el 2026-09-05 en el worktree del plan 04. El valor del shell se devuelve al final,
  // porque este proceso no es solo nuestro.
  const original = process.env.WORKTREE_SLOT;
  beforeEach(() => {
    delete process.env.WORKTREE_SLOT;
  });
  afterAll(() => {
    if (original === undefined) delete process.env.WORKTREE_SLOT;
    else process.env.WORKTREE_SLOT = original;
  });

  it("sin definir la variable, da slot 0", () => {
    expect(getWorktreeSlot()).toBe(0);
  });

  it('cadena vacía, igual que sin definir: slot 0"', () => {
    process.env.WORKTREE_SLOT = "";
    expect(getWorktreeSlot()).toBe(0);
  });

  it('"0" explícito también da slot 0', () => {
    process.env.WORKTREE_SLOT = "0";
    expect(getWorktreeSlot()).toBe(0);
  });

  it("un entero normal se acepta tal cual", () => {
    process.env.WORKTREE_SLOT = "3";
    expect(getWorktreeSlot()).toBe(3);
  });

  it("el límite (20) se acepta", () => {
    process.env.WORKTREE_SLOT = "20";
    expect(getWorktreeSlot()).toBe(20);
  });

  it.each([
    ["un espacio en blanco", " "],
    ["espacios alrededor de un número válido", " 5 "],
    ["notación decimal", ".0"],
    ["hexadecimal", "0x1f"],
    ["notación científica", "1e2"],
    ["un número negativo", "-1"],
    ["texto que no es un número", "abc"],
    ["un slot por encima del límite", "21"],
    ["un número absurdamente grande (integer válido en JS, pero sin sentido aquí)", "1e21"],
  ])("rechaza %s (%p)", (_label, raw) => {
    process.env.WORKTREE_SLOT = raw;
    expect(() => getWorktreeSlot()).toThrow();
  });
});

describe("apiPortForSlot / webPortForSlot", () => {
  it("slot 0 da los puertos de siempre", () => {
    expect(apiPortForSlot(0)).toBe(3000);
    expect(webPortForSlot(0)).toBe(5173);
  });

  it("slot 1 se desplaza 100 en los dos", () => {
    expect(apiPortForSlot(1)).toBe(3100);
    expect(webPortForSlot(1)).toBe(5273);
  });

  it("slot 2 sigue la misma aritmética", () => {
    expect(apiPortForSlot(2)).toBe(3200);
    expect(webPortForSlot(2)).toBe(5373);
  });
});

describe("databaseNameForSlot", () => {
  it('slot 0 es "dnd", sin sufijo', () => {
    expect(databaseNameForSlot(0)).toBe("dnd");
  });

  it("slot N>0 es dnd_wtN", () => {
    expect(databaseNameForSlot(1)).toBe("dnd_wt1");
    expect(databaseNameForSlot(7)).toBe("dnd_wt7");
  });
});

describe("databaseUrlForSlot", () => {
  it("sustituye el nombre de base preservando usuario, contraseña, host y puerto", () => {
    expect(databaseUrlForSlot("postgresql://dnd:dnd@localhost:5432/dnd", 1)).toBe(
      "postgresql://dnd:dnd@localhost:5432/dnd_wt1",
    );
  });

  it("preserva un query string", () => {
    expect(databaseUrlForSlot("postgresql://dnd:dnd@localhost:5432/dnd?schema=public", 1)).toBe(
      "postgresql://dnd:dnd@localhost:5432/dnd_wt1?schema=public",
    );
  });

  it("funciona sin ruta de base previa (host solo)", () => {
    expect(databaseUrlForSlot("postgresql://dnd:dnd@localhost:5432", 1)).toBe(
      "postgresql://dnd:dnd@localhost:5432/dnd_wt1",
    );
  });

  it("slot 0 vuelve a dejarla en dnd, sea cual sea el nombre original", () => {
    expect(databaseUrlForSlot("postgresql://dnd:dnd@localhost:5432/otra_base", 0)).toBe(
      "postgresql://dnd:dnd@localhost:5432/dnd",
    );
  });
});
