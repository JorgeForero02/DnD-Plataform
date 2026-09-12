import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { InventoryItemRow, ResolvedItem } from "@dnd/shared";
import { PaginaDeInventario } from "../PaginaDeInventario";
import * as inventoryApi from "../api";
import type { InventoryResponse, InventoryRow } from "../api";
import { ApiError } from "../../../lib/api";
import * as members from "../../campaigns/members";

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

/**
 * La fila cruda que devuelve el `PATCH` (M2B-11): `{ item, ac }`, no la fila resuelta contra el
 * catálogo que devuelve el listado — `item` aquí es `InventoryItemRow`, sin `item.item`.
 */
function filaCruda(overrides: Partial<InventoryItemRow> = {}): InventoryItemRow {
  return {
    id: "row-1",
    characterId: "ch1",
    quantity: 1,
    location: "CARRIED",
    slot: null,
    attuned: false,
    storedAt: null,
    note: null,
    identified: true,
    unidentifiedName: null,
    ...overrides,
  };
}

function respuesta(items: InventoryRow[]): InventoryResponse {
  return {
    items,
    purse: { cp: 32, sp: 15, ep: 0, gp: 200, pp: 0 },
    totalWeightOz: items.reduce((s, r) => s + r.item.weightOz * r.quantity, 0),
    carryCapacityOz: 120 * 16,
    // Fix round 1 (BAJA-1): la variante de sobrecarga no es lo que esta suite prueba; `null`
    // (apagada) es el valor por defecto de una campaña real y el que `PanelCarga.test.tsx`
    // ya cubre a fondo por su cuenta.
    encumbrance: null,
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
    // Por rol y no por texto: la ficha de filtro «Equipado» (tarea 9) es un botón con el mismo
    // texto; el rótulo de la zona es el único encabezado que empieza así.
    const zonaEquipado = screen.getByRole("heading", { name: /^Equipado\b/ }).closest("section")!;
    expect(within(zonaEquipado).getByText("Anillo de protección")).toBeInTheDocument();
    expect(within(zonaEquipado).getByRole("button", { name: "Quitar" })).toBeInTheDocument();

    const zonaEncima = screen.getByRole("heading", { name: /^Encima\b/ }).closest("section")!;
    expect(within(zonaEncima).getByText("Cuerda de seda")).toBeInTheDocument();
    expect(within(zonaEncima).getByRole("button", { name: "Equipar" })).toBeInTheDocument();

    const zonaGuardado = screen.getByRole("heading", { name: /^Guardado\b/ }).closest("section")!;
    expect(within(zonaGuardado).getByText("Cofre con monedas")).toBeInTheDocument();
    expect(within(zonaGuardado).getByRole("button", { name: "Traer" })).toBeInTheDocument();
  });

  it("pulsar «Equipar» manda el PATCH con location EQUIPPED", async () => {
    const filas = [fila({ id: "ca-1", location: "CARRIED", item: cuerda })];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));
    // M2B-11: el `PATCH` ya trae las dos CA en `{ item, acBefore, ac }` — no hay `fetchAc` que
    // espiar, porque ya no existe (se borró con el segundo viaje que sustituye).
    vi.spyOn(inventoryApi, "updateInventoryItem").mockResolvedValue({
      item: filaCruda({ id: "ca-1", location: "EQUIPPED" }),
      acBefore: 12,
      ac: 14,
    });

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
    vi.spyOn(inventoryApi, "updateInventoryItem").mockResolvedValue({
      item: filaCruda({ id: "eq-1", location: "CARRIED" }),
      acBefore: 16,
      ac: 14,
    });

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
    // Fix de ronda 1 (Q-2): las dos mitades del aviso viajan en la respuesta del `PATCH`
    // (`acBefore` y `ac`) — **sin nada en la caché de la hoja**. Es justo el caso que rompía en
    // «Tu bolsa» desde la mesa: esa pantalla monta el inventario sin haber cargado la hoja antes,
    // así que si el aviso dependiera de esa caché (como en la primera versión de esta ficha)
    // desaparecería en silencio. Aquí no hay `qc.setQueryData` de ningún tipo — si el aviso
    // aparece, es porque vino todo en la respuesta.
    vi.spyOn(inventoryApi, "updateInventoryItem").mockResolvedValue({
      item: filaCruda({ id: "ca-1", location: "EQUIPPED", slot: "RING_1" }),
      acBefore: 13,
      ac: 14,
    });

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
    vi.spyOn(inventoryApi, "updateInventoryItem").mockResolvedValue({
      item: filaCruda({ id: "ca-daga", location: "EQUIPPED", slot: "OFF_HAND" }),
      acBefore: 12,
      ac: 14,
    });

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
    vi.spyOn(inventoryApi, "updateInventoryItem").mockResolvedValue({
      item: filaCruda({ id: "ca-1", location: "EQUIPPED" }),
      acBefore: 12,
      ac: 14,
    });

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

