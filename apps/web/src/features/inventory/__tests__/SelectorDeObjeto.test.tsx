import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { ResolvedItem } from "@dnd/shared";
import { SelectorDeObjeto } from "../SelectorDeObjeto";
import * as inventoryApi from "../api";
import * as campaignItemsApi from "../../campaign-items/api";
import type { CampaignItem } from "../../campaign-items/api";
import { ApiError } from "../../../lib/api";

// Carril B4 — el selector de objeto (pantalla 22 del prototipo, revisión obligatoria). Se
// prueba lo que puede romperse en silencio: que la lista mezcle catálogo y campaña con su marca,
// que la búsqueda filtre en cliente, que "Añadir" mande la `ref` correcta según la procedencia
// elegida y `location: "CARRIED"` por defecto, que un 400 se enseñe en línea sin borrar lo
// elegido, y que ninguna enumeración cruda llegue al DOM.

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function nuevoQc() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function srdItem(parcial: Partial<ResolvedItem> & { name: string; ref: string }): ResolvedItem {
  return {
    source: "SRD",
    kind: "GEAR",
    weightOz: 16,
    effects: [],
    requiresAttunement: false,
    ...parcial,
  };
}

const estoque = srdItem({ ref: "SRD:estoque", name: "Estoque", kind: "WEAPON" });
const cuerdaSrd = srdItem({ ref: "SRD:cuerda-de-seda", name: "Cuerda de seda" });

function campaignItem(parcial: Partial<CampaignItem> & { id: string; name: string }): CampaignItem {
  return {
    campaignId: "c1",
    kind: "OTHER",
    weightOz: 0,
    effects: [],
    requiresAttunement: false,
    weaponProperties: [],
    visibility: "PLAYERS",
    createdById: "dm1",
    createdAt: "2026-01-01T00:00:00.000Z",
    grants: [],
    ...parcial,
  };
}

const selloVhael = campaignItem({ id: "ci-1", name: "Sello de la Casa Vhael" });

async function abrirSelector() {
  fireEvent.click(await screen.findByRole("button", { name: /Añadir objeto/i }));
}

describe("SelectorDeObjeto", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // El catálogo del SRD tiene **un solo dueño** desde la integración: la consulta vive en
    // `campaign-items` y las dos pantallas la comparten. Cuando eran dos consultas con la misma
    // clave y formas distintas, la segunda pantalla en montarse leía la caché de la primera y la
    // aplicación se caía.
    vi.spyOn(campaignItemsApi, "fetchSrdItems").mockResolvedValue([estoque, cuerdaSrd]);
    vi.spyOn(campaignItemsApi, "fetchCampaignItems").mockResolvedValue([selloVhael]);
  });

  it("la lista mezcla las dos procedencias y las marca", async () => {
    render(<SelectorDeObjeto campaignId="c1" characterId="ch1" />, { wrapper: wrapper(nuevoQc()) });
    await abrirSelector();

    const filaEstoque = (await screen.findByText("Estoque")).closest("li")!;
    expect(within(filaEstoque).getByText("catálogo")).toBeInTheDocument();

    const filaSello = screen.getByText("Sello de la Casa Vhael").closest("li")!;
    expect(within(filaSello).getByText("de la campaña")).toBeInTheDocument();
  });

  it("la búsqueda filtra la lista en cliente", async () => {
    render(<SelectorDeObjeto campaignId="c1" characterId="ch1" />, { wrapper: wrapper(nuevoQc()) });
    await abrirSelector();
    await screen.findByText("Estoque");

    fireEvent.change(screen.getByPlaceholderText("Buscar objeto por nombre…"), {
      target: { value: "sello" },
    });

    expect(screen.queryByText("Estoque")).not.toBeInTheDocument();
    expect(screen.queryByText("Cuerda de seda")).not.toBeInTheDocument();
    expect(screen.getByText("Sello de la Casa Vhael")).toBeInTheDocument();
  });

  it("añadir un objeto del catálogo manda el POST con la ref SRD y location CARRIED", async () => {
    vi.spyOn(inventoryApi, "addInventoryItem").mockResolvedValue({
      id: "row-1",
      quantity: 1,
      location: "CARRIED",
      slot: null,
      attuned: false,
      storedAt: null,
      note: null,
      item: estoque,
    });

    render(<SelectorDeObjeto campaignId="c1" characterId="ch1" />, { wrapper: wrapper(nuevoQc()) });
    await abrirSelector();
    fireEvent.click(await screen.findByText("Estoque"));
    fireEvent.click(screen.getByRole("button", { name: /^Añadir$/ }));

    await waitFor(() =>
      expect(inventoryApi.addInventoryItem).toHaveBeenCalledWith("c1", "ch1", {
        ref: { source: "SRD", key: "estoque" },
        quantity: 1,
        location: "CARRIED",
      }),
    );
  });

  it("añadir un objeto de la campaña manda la ref CAMPAIGN con su id", async () => {
    vi.spyOn(inventoryApi, "addInventoryItem").mockResolvedValue({
      id: "row-2",
      quantity: 1,
      location: "CARRIED",
      slot: null,
      attuned: false,
      storedAt: null,
      note: null,
      item: srdItem({ ref: "CAMPAIGN:ci-1", name: "Sello de la Casa Vhael", source: "CAMPAIGN" }),
    });

    render(<SelectorDeObjeto campaignId="c1" characterId="ch1" />, { wrapper: wrapper(nuevoQc()) });
    await abrirSelector();
    fireEvent.click(await screen.findByText("Sello de la Casa Vhael"));
    fireEvent.click(screen.getByRole("button", { name: /^Añadir$/ }));

    await waitFor(() =>
      expect(inventoryApi.addInventoryItem).toHaveBeenCalledWith("c1", "ch1", {
        ref: { source: "CAMPAIGN", id: "ci-1" },
        quantity: 1,
        location: "CARRIED",
      }),
    );
  });

  it("el 400 de un objeto DM_ONLY se enseña en línea y conserva lo elegido", async () => {
    vi.spyOn(inventoryApi, "addInventoryItem").mockRejectedValue(
      new ApiError(
        'El dueño del personaje no puede ver "Sello de la Casa Vhael" todavía: súbele la visibilidad al objeto antes de dárselo.',
        400,
      ),
    );

    render(<SelectorDeObjeto campaignId="c1" characterId="ch1" />, { wrapper: wrapper(nuevoQc()) });
    await abrirSelector();
    fireEvent.click(await screen.findByText("Sello de la Casa Vhael"));
    fireEvent.click(screen.getByRole("button", { name: /^Añadir$/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "súbele la visibilidad al objeto antes de dárselo",
    );
    // Lo elegido sigue elegido — nada se borró tras el rechazo.
    expect(screen.getByText(/Elegido:/)).toHaveTextContent("Sello de la Casa Vhael");
  });

  it("ninguna enumeración cruda llega al DOM", async () => {
    const { container } = render(<SelectorDeObjeto campaignId="c1" characterId="ch1" />, {
      wrapper: wrapper(nuevoQc()),
    });
    await abrirSelector();
    await screen.findByText("Estoque");
    fireEvent.click(screen.getByText("Estoque"));

    const texto = container.textContent ?? "";
    for (const crudo of ["CARRIED", "EQUIPPED", "STORED", "SRD", "CAMPAIGN"]) {
      expect(texto).not.toContain(crudo);
    }
  });
});
