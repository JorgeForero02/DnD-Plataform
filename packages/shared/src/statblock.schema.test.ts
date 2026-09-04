import { describe, expect, it } from "vitest";
import { damageModifierSchema, statblockSchema } from "./index";

// Capa 1 de `docs/08-pruebas.md`. Tarea 2.5.1 — la resistencia estructurada, al lado de la
// prosa que ya existía.

const statblockMinimo = {
  ref: "SRD:skeleton",
  source: "SRD" as const,
  name: "Esqueleto",
  size: "MEDIUM" as const,
  type: "UNDEAD" as const,
  ac: 13,
  hitDiceCount: 2,
  abilities: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 },
  cr: 0.25,
};

describe("statblockSchema — damageModifiers", () => {
  it("un statblock sin damageModifiers deja el campo sin definir, no una lista inventada", () => {
    // Deliberadamente `.optional()` y no `.default([])`: ver el comentario de
    // `damageModifiersSchema`. Quien lo consulta trata la ausencia como ninguna resistencia.
    const r = statblockSchema.parse(statblockMinimo);
    expect(r.damageModifiers).toBeUndefined();
  });

  it("acepta un modificador limpio, sin nota", () => {
    const r = statblockSchema.parse({
      ...statblockMinimo,
      damageModifiers: [{ damageType: "POISON", effect: "IMMUNE" }],
    });
    expect(r.damageModifiers).toEqual([{ damageType: "POISON", effect: "IMMUNE" }]);
  });

  it("acepta un modificador con la nota que limita la regla (el caso del tumulario)", () => {
    const r = damageModifierSchema.safeParse({
      damageType: "BLUDGEONING",
      effect: "RESIST",
      note: "de ataques no mágicos con armas que no sean de plata",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza un effect que no es de los tres cerrados", () => {
    const r = damageModifierSchema.safeParse({ damageType: "FIRE", effect: "ABSORB" });
    expect(r.success).toBe(false);
  });

  it("rechaza un damageType que no es de los trece del SRD", () => {
    const r = damageModifierSchema.safeParse({ damageType: "HOLY", effect: "RESIST" });
    expect(r.success).toBe(false);
  });
});