// D-CF-15 (migración 7) — «lo tengo pero no sé qué es». Lo que estas dos pruebas defienden no es
// la redacción en sí —eso ya lo prueba `inventory.service.spec.ts` contra el servidor— sino que
// la pantalla **pinta lo que llega y no reconstruye el nombre real por su cuenta**, y que el
// control del DM solo aparece para quien de verdad puede usarlo.
describe("PaginaDeInventario — identificación (D-CF-15)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  /** Lo que el SERVIDOR manda a un jugador: `name` ya sustituido, sin `unidentifiedName`. */
  const anilloParaElJugador = objeto({
    name: "Anillo de aspecto extraño",
    kind: "OTHER",
    weightOz: 0,
    requiresAttunement: true,
    slot: "RING_1",
    effects: [{ kind: "ac", amount: 1 }],
    identified: false,
  });

  /** Lo que el SERVIDOR manda al DM: `name` real, más el estado y el alias sueltos. */
  const anilloParaElDM = objeto({
    name: "Anillo de protección",
    kind: "OTHER",
    weightOz: 0,
    requiresAttunement: true,
    slot: "RING_1",
    effects: [{ kind: "ac", amount: 1 }],
    identified: false,
    unidentifiedName: "Anillo de aspecto extraño",
  });

  it("el jugador ve el alias que ya trae la fila, y «Anillo de protección» no aparece en el DOM", async () => {
    vi.spyOn(members, "useMyRole").mockReturnValue({
      role: "PLAYER",
      isLoading: false,
      isError: false,
      retry: () => {},
    });
    const filas = [fila({ id: "eq-1", location: "EQUIPPED", item: anilloParaElJugador })];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));

    render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });

    expect(await screen.findByText("Anillo de aspecto extraño")).toBeInTheDocument();
    expect(screen.getByText("Sin identificar")).toBeInTheDocument();
    expect(screen.queryByText("Anillo de protección")).not.toBeInTheDocument();
    // Ningún control de identificación: esconder el botón no es el control de acceso, pero
    // tampoco hay motivo para ofrecerlo a quien el servidor rechazaría con 403.
    expect(screen.queryByRole("checkbox", { name: /Sin identificar/i })).not.toBeInTheDocument();
  });

  it("el DM ve el nombre real, el estado y el control para identificarlo", async () => {
    vi.spyOn(members, "useMyRole").mockReturnValue({
      role: "DM",
      isLoading: false,
      isError: false,
      retry: () => {},
    });
    const filas = [fila({ id: "eq-1", location: "EQUIPPED", item: anilloParaElDM })];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));
    vi.spyOn(inventoryApi, "updateInventoryItem").mockResolvedValue({
      item: filaCruda({ id: "eq-1", identified: true, unidentifiedName: null }),
      acBefore: 12,
      ac: 12,
    });

    render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });

    expect(await screen.findByText("Anillo de protección")).toBeInTheDocument();
    const casilla = screen.getByRole("checkbox", { name: "Sin identificar" });
    expect(casilla).toBeChecked();

    fireEvent.click(casilla);

    await waitFor(() =>
      expect(inventoryApi.updateInventoryItem).toHaveBeenCalledWith("c1", "ch1", "eq-1", {
        identified: true,
      }),
    );
  });

  // Fix round 1 (B9/B10) — el campo de alias no tenía ninguna prueba propia, y el `PATCH` que
  // manda al perder el foco tenía que compararse contra lo que la fila YA trae antes de
  // escribir nada.
  it("fix round 1 (B10): el DM cambia el alias y el `PATCH` sale al perder el foco, con el valor nuevo", async () => {
    vi.spyOn(members, "useMyRole").mockReturnValue({
      role: "DM",
      isLoading: false,
      isError: false,
      retry: () => {},
    });
    const filas = [fila({ id: "eq-1", location: "EQUIPPED", item: anilloParaElDM })];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));
    vi.spyOn(inventoryApi, "updateInventoryItem").mockResolvedValue({
      item: filaCruda({
        id: "eq-1",
        identified: false,
        unidentifiedName: "Anillo de aire caliente",
      }),
      acBefore: 12,
      ac: 12,
    });

    render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });

    const alias = await screen.findByLabelText(/Alias de Anillo de protección/);
    fireEvent.change(alias, { target: { value: "Anillo de aire caliente" } });
    fireEvent.blur(alias);

    await waitFor(() =>
      expect(inventoryApi.updateInventoryItem).toHaveBeenCalledWith("c1", "ch1", "eq-1", {
        unidentifiedName: "Anillo de aire caliente",
      }),
    );
  });

  it("fix round 1 (B10): perder el foco SIN cambiar el alias no manda ningún `PATCH`", async () => {
    vi.spyOn(members, "useMyRole").mockReturnValue({
      role: "DM",
      isLoading: false,
      isError: false,
      retry: () => {},
    });
    const filas = [fila({ id: "eq-1", location: "EQUIPPED", item: anilloParaElDM })];
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));
    const patchEspiado = vi.spyOn(inventoryApi, "updateInventoryItem");

    render(<PaginaDeInventario campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });

    const alias = await screen.findByLabelText(/Alias de Anillo de protección/);
    // Ni siquiera se toca el valor: solo entra y sale del campo con el foco, como al tabular.
    fireEvent.focus(alias);
    fireEvent.blur(alias);

    // Un `waitFor` que falla no demuestra nada aquí, así que se da tiempo real a que un
    // `PATCH` de sobra pudiera dispararse antes de comprobar que no lo hizo.
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(patchEspiado).not.toHaveBeenCalled();
  });
});

