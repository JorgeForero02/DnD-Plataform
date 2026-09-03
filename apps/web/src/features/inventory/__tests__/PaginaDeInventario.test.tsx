import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { ResolvedItem } from "@dnd/shared";
import { PaginaDeInventario } from "../PaginaDeInventario";
import * as inventoryApi from "../api";
import type { InventoryResponse, InventoryRow } from "../api";
import { ApiError } from "../../../lib/api";

// Carril B1 — la pantalla de inventario (pantalla 20 del prototipo). Se prueba lo que puede
// romperse en silencio: que las tres zonas pinten lo que les toca, que equipar/quitar mande el
// `PATCH` correcto, que un 400 se enseñe en línea sin borrar nada, que el dinero mande deltas,
// y que ningún valor de enumeración crudo llegue al DOM.

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function nuevoQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function objeto(parcial: Partial<ResolvedItem> & { name: string }): ResolvedItem {
  return {
    ref: `SRD:${parcial.name.toLowerCase().replace(/\s+/g, "-")}`,
    source: "SRD",
    kind: "GEAR",
    weightOz: 16,
    effects: [],
    requiresAttunement: false,
    ...parcial,
  };
}

const anillo = objeto({
  name: "Anillo de protección",
  kind: "OTHER",
  weightOz: 0,
  requiresAttunement: true,
  slot: "RING_1",
  effects: [{ kind: "ac", amount: 1 }],
});

const cuerda = objeto({ name: "Cuerda de seda", kind: "GEAR", weightOz: 40 });

const cofre = objeto({ name: "Cofre con monedas", kind: "OTHER", weightOz: 0 });

function fila(overrides: Partial<InventoryRow>): InventoryRow {
  return {
    id: "row-1",
    quantity: 1,
    location: "CARRIED",
    slot: null,
    attuned: false,
    storedAt: null,
    note: null,
    item: cuerda,
    ...overrides,
  };
}

function respuesta(items: InventoryRow[]): InventoryResponse {
  return {
    items,
    purse: { cp: 32, sp: 15, ep: 0, gp: 200, pp: 0 },
    totalWeightOz: items.reduce((s, r) => s + r.item.weightOz * r.quantity, 0),
    carryCapacityOz: 120 * 16,
  };
}

