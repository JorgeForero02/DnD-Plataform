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
    expect(acciones.map((a) => [a.id, a.rotulo])).toEqual([
      ["principal", "Equipar"],
      ["sintonizar", "Sintonizado"],
      ["gastar", "Gastar"],
      ["soltar", "Soltar"],
    ]);
    expect(acciones[1].pressed).toBe(true);
    expect(acciones[3].ariaLabel).toBe("Soltar Daga");
    acciones[0].ejecutar();
    expect(manos.onAccionPrincipal).toHaveBeenCalled();
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
