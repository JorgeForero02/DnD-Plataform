import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ResolvedItem } from "@dnd/shared";
import type { InventoryRow } from "../api";
import { accionesDeObjeto } from "../accionesDeObjeto";
import { DetalleDeObjeto } from "../DetalleDeObjeto";

// Tarea 9 (spec 2026-09-11, «la hoja a página completa») — el panel de detalle de la pestaña
// Objetos a página. Lo que defiende: que enseña lo que la fila no cabe a enseñar (descripción,
// sintonización, peso unitario), que **ofrece las mismas acciones que la fila** —la lista viene
// de `accionesDeObjeto`, un solo sitio— y que ningún valor de enumeración llega al DOM.

const espadaMagica: ResolvedItem = {
  ref: "CAMPAIGN:espada-larga-1",
  source: "CAMPAIGN",
  kind: "WEAPON",
  name: "Espada larga +1",
  weightOz: 48,
  effects: [],
  requiresAttunement: false,
  weapon: {
    category: "MARTIAL",
    range: "MELEE",
    damageDice: "1d8",
    damageType: "SLASHING",
    properties: ["VERSATILE"],
    versatileDice: "1d10",
  },
};

function fila(overrides: Partial<InventoryRow>): InventoryRow {
  return {
    id: "row-1",
    quantity: 1,
    location: "CARRIED",
    slot: null,
    attuned: false,
    storedAt: null,
    note: null,
    item: espadaMagica,
    ...overrides,
  };
}

describe("DetalleDeObjeto", () => {
  it("enseña nombre, tipo, daño, peso, sintonización y descripción, y las mismas acciones que la fila", () => {
    const manos = { onAccionPrincipal: vi.fn(), onSoltar: vi.fn(), onSintonizar: vi.fn() };
    const row = fila({
      item: { ...espadaMagica, description: "Una hoja que zumba.", requiresAttunement: true },
    });
    render(<DetalleDeObjeto row={row} acciones={accionesDeObjeto(row, manos)} esDM={false} />);
    const panel = screen.getByRole("complementary", { name: "detalle del objeto" });
    expect(within(panel).getByText("Espada larga +1")).toBeInTheDocument();
    expect(within(panel).getByText("Una hoja que zumba.")).toBeInTheDocument();
    expect(within(panel).getByText(/requiere sintonización/i)).toBeInTheDocument();
    expect(
      within(panel)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["Equipar", "Sintonizar", "Soltar"]);
    expect(within(panel).queryByText("CARRIED")).toBeNull();
  });

  it("con dos unidades enseña el peso unitario y el total, y el dato en cifras", () => {
    const row = fila({ quantity: 2 });
    render(
      <DetalleDeObjeto
        row={row}
        acciones={accionesDeObjeto(row, { onAccionPrincipal: vi.fn(), onSoltar: vi.fn() })}
        esDM={false}
      />,
    );
    const panel = screen.getByRole("complementary", { name: "detalle del objeto" });
    expect(within(panel).getByText("1d8 cort.")).toBeInTheDocument();
    expect(within(panel).getByText("1.4 kg")).toBeInTheDocument();
    expect(within(panel).getByText("2.7 kg")).toBeInTheDocument();
    expect(within(panel).queryByText(/requiere sintonización/i)).toBeNull();
    expect(within(panel).queryByText("WEAPON")).toBeNull();
  });

  it("sin fila, invita a elegir una", () => {
    render(<DetalleDeObjeto row={null} acciones={[]} esDM={false} />);
    const panel = screen.getByRole("complementary", { name: "detalle del objeto" });
    expect(within(panel).getByText("Elige un objeto")).toBeInTheDocument();
    expect(within(panel).queryAllByRole("button")).toEqual([]);
  });
});
