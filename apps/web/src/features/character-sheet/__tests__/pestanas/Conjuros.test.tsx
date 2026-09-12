import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { Conjuros } from "../../pestanas/Conjuros";
import { renderPestana, sheet } from "../fixtures/hoja.fixture";

// Tarea 6 (spec 2026-09-11, «la hoja a página completa») — la pestaña `Conjuros`: hoy solo sabe
// cuántos espacios tiene el personaje (la tarjeta que vivía suelta en `HojaCalculada.tsx`, movida
// tal cual) y dice que la lista de conjuros llega con el paso 3. `HojaCalculada` solo la monta
// cuando `lanzaConjuros(sheet)` es verdad — la prueba de ese filtro es `lanzaConjuros.test.ts`.

describe("Conjuros", () => {
  it("enseña los espacios por nivel y dice que la lista llega con el paso 3, sin claves", async () => {
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
    expect(screen.getByText("Nivel 1: 2")).toBeInTheDocument();
    expect(screen.getByText("Los conjuros llegan con el paso 3")).toBeInTheDocument();
    expect(screen.queryByText("LONG_REST")).toBeNull();
  });
});