describe("PaginaDeInventario", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("pinta las tres zonas con lo que les toca, y solo eso", async () => {
    const filas = [
      fila({ id: "eq-1", location: "EQUIPPED", slot: "RING_1", attuned: true, item: anillo }),
      fila({ id: "ca-1", location: "CARRIED", item: cuerda }),
      fila({ id: "st-1", location: "STORED", storedAt: "En la posada", item: cofre }),
    ];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));

    render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });

    expect(await screen.findByText("Anillo de protección")).toBeInTheDocument();
    expect(screen.getByText("Cuerda de seda")).toBeInTheDocument();
    expect(screen.getByText("Cofre con monedas")).toBeInTheDocument();

    // Cada objeto vive en su zona, con la acción que le toca.
    const zonaEquipado = screen.getByText("Equipado").closest("section")!;
    expect(within(zonaEquipado).getByText("Anillo de protección")).toBeInTheDocument();
    expect(within(zonaEquipado).getByRole("button", { name: "Quitar" })).toBeInTheDocument();

    const zonaEncima = screen.getByText("Encima").closest("section")!;
    expect(within(zonaEncima).getByText("Cuerda de seda")).toBeInTheDocument();
    expect(within(zonaEncima).getByRole("button", { name: "Equipar" })).toBeInTheDocument();

    const zonaGuardado = screen.getByText("Guardado").closest("section")!;
    expect(within(zonaGuardado).getByText("Cofre con monedas")).toBeInTheDocument();
    expect(within(zonaGuardado).getByRole("button", { name: "Traer" })).toBeInTheDocument();
  });

  it("pulsar «Equipar» manda el PATCH con location EQUIPPED", async () => {
    const filas = [fila({ id: "ca-1", location: "CARRIED", item: cuerda })];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));
    vi.spyOn(inventoryApi, "fetchAc").mockResolvedValue(14);
    vi.spyOn(inventoryApi, "updateInventoryItem").mockResolvedValue(
      fila({ id: "ca-1", location: "EQUIPPED", item: cuerda }),
    );

    render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });
    fireEvent.click(await screen.findByRole("button", { name: "Equipar" }));

    await waitFor(() =>
      expect(inventoryApi.updateInventoryItem).toHaveBeenCalledWith("c1", "ch1", "ca-1", {
        location: "EQUIPPED",
      }),
    );
  });

  it("pulsar «Quitar» devuelve el objeto a la mochila (location CARRIED)", async () => {
    const filas = [
      fila({ id: "eq-1", location: "EQUIPPED", slot: "RING_1", attuned: true, item: anillo }),
    ];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));
    vi.spyOn(inventoryApi, "fetchAc").mockResolvedValue(14);
    vi.spyOn(inventoryApi, "updateInventoryItem").mockResolvedValue(
      fila({ id: "eq-1", location: "CARRIED", item: anillo }),
    );

    render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });
    fireEvent.click(await screen.findByRole("button", { name: "Quitar" }));

    await waitFor(() =>
      expect(inventoryApi.updateInventoryItem).toHaveBeenCalledWith("c1", "ch1", "eq-1", {
        location: "CARRIED",
      }),
    );
  });

  it("equipar algo que cambia la CA enseña el aviso de confirmación con el antes y el después", async () => {
    const filas = [fila({ id: "ca-1", location: "CARRIED", item: anillo })];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));
    vi.spyOn(inventoryApi, "fetchAc").mockResolvedValueOnce(13).mockResolvedValueOnce(14);
    vi.spyOn(inventoryApi, "updateInventoryItem").mockResolvedValue(
      fila({ id: "ca-1", location: "EQUIPPED", slot: "RING_1", item: anillo }),
    );

    render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });
    fireEvent.click(await screen.findByRole("button", { name: "Equipar" }));

    const aviso = await screen.findByRole("status");
    expect(aviso).toHaveTextContent("Equipaste");
    expect(aviso).toHaveTextContent("Anillo de protección");
    expect(aviso).toHaveTextContent("13");
    expect(aviso).toHaveTextContent("14");
  });

  it("un 400 del servidor al equipar se enseña en línea y no borra la fila", async () => {
    const filas = [fila({ id: "ca-1", location: "CARRIED", item: cuerda })];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));
    vi.spyOn(inventoryApi, "fetchAc").mockResolvedValue(null);
    vi.spyOn(inventoryApi, "updateInventoryItem").mockRejectedValue(
      new ApiError('La ranura ya la ocupa "Otro objeto".', 409),
    );

    render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });
    fireEvent.click(await screen.findByRole("button", { name: "Equipar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("La ranura ya la ocupa");
    // La fila sigue ahí, con su nombre y su botón: nada se borró.
    expect(screen.getByText("Cuerda de seda")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Equipar" })).toBeInTheDocument();
  });

  it("el dinero manda un delta, nunca el total", async () => {
    const filas = [fila({ id: "ca-1", location: "CARRIED", item: cuerda })];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));
    vi.spyOn(inventoryApi, "changeMoney").mockResolvedValue({
      cp: 32,
      sp: 15,
      ep: 0,
      gp: 220,
      pp: 0,
    });

    render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });
    await screen.findByText("Cuerda de seda");

    fireEvent.change(screen.getByLabelText("Cambio de oro"), { target: { value: "20" } });
    // Cada moneda tiene su propio nombre accesible: cinco botones «Aplicar» idénticos no los
    // distingue ni un lector de pantalla ni una prueba de navegador (la suite de Playwright se
    // rompió por eso con «resolved to 6 elements»).
    fireEvent.click(screen.getByRole("button", { name: "Aplicar cambio de oro" }));

    await waitFor(() =>
      expect(inventoryApi.changeMoney).toHaveBeenCalledWith("c1", "ch1", { gp: 20 }),
    );
    // Nunca el total (200) — solo el delta escrito.
    expect(inventoryApi.changeMoney).not.toHaveBeenCalledWith("c1", "ch1", { gp: 220 });
  });

  it("ningún valor de enumeración crudo llega al DOM", async () => {
    const filas = [
      fila({ id: "eq-1", location: "EQUIPPED", slot: "RING_1", attuned: true, item: anillo }),
      fila({ id: "ca-1", location: "CARRIED", item: cuerda }),
      fila({ id: "st-1", location: "STORED", storedAt: "En la posada", item: cofre }),
    ];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));

    const { container } = render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });
    await screen.findByText("Anillo de protección");

    const texto = container.textContent ?? "";
    for (const crudo of [
      "EQUIPPED",
      "CARRIED",
      "STORED",
      "MAIN_HAND",
      "OFF_HAND",
      "RING_1",
      "WEAPON",
      "ARMOR",
      "SHIELD",
      "GEAR",
      "OTHER",
      "SLASHING",
      "PIERCING",
      "cp",
      "gp",
    ]) {
      expect(texto).not.toContain(crudo);
    }
  });
});
