import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CampaignItemsCatalogPage } from "../CampaignItemsCatalogPage";
import * as campaignItemsApi from "../api";
import * as membersApi from "../../campaigns/members";
import { useAuthStore } from "../../../store/auth.store";
import type { CampaignItem } from "../api";

// Carril B2 — pruebas de la pantalla del catálogo. Sigue el mismo molde que
// `features/entities/__tests__/EntityEditor.test.tsx`: `api.ts` simulado con `vi.spyOn`, sin
// tocar `fetch` de verdad.

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <CampaignItemsCatalogPage campaignId="c1" />
    </QueryClientProvider>,
  );
}

const objetoDelCatalogo: CampaignItem = {
  id: "i1",
  campaignId: "c1",
  name: "Estoque",
  kind: "WEAPON",
  description: "Una hoja fina.",
  weightOz: 32,
  costCp: 1000,
  effects: [],
  requiresAttunement: false,
  slot: "MAIN_HAND",
  weaponCategory: "MARTIAL",
  weaponRange: "MELEE",
  damageDice: "1d8",
  damageType: "PIERCING",
  weaponProperties: ["FINESSE"],
  versatileDice: null,
  rangeNormalFt: null,
  rangeLongFt: null,
  armorCategory: null,
  baseAc: null,
  dexCap: null,
  strengthRequirement: null,
  stealthDisadvantage: null,
  visibility: "PLAYERS",
  createdById: "dm1",
  createdAt: "2026-01-01",
  grants: [],
};

const objetoConEfecto: CampaignItem = {
  ...objetoDelCatalogo,
  id: "i2",
  name: "Sello de la Casa Vhael",
  kind: "OTHER",
  weaponCategory: null,
  weaponRange: null,
  damageDice: null,
  damageType: null,
  weaponProperties: [],
  effects: [{ kind: "ac", amount: 1 }],
  visibility: "DM_ONLY",
};

/** Una espada del catálogo del SRD, en la forma en que la sirve `GET /catalog/items`. */
const objetoDelSrd = {
  ref: "SRD:long-sword",
  source: "SRD" as const,
  name: "Espada larga",
  kind: "WEAPON" as const,
  weightOz: 48,
  costCp: 1500,
  effects: [],
  requiresAttunement: false,
  attuned: false,
  slot: "MAIN_HAND" as const,
  weapon: {
    category: "MARTIAL" as const,
    range: "MELEE" as const,
    damageDice: "1d8",
    damageType: "SLASHING" as const,
    properties: ["VERSATILE" as const],
    versatileDice: "1d10",
  },
};

describe("CampaignItemsCatalogPage — lista", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(campaignItemsApi, "fetchSrdItems").mockResolvedValue([]);
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "dm1", displayName: "DM", role: "DM" },
      { userId: "p1", displayName: "Alice", role: "PLAYER" },
    ]);
  });

  it("mezcla las dos procedencias en una lista y marca cada una", async () => {
    useAuthStore.setState({
      user: { id: "dm1", email: "dm@b.com", displayName: "DM", isAdmin: false },
    });
    vi.spyOn(campaignItemsApi, "fetchCampaignItems").mockResolvedValue([objetoDelCatalogo]);
    vi.spyOn(campaignItemsApi, "fetchSrdItems").mockResolvedValue([objetoDelSrd]);
    renderPage();

    // Las dos en la misma lista: lo que las distingue es su marca, no en qué pantalla están.
    await screen.findByText("Estoque");
    expect(screen.getByText("Espada larga")).toBeInTheDocument();
    expect(screen.getByText("de la campaña")).toBeInTheDocument();
    expect(screen.getByText("catálogo")).toBeInTheDocument();
  });

  it("la búsqueda filtra la lista, y es de cliente sobre lo que el servidor ya mandó", async () => {
    useAuthStore.setState({
      user: { id: "dm1", email: "dm@b.com", displayName: "DM", isAdmin: false },
    });
    vi.spyOn(campaignItemsApi, "fetchCampaignItems").mockResolvedValue([objetoDelCatalogo]);
    vi.spyOn(campaignItemsApi, "fetchSrdItems").mockResolvedValue([objetoDelSrd]);
    renderPage();

    await screen.findByText("Estoque");
    fireEvent.change(screen.getByLabelText("Buscar objeto por nombre"), {
      target: { value: "espada" },
    });

    expect(screen.getByText("Espada larga")).toBeInTheDocument();
    expect(screen.queryByText("Estoque")).not.toBeInTheDocument();
  });

  it("un objeto del SRD no se puede editar: es contenido de la obra, no de la campaña", async () => {
    useAuthStore.setState({
      user: { id: "dm1", email: "dm@b.com", displayName: "DM", isAdmin: false },
    });
    vi.spyOn(campaignItemsApi, "fetchCampaignItems").mockResolvedValue([]);
    vi.spyOn(campaignItemsApi, "fetchSrdItems").mockResolvedValue([objetoDelSrd]);
    renderPage();

    fireEvent.click(await screen.findByText("Espada larga"));
    await screen.findByRole("heading", { name: "Espada larga" });
    expect(screen.queryByRole("button", { name: /Editar/ })).not.toBeInTheDocument();
  });

  it("un jugador ve la lista pero no el botón de crear", async () => {
    useAuthStore.setState({
      user: { id: "p1", email: "p@b.com", displayName: "Alice", isAdmin: false },
    });
    vi.spyOn(campaignItemsApi, "fetchCampaignItems").mockResolvedValue([objetoDelCatalogo]);
    renderPage();

    await screen.findByText("Estoque");
    expect(screen.queryByRole("button", { name: /Crear objeto/ })).not.toBeInTheDocument();
  });

  it("el DM ve el botón de crear", async () => {
    useAuthStore.setState({
      user: { id: "dm1", email: "dm@b.com", displayName: "DM", isAdmin: false },
    });
    vi.spyOn(campaignItemsApi, "fetchCampaignItems").mockResolvedValue([objetoDelCatalogo]);
    renderPage();

    await screen.findByRole("button", { name: /Crear objeto/ });
  });

  it("ninguna enumeración cruda aparece en el DOM", async () => {
    useAuthStore.setState({
      user: { id: "dm1", email: "dm@b.com", displayName: "DM", isAdmin: false },
    });
    vi.spyOn(campaignItemsApi, "fetchCampaignItems").mockResolvedValue([
      objetoDelCatalogo,
      objetoConEfecto,
    ]);
    const { container } = renderPage();
    await screen.findByText("Estoque");
    await screen.findByText("Sello de la Casa Vhael");

    const texto = container.textContent ?? "";
    for (const cruda of [
      "WEAPON",
      "OTHER",
      "PIERCING",
      "FINESSE",
      "MARTIAL",
      "DM_ONLY",
      "PLAYERS",
    ]) {
      expect(texto).not.toContain(cruda);
    }
  });
});

