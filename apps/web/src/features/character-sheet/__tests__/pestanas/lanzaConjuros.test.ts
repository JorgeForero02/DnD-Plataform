import { describe, expect, it } from "vitest";
import { lanzaConjuros } from "../../pestanas/lanzaConjuros";
import type { CalculatedSheet } from "../../api";

// Tarea 6 (spec 2026-09-11, «la hoja a página completa») — `lanzaConjuros` decide si la pestaña
// `Conjuros` tiene algo que enseñar. Sin espacios y sin ningún rasgo de conjuro (de clase o
// racial), un personaje no lanza nada y la pestaña no se monta (ver `HojaCalculada.tsx`).

const base = { spellSlots: [], features: [] } as unknown as CalculatedSheet;

describe("lanzaConjuros", () => {
  it("un guerrero sin espacios ni truco racial no lanza", () => {
    expect(lanzaConjuros(base)).toBe(false);
  });

  it("espacios de conjuro = lanza", () => {
    expect(lanzaConjuros({ ...base, spellSlots: [{ spellLevel: 1, slots: 2 }] })).toBe(true);
  });

  it("un truco racial sin espacios = lanza (alto elfo guerrero)", () => {
    expect(
      lanzaConjuros({
        ...base,
        features: [{ sourceKey: "high-elf", labelKey: "subrace.elfHigh.cantrip", name: "Truco" }],
      }),
    ).toBe(true);
  });
});