// Tarea 9 (spec 2026-09-11, «la hoja a página completa») — la pestaña Objetos a página: dos
// columnas, filtros sobre la lista y un panel de detalle de la fila seleccionada. En la mesa la
// pantalla sigue siendo la de siempre —sin detalle—, y por eso el ayudante de abajo monta
// `"mesa"` por defecto: cada afirmación anterior de este fichero se queda literal.
describe("PaginaDeInventario — a página (tarea 9)", () => {
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
  const pocion = objeto({ name: "Poción de curación", kind: "CONSUMABLE", weightOz: 8 });

  function renderInventario({
    disposicion = "mesa",
    puedeEditar,
    filas = [
      fila({ id: "eq-daga", location: "EQUIPPED", slot: "MAIN_HAND", item: daga }),
      fila({ id: "ca-pocion", location: "CARRIED", item: pocion }),
      fila({ id: "st-cuerda", location: "STORED", storedAt: "En la posada", item: cuerda }),
    ],
  }: { disposicion?: "mesa" | "pagina"; puedeEditar?: boolean; filas?: InventoryRow[] } = {}) {
    vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue(respuesta(filas));
    return render(
      <PaginaDeInventario
        campaignId="c1"
        characterId="ch1"
        disposicion={disposicion}
        puedeEditar={puedeEditar}
      />,
      { wrapper: wrapper(nuevoQc()) },
    );
  }

  it("a página: dos columnas, la primera fila queda seleccionada y el detalle la enseña; en mesa no hay detalle", async () => {
    renderInventario({ disposicion: "pagina" });
    const detalle = await screen.findByRole("complementary", { name: "detalle del objeto" });
    expect(within(detalle).getByText("Daga")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /ver detalle de Poción/i }));
    expect(within(detalle).getByText("Poción de curación")).toBeInTheDocument();
    cleanup();
    renderInventario({ disposicion: "mesa" });
    await screen.findByRole("region", { name: "inventario" });
    expect(screen.queryByRole("complementary", { name: "detalle del objeto" })).toBeNull();
    // En la mesa la fila tampoco ofrece el botón de seleccionar: se pinta como siempre.
    expect(screen.queryByRole("button", { name: /ver detalle de/i })).toBeNull();
  });

  it("los filtros recortan las tres zonas y la selección cae a la primera fila visible", async () => {
    renderInventario({ disposicion: "pagina" });
    const detalle = await screen.findByRole("complementary", { name: "detalle del objeto" });
    expect(within(detalle).getByText("Daga")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar objeto" }), {
      target: { value: "pocion" },
    });
    const inventario = screen.getByRole("region", { name: "inventario" });
    expect(within(inventario).queryByRole("button", { name: /ver detalle de Daga/i })).toBeNull();
    expect(
      within(inventario).getByRole("button", { name: /ver detalle de Poción/i }),
    ).toBeVisible();
    // La daga ya no está: la selección pasa a la primera fila que sí se ve.
    expect(within(detalle).getByText("Poción de curación")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar objeto" }), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Consumible" }));
    expect(screen.getByRole("button", { name: "Consumible" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(inventario).queryByRole("button", { name: /ver detalle de Daga/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Consumible" }));
    expect(within(inventario).getByRole("button", { name: /ver detalle de Daga/i })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Guardado" }));
    expect(within(detalle).getByText("Cuerda de seda")).toBeInTheDocument();
  });

  it("el detalle ofrece las mismas acciones que la fila y la misma llamada al servidor", async () => {
    vi.spyOn(inventoryApi, "consumeInventoryItem").mockResolvedValue({
      remaining: 0,
      deleted: true,
    });
    renderInventario({ disposicion: "pagina" });
    const detalle = await screen.findByRole("complementary", { name: "detalle del objeto" });
    const verPocion = screen.getByRole("button", { name: /ver detalle de Poción/i });
    fireEvent.click(verPocion);
    const fila = verPocion.closest("li")!;
    // HP-4 (2026-09-12): la selección la anuncia el BOTÓN como conmutador (`aria-pressed`), no el
    // `<li>` con `aria-selected` — ese atributo solo vale en `option`/`tab`/`row`/`gridcell`, y
    // la lista es un `<ul>` sin papel. El `<li>` conserva la marca visual en `data-seleccionada`.
    expect(verPocion).toHaveAttribute("aria-pressed", "true");
    expect(fila).toHaveAttribute("data-seleccionada", "true");
    expect(fila).not.toHaveAttribute("aria-selected");
    const verDaga = screen.getByRole("button", { name: /ver detalle de Daga/i });
    expect(verDaga).toHaveAttribute("aria-pressed", "false");
    expect(verDaga.closest("li")!).not.toHaveAttribute("data-seleccionada");

    const enFila = within(fila)
      .getAllByRole("button")
      .map((b) => b.textContent);
    const enDetalle = within(detalle)
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(enDetalle).toEqual(enFila.filter((t) => t !== "Poción de curación"));

    fireEvent.click(within(detalle).getByRole("button", { name: /Gastar una unidad de Poción/ }));
    await waitFor(() =>
      expect(inventoryApi.consumeInventoryItem).toHaveBeenCalledWith("c1", "ch1", "ca-pocion", 1),
    );
  });

  it("spec §7: en un personaje ajeno (puedeEditar=false) ni el detalle ni las filas pintan botones de acción; por defecto sí", async () => {
    renderInventario({ disposicion: "pagina", puedeEditar: false });
    const detalle = await screen.findByRole("complementary", { name: "detalle del objeto" });
    expect(within(detalle).getByText("Daga")).toBeInTheDocument();
    expect(within(detalle).queryAllByRole("button")).toEqual([]);
    const inventario = screen.getByRole("region", { name: "inventario" });
    for (const nombre of [/^Quitar$/, /^Equipar$/, /^Traer$/, /^Soltar /, /^Gastar /]) {
      expect(within(inventario).queryByRole("button", { name: nombre })).toBeNull();
    }
    // Seleccionar sigue siendo posible: mirar no es editar.
    expect(
      within(inventario).getByRole("button", { name: /ver detalle de Poción/i }),
    ).toBeVisible();

    cleanup();
    renderInventario({ disposicion: "pagina" });
    const detallePorDefecto = await screen.findByRole("complementary", {
      name: "detalle del objeto",
    });
    expect(within(detallePorDefecto).getByRole("button", { name: "Quitar" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Equipar" })).toBeVisible();
  });

  it("HP-2: un rechazo del servidor a «Sintonizar» desde el detalle se lee DENTRO del detalle", async () => {
    vi.spyOn(inventoryApi, "updateInventoryItem").mockRejectedValue(
      new ApiError("Ya hay tres objetos sintonizados.", 400),
    );
    renderInventario({
      disposicion: "pagina",
      filas: [fila({ id: "eq-anillo", location: "EQUIPPED", slot: "RING_1", item: anillo })],
    });
    const detalle = await screen.findByRole("complementary", { name: "detalle del objeto" });
    fireEvent.click(within(detalle).getByRole("button", { name: /Sintonizar con Anillo/ }));
    expect(await within(detalle).findByRole("alert")).toHaveTextContent(
      "Ya hay tres objetos sintonizados.",
    );
    // Residual del reseño final: la fila seleccionada compartía el mismo rechazo con el
    // detalle, y un lector de pantalla anunciaba el mismo mensaje dos veces.
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("residual: seleccionar otra fila cancela la pregunta de la mano pendiente", async () => {
    renderInventario({
      disposicion: "pagina",
      filas: [
        fila({ id: "ca-pocion", location: "CARRIED", item: pocion }),
        fila({ id: "ca-daga", location: "CARRIED", item: daga }),
      ],
    });
    const detalle = await screen.findByRole("complementary", { name: "detalle del objeto" });
    const filaDaga = screen.getByRole("button", { name: /ver detalle de Daga/i }).closest("li")!;
    fireEvent.click(within(filaDaga).getByRole("button", { name: "Equipar" }));
    expect(within(detalle).getByRole("radio", { name: "Mano izquierda" })).toBeInTheDocument();

    // Se selecciona otra fila: la pregunta pendiente para la daga —que ya no se ve— se cancela.
    fireEvent.click(screen.getByRole("button", { name: /ver detalle de Poción/i }));
    expect(within(detalle).queryByRole("radio", { name: "Mano izquierda" })).toBeNull();

    // Se vuelve a seleccionar la daga: la pregunta no reaparece sola.
    fireEvent.click(within(filaDaga).getByRole("button", { name: /ver detalle de Daga/i }));
    expect(screen.queryByRole("radio", { name: "Mano izquierda" })).toBeNull();
  });

  it("HP-2: a página, equipar un arma desde la lista pregunta la mano en el detalle, una sola vez", async () => {
    renderInventario({
      disposicion: "pagina",
      filas: [
        fila({ id: "ca-pocion", location: "CARRIED", item: pocion }),
        fila({ id: "ca-daga", location: "CARRIED", item: daga }),
      ],
    });
    const detalle = await screen.findByRole("complementary", { name: "detalle del objeto" });
    expect(within(detalle).getByText("Poción de curación")).toBeInTheDocument();
    const filaDaga = screen.getByRole("button", { name: /ver detalle de Daga/i }).closest("li")!;
    fireEvent.click(within(filaDaga).getByRole("button", { name: "Equipar" }));
    // La pregunta vive en el panel del objeto al que se refiere, y ese panel pasa a ser el suyo.
    expect(within(detalle).getByText("Daga")).toBeInTheDocument();
    expect(screen.getAllByRole("radio", { name: "Mano izquierda" })).toHaveLength(1);
    expect(within(detalle).getByRole("radio", { name: "Mano izquierda" })).toBeInTheDocument();
  });
});
