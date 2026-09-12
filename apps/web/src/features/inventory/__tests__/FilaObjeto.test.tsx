import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ResolvedItem } from "@dnd/shared";
import type { InventoryRow } from "../api";
import { FilaObjeto } from "../FilaObjeto";

// HP-8 (2026-09-12, opción C del autor) — la pantalla 20 del prototipo (09-06) pone el ESTADO
// «sintonizado» junto al nombre del objeto; la fila solo lo decía en un botón al final. Ahora el
// estado es un distintivo junto al nombre —el mismo patrón que la marca «Sin identificar» de
// esta fila— y el botón dice lo que hace («Desintonizar»). El orden de las acciones no cambia:
// la principal sigue primero (`accionesDeObjeto.ts`).

const anillo = {
  ref: "CAMPAIGN:anillo-1",
  source: "CAMPAIGN",
  kind: "WONDROUS",
  name: "Anillo de protección",
  weightOz: 0,
  effects: [{ kind: "ac", amount: 1 }],
  requiresAttunement: true,
} as unknown as ResolvedItem;

function fila(overrides: Partial<InventoryRow>): InventoryRow {
  return {
    id: "row-1",
    quantity: 1,
    location: "EQUIPPED",
    slot: "RING_1",
    attuned: false,
    storedAt: null,
    note: null,
    item: anillo,
    ...overrides,
  };
}

function montar(row: InventoryRow) {
  return render(
    <ul>
      <FilaObjeto
        row={row}
        onAccionPrincipal={vi.fn()}
        onSoltar={vi.fn()}
        onSintonizar={vi.fn()}
        esDM={false}
        ocupado={false}
      />
    </ul>,
  );
}

describe("FilaObjeto — el estado de sintonización (HP-8)", () => {
  it("sintonizado: distintivo «Sintonizado» junto al nombre y botón «Desintonizar», pulsado", () => {
    montar(fila({ attuned: true }));
    const item = screen.getByRole("listitem");
    // El distintivo vive en el mismo párrafo que el nombre, no en la zona de botones.
    const nombre = within(item).getByText("Anillo de protección");
    expect(within(nombre).getByText("Sintonizado")).toBeInTheDocument();
    const boton = within(item).getByRole("button", { name: "Desintonizar Anillo de protección" });
    expect(boton).toHaveTextContent("Desintonizar");
    expect(boton).toHaveAttribute("aria-pressed", "true");
    // El estado se dice una vez: el distintivo. El botón ya no lo repite.
    expect(within(item).getAllByText(/sintonizado/i)).toHaveLength(1);
  });

  it("sin sintonizar: ningún distintivo y botón «Sintonizar»", () => {
    montar(fila({ attuned: false }));
    const item = screen.getByRole("listitem");
    expect(within(item).queryByText("Sintonizado")).toBeNull();
    const boton = within(item).getByRole("button", { name: "Sintonizar con Anillo de protección" });
    expect(boton).toHaveTextContent("Sintonizar");
    expect(boton).toHaveAttribute("aria-pressed", "false");
  });

  it("el orden de las acciones no cambia: principal primero, sintonizar después", () => {
    montar(fila({ attuned: true }));
    const botones = within(screen.getByRole("listitem"))
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(botones).toEqual(["Quitar", "Desintonizar", "Soltar"]);
  });
});
