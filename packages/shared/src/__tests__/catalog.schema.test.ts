import { describe, expect, it } from "vitest";
import { srdSpellSchema, spellsCatalogSchema } from "../catalog.schema";

// Tarea 3A.1 (T1). Un conjuro mínimo válido, en la forma exacta que escribe el conversor.
function conjuroMinimo() {
  return {
    key: "fire-bolt",
    nameEn: "Fire Bolt",
    nameEs: "Descarga de fuego",
    sinTraduccion: false,
    level: 0,
    school: "evo" as const,
    castingTime: { coste: "ACTION" as const },
    range: { unidad: "pies" as const, distanciaFt: 120 },
    components: { v: true, s: true, m: false },
    duration: { unidad: "instantanea" as const, concentracion: false },
    ritual: false,
    concentration: false,
    textEn: "You hurl a mote of fire.",
    textEs: "Lanzas una mota de fuego.",
    classes: ["wizard", "sorcerer"],
    actividades: [],
    fueraDeA: [],
    efectosPasivos: 0,
  };
}

describe("srdSpellSchema", () => {
  it("parsea un conjuro mínimo válido", () => {
    expect(() => srdSpellSchema.parse(conjuroMinimo())).not.toThrow();
  });

  it("rechaza un nivel fuera de 0-9", () => {
    expect(() => srdSpellSchema.parse({ ...conjuroMinimo(), level: 10 })).toThrow();
  });

  it("rechaza actividades: [] junto con textEn vacío", () => {
    expect(() =>
      srdSpellSchema.parse({ ...conjuroMinimo(), actividades: [], textEn: "" }),
    ).toThrow();
  });

  it("rechaza una @ de Foundry colada dentro de actividades", () => {
    const conArroba = {
      ...conjuroMinimo(),
      actividades: [
        {
          tipo: "dados",
          activation: { coste: "ACTION" },
          consumption: [],
          effects: [],
          duration: { unidad: "instantanea", concentracion: false },
          dados: { n: 1, caras: 8, signo: -1 as const, bonus: { tipo: "fijo", valor: 0 } },
          // Un campo cualquiera con una fórmula sin traducir, coincidiendo con lo que el
          // conversor NUNCA debe escribir. `description` acepta texto libre, así que basta con
          // colar la arroba ahí para probar el refine sobre el catálogo entero.
          description: "daño = @mod + 2",
        },
      ],
    };
    expect(() => spellsCatalogSchema.parse([conArroba])).toThrow();
  });
});