describe("CampaignItemsCatalogPage — crear un arma", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useAuthStore.setState({
      user: { id: "dm1", email: "dm@b.com", displayName: "DM", isAdmin: false },
    });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "dm1", displayName: "DM", role: "DM" },
    ]);
    vi.spyOn(campaignItemsApi, "fetchCampaignItems").mockResolvedValue([]);
  });

  it("manda el cuerpo con el bloque `weapon` anidado", async () => {
    const spy = vi
      .spyOn(campaignItemsApi, "createCampaignItem")
      .mockResolvedValue(objetoDelCatalogo);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Crear objeto/ }));
    fireEvent.change(await screen.findByLabelText("Nombre"), {
      target: { value: "Estoque" },
    });
    // El tipo por defecto es GEAR; hay que elegir Arma para que aparezca el bloque de arma.
    fireEvent.click(screen.getByRole("radio", { name: /^Arma / }));
    fireEvent.change(screen.getByLabelText("Dado de daño (p. ej. 1d8)"), {
      target: { value: "1d8" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const cuerpo = spy.mock.calls[0][1];
    expect(cuerpo.kind).toBe("WEAPON");
    expect(cuerpo.weapon).toMatchObject({
      category: "SIMPLE",
      range: "MELEE",
      damageDice: "1d8",
      damageType: "SLASHING",
    });
    // El cuerpo no lleva las columnas planas de arma sueltas por fuera del bloque.
    expect(cuerpo).not.toHaveProperty("damageDice");
    expect(cuerpo).not.toHaveProperty("weaponCategory");
  });

  it("un 400 del servidor se enseña en línea sin borrar lo escrito", async () => {
    vi.spyOn(campaignItemsApi, "createCampaignItem").mockRejectedValue(
      new Error("Un arma necesita su dado de daño y su tipo de daño."),
    );
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Crear objeto/ }));
    fireEvent.change(await screen.findByLabelText("Nombre"), {
      target: { value: "Espada rota" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await screen.findByText("Un arma necesita su dado de daño y su tipo de daño.");
    // Lo tecleado sigue ahí: el rechazo no vació el formulario.
    expect(screen.getByLabelText("Nombre")).toHaveValue("Espada rota");
    // El botón de guardar sigue activo — nunca se deshabilita.
    expect(screen.getByRole("button", { name: "Guardar" })).not.toHaveAttribute("aria-disabled");
  });
});

describe("CampaignItemsCatalogPage — ficha y borrado", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "dm1", displayName: "DM", role: "DM" },
    ]);
  });

  it("un jugador no ve los controles de escritura en la ficha", async () => {
    useAuthStore.setState({
      user: { id: "p1", email: "p@b.com", displayName: "Alice", isAdmin: false },
    });
    vi.spyOn(campaignItemsApi, "fetchCampaignItems").mockResolvedValue([objetoDelCatalogo]);
    renderPage();

    fireEvent.click(await screen.findByText("Estoque"));
    await screen.findByRole("heading", { name: "Estoque" });
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("el 409 al borrar se enseña con su frase", async () => {
    useAuthStore.setState({
      user: { id: "dm1", email: "dm@b.com", displayName: "DM", isAdmin: false },
    });
    vi.spyOn(campaignItemsApi, "fetchCampaignItems").mockResolvedValue([objetoDelCatalogo]);
    vi.spyOn(campaignItemsApi, "deleteCampaignItem").mockRejectedValue(
      new Error("2 personaje(s) llevan este objeto en su inventario; no se puede borrar."),
    );
    renderPage();

    fireEvent.click(await screen.findByText("Estoque"));
    fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Borrar" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar definitivamente" }));

    await screen.findByText(
      "2 personaje(s) llevan este objeto en su inventario; no se puede borrar.",
    );
  });
});
