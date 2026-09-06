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

const espada = objeto({
  name: "Espada larga",
  kind: "WEAPON",
  weightOz: 48,
  weapon: {
    category: "MARTIAL",
    range: "MELEE",
    damageDice: "1d8",
    damageType: "SLASHING",
    properties: ["VERSATILE"],
    versatileDice: "1d10",
  },
});

const coraza = objeto({
  name: "Cota de mallas",
  kind: "ARMOR",
  weightOz: 880,
  armor: {
    category: "HEAVY",
    baseAc: 16,
    dexCap: 0,
    strengthRequirement: 13,
    stealthDisadvantage: true,
  },
});

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
    // El barrido solo demuestra algo si el fixture trae un arma y una armadura equipadas: sin
    // ellas, "WEAPON", "SLASHING" o "MAIN_HAND" no podrían aparecer aunque el código las pintara
    // crudas, y la prueba pasaría sin comprobar nada.
    const filas = [
      fila({ id: "eq-1", location: "EQUIPPED", slot: "RING_1", attuned: true, item: anillo }),
      fila({ id: "ca-1", location: "CARRIED", item: cuerda }),
      fila({ id: "st-1", location: "STORED", storedAt: "En la posada", item: cofre }),
      fila({ id: "eq-2", location: "EQUIPPED", slot: "MAIN_HAND", item: espada }),
      fila({ id: "eq-3", location: "EQUIPPED", slot: "ARMOR", item: coraza }),
    ];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));

    const { container } = render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });
    await screen.findByText("Anillo de protección");
    await screen.findByText("Espada larga");
    await screen.findByText("Cota de mallas");

    // `container.textContent` y no `queryByText`: `queryByText` casa por elemento entero, así
    // que una cadena cruda mezclada dentro de un nodo con más texto ("1d8 cort.") no la vería.
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
      "MARTIAL",
      "MELEE",
      "VERSATILE",
      "HEAVY",
      "cp",
      "gp",
    ]) {
      expect(texto).not.toContain(crudo);
    }
  });

  it("pulsar «Soltar» no borra nada todavía: enseña la confirmación en pantalla", async () => {
    // Regla vinculante (docs/04-convenciones.md): lo irreversible va detrás de un botón, nunca
    // con `window.confirm`. Un `spy` en `window.confirm` que nunca se llama sería la prueba de
    // que este comportamiento sigue así.
    const confirmSpy = vi.spyOn(window, "confirm");
    const filas = [fila({ id: "ca-1", location: "CARRIED", item: cuerda })];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));
    const removerSpy = vi.spyOn(inventoryApi, "removeInventoryItem");

    render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });
    fireEvent.click(await screen.findByRole("button", { name: "Soltar Cuerda de seda" }));

    const dialogo = await screen.findByRole("dialog", { name: "Soltar objeto" });
    expect(within(dialogo).getByText("Cuerda de seda")).toBeInTheDocument();
    // Nada desapareció de la fila de detrás: el diálogo se suma, no sustituye.
    expect(screen.getByRole("button", { name: "Soltar Cuerda de seda" })).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(removerSpy).not.toHaveBeenCalled();
  });

  it("confirmar «Soltar» llama a removeInventoryItem con el id de esa fila, no el de otra", async () => {
    const filas = [
      fila({ id: "ca-1", location: "CARRIED", item: cuerda }),
      fila({ id: "ca-2", location: "CARRIED", item: cofre }),
    ];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));
    vi.spyOn(inventoryApi, "removeInventoryItem").mockResolvedValue({ deleted: true });

    render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });
    await screen.findByText("Cuerda de seda");
    // La fila del cofre, no la de la cuerda: si `onSoltar` cablease el id equivocado, este caso
    // lo pillaría y "pulsar Soltar en la primera fila" no.
    fireEvent.click(screen.getByRole("button", { name: "Soltar Cofre con monedas" }));
    fireEvent.click(await screen.findByRole("button", { name: "Soltarlo" }));

    await waitFor(() =>
      expect(inventoryApi.removeInventoryItem).toHaveBeenCalledWith("c1", "ch1", "ca-2"),
    );
    expect(inventoryApi.removeInventoryItem).not.toHaveBeenCalledWith("c1", "ch1", "ca-1");
  });

  it("cancelar «Soltar» no llama a nada", async () => {
    const filas = [fila({ id: "ca-1", location: "CARRIED", item: cuerda })];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));
    const removerSpy = vi.spyOn(inventoryApi, "removeInventoryItem");

    render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });
    fireEvent.click(await screen.findByRole("button", { name: "Soltar Cuerda de seda" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Soltar objeto" })).not.toBeInTheDocument(),
    );
    expect(removerSpy).not.toHaveBeenCalled();
  });

  it("gastar una unidad llama al servidor con la fila correcta, y solo se ofrece donde tiene sentido", async () => {
    vi.spyOn(inventoryApi, "consumeInventoryItem").mockResolvedValue({
      remaining: 1,
      deleted: false,
    });
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(
      respuesta([
        fila({ id: "ca-1", location: "CARRIED", item: cuerda }),
        fila({ id: "eq-2", location: "EQUIPPED", slot: "MAIN_HAND", item: espada }),
      ]),
    );
    render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });
    await screen.findByText("Cuerda de seda");

    // La cuerda es equipo: se gasta. Una espada equipada no —gastar una espada no significa nada.
    fireEvent.click(screen.getByRole("button", { name: /Gastar una unidad de Cuerda de seda/ }));

    await waitFor(() =>
      expect(inventoryApi.consumeInventoryItem).toHaveBeenCalledWith("c1", "ch1", "ca-1", 1),
    );
    expect(
      screen.queryByRole("button", { name: /Gastar una unidad de Espada larga/ }),
    ).not.toBeInTheDocument();
  });
});

