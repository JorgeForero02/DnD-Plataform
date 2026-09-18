import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import type { SpellbookResponse } from "@dnd/shared";
import * as spellbookApi from "../../../spellbook/api";
import { Conjuros } from "../../pestanas/Conjuros";
import { renderPestana, sheet } from "../fixtures/hoja.fixture";

// Tarea 6 (spec 2026-09-11, «la hoja a página completa») — la pestaña `Conjuros`: la tarjeta
// «Espacios de conjuro» (movida tal cual desde `HojaCalculada.tsx`, Task 6 original) y, desde
// 3A.2, el libro de conjuros debajo (`LibroDeConjuros`, con sus propias pruebas en
// `features/spellbook/__tests__/`). `HojaCalculada` solo monta esta pestaña cuando
// `lanzaConjuros(sheet)` es verdad — la prueba de ese filtro es `lanzaConjuros.test.ts`.
//
// `LibroDeConjuros` pide su propio `GET …/spellbook` (`features/spellbook/api.ts`), así que aquí
// se simula igual que `Actividades.test.tsx` simula `api.ts`: por su espacio de nombres.

function respuestaMinima(overrides: Partial<SpellbookResponse> = {}): SpellbookResponse {
  return {
    modelo: "NINGUNO",
    entradas: [],
    topes: {},
    avisos: [],
    espacios: [],
    ...overrides,
  };
}

describe("Conjuros", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("enseña los espacios por nivel con su actual/max real, sin claves", async () => {
    vi.spyOn(spellbookApi, "fetchSpellbook").mockResolvedValue(
      respuestaMinima({ espacios: [{ nivel: 1, actual: 1, max: 2 }] }),
    );
    renderPestana(
      Conjuros,
      { disposicion: "pagina" },
      {
        sheet: {
          ...sheet,
          spellSlots: [{ spellLevel: 1, slots: 2 }],
          spellSlotResetOn: "LONG_REST",
        },
      },
    );
    expect(await screen.findByText("Espacios de conjuro (descanso largo)")).toBeInTheDocument();
    expect(await screen.findByText("Nivel 1: 1 / 2")).toBeInTheDocument();
    expect(screen.queryByText("LONG_REST")).toBeNull();
  });

  it("mientras el libro carga, la casilla del espacio muestra el máximo de la hoja sin trabarse", async () => {
    vi.spyOn(spellbookApi, "fetchSpellbook").mockResolvedValue(respuestaMinima());
    renderPestana(
      Conjuros,
      { disposicion: "pagina" },
      {
        sheet: {
          ...sheet,
          spellSlots: [{ spellLevel: 1, slots: 4 }],
          spellSlotResetOn: "LONG_REST",
        },
      },
    );
    // Antes de que resuelva la consulta del libro, `real` es `undefined` y se pinta `s.slots`
    // (el máximo que ya traía la hoja) COMO TOPE («— / 4», ola de arreglos m-5: un 4 a secas se
    // leía como «quedan 4») — nunca un hueco en blanco.
    expect(await screen.findByText(/Nivel 1: (— \/ 4|\d+ \/ \d+)/)).toBeInTheDocument();
  });

  // Fix round 1 (revisión de Tarea 6, se conserva) — un lanzador SOLO racial (alto elfo guerrero)
  // no tiene espacios: `lanzaConjuros` igual monta esta pestaña (el truco racial cuenta), pero la
  // tarjeta de espacios no debe pintarse vacía diciendo un descanso que el servidor no reconoce.
  it("un truco racial sin espacios no pinta la tarjeta de espacios, solo el libro debajo", async () => {
    vi.spyOn(spellbookApi, "fetchSpellbook").mockResolvedValue(
      respuestaMinima({ modelo: "NINGUNO" }),
    );
    renderPestana(
      Conjuros,
      { disposicion: "pagina" },
      {
        sheet: {
          ...sheet,
          spellSlots: [],
          spellSlotResetOn: "NONE",
          features: [{ sourceKey: "high-elf", labelKey: "subrace.elfHigh.cantrip", name: "Truco" }],
        },
      },
    );
    expect(screen.queryByText(/Espacios de conjuro/)).toBeNull();
    expect(await screen.findByText("Esta clase no lanza conjuros")).toBeInTheDocument();
  });
});
