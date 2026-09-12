import { describe, expect, it, vi } from "vitest";
import type { InventoryRow } from "../api";
import { accionesDeObjeto } from "../accionesDeObjeto";

const fila = (extra: Partial<InventoryRow> = {}): InventoryRow => ({
  id: "r1",
  quantity: 1,
  location: "CARRIED",
  slot: null,
  attuned: false,
  storedAt: null,
  note: null,
  item: { name: "Daga", requiresAttunement: false } as InventoryRow["item"],
  ...extra,
});

describe("accionesDeObjeto", () => {
  it("ofrece principal, sintonizar (si procede), gastar (si procede) y soltar, en ese orden y con los textos de siempre", () => {
    const manos = {
      onAccionPrincipal: vi.fn(),
      onSoltar: vi.fn(),
      onGastar: vi.fn(),
      onSintonizar: vi.fn(),
    };
    const acciones = accionesDeObjeto(fila({ attuned: true }), manos);
    // HP-8 (2026-09-12, opción C del autor): el rótulo del objeto ya sintonizado pasa de
    // «Sintonizado» a «Desintonizar». **Es un cambio declarado del rótulo, no un aflojamiento**:
    // el estado lo pinta ahora un distintivo junto al nombre (`FilaObjeto`, `DetalleDeObjeto`) y
    // el botón dice lo que hace, como su `aria-label` decía desde el principio. El orden no cambia.
    expect(acciones.map((a) => [a.id, a.rotulo])).toEqual([
      ["principal", "Equipar"],
      ["sintonizar", "Desintonizar"],
      ["gastar", "Gastar"],
      ["soltar", "Soltar"],
    ]);
    // Sin `pressed` (ronda 2): el conmutador de la APG es rótulo fijo + `aria-pressed`; aquí el
    // rótulo cambia y el estado va en el distintivo, así que el estado lo dice el par de rótulos.
    expect(acciones[1]).not.toHaveProperty("pressed");
    expect(acciones[1].ariaLabel).toBe("Desintonizar Daga");
    expect(acciones[3].ariaLabel).toBe("Soltar Daga");
    acciones[0].ejecutar();
    expect(manos.onAccionPrincipal).toHaveBeenCalled();
  });

  it("sin sintonizar, el botón dice «Sintonizar» y no va pulsado", () => {
    const acciones = accionesDeObjeto(fila({ attuned: false }), {
      onAccionPrincipal: vi.fn(),
      onSoltar: vi.fn(),
      onSintonizar: vi.fn(),
    });
    expect(acciones[1].rotulo).toBe("Sintonizar");
    expect(acciones[1]).not.toHaveProperty("pressed");
    expect(acciones[1].ariaLabel).toBe("Sintonizar con Daga");
  });

  it("sin manos opcionales, solo principal y soltar", () => {
    const acciones = accionesDeObjeto(fila({ location: "EQUIPPED" }), {
      onAccionPrincipal: vi.fn(),
      onSoltar: vi.fn(),
    });
    expect(acciones.map((a) => a.id)).toEqual(["principal", "soltar"]);
    expect(acciones[0].rotulo).toBe("Quitar");
  });
});