describe("pelear con dos armas (paso 1, tarea 11)", () => {
  // **La pantalla no mandaba `slot` al equipar**: grep de `slot` en `PaginaDeInventario` daba
  // cero. El servidor lo acepta desde 2B y el motor lo usa —`rules/attacks.ts` mira `OFF_HAND`
  // para la mano ocupada y para el arma ligera de la izquierda—, así que **un pícaro con dos
  // dagas no existía**.
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const daga = objeto({
    name: "Daga",
    kind: "WEAPON",
    weightOz: 16,
    weapon: {
      category: "SIMPLE",
      range: "MELEE",
      damageDice: "1d4",
      damageType: "PIERCING",
      properties: ["FINESSE", "LIGHT"],
    },
  });

  const espadon = objeto({
    name: "Espadón",
    kind: "WEAPON",
    weightOz: 96,
    weapon: {
      category: "MARTIAL",
      range: "MELEE",
      damageDice: "2d6",
      damageType: "SLASHING",
      properties: ["HEAVY", "TWO_HANDED"],
    },
  });

  it("equipar un arma pide la mano y manda el slot", async () => {
    const filas = [fila({ id: "ca-daga", location: "CARRIED", item: daga })];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));
    vi.spyOn(inventoryApi, "fetchAc").mockResolvedValue(14);
    vi.spyOn(inventoryApi, "updateInventoryItem").mockResolvedValue(
      fila({ id: "ca-daga", location: "EQUIPPED", slot: "OFF_HAND", item: daga }),
    );

    render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });
    fireEvent.click(await screen.findByRole("button", { name: "Equipar" }));
    fireEvent.click(screen.getByRole("radio", { name: "Mano izquierda" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() =>
      expect(inventoryApi.updateInventoryItem).toHaveBeenCalledWith("c1", "ch1", "ca-daga", {
        location: "EQUIPPED",
        slot: "OFF_HAND",
      }),
    );
  });

  it("un arma a dos manos no ofrece la izquierda, y DICE por qué", async () => {
    const filas = [fila({ id: "ca-esp", location: "CARRIED", item: espadon })];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));
    vi.spyOn(inventoryApi, "fetchAc").mockResolvedValue(14);

    render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });
    fireEvent.click(await screen.findByRole("button", { name: "Equipar" }));

    expect(screen.queryByRole("radio", { name: "Mano izquierda" })).not.toBeInTheDocument();
    // **El motivo se escribe.** Un control que desaparece sin explicación es la peor versión de
    // decir que no.
    expect(screen.getByText(/ocupa las dos manos/i)).toBeInTheDocument();
  });

  it("lo que no es un arma se equipa sin preguntar nada", async () => {
    // Preguntar la mano para una armadura sería un paso que no decide nada.
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
});
