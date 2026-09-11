import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { CampaignList } from "../CampaignList";
import * as api from "../api";

function renderList() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CampaignList />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CampaignList", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders campaigns returned by the API", async () => {
    vi.spyOn(api, "fetchCampaigns").mockResolvedValue([
      {
        id: "c1",
        name: "Curse of Strahd",
        description: null,
        ownerId: "u1",
        createdAt: "2026-01-01",
      },
      {
        id: "c2",
        name: "Lost Mine",
        description: "starter",
        ownerId: "u1",
        createdAt: "2026-01-02",
      },
    ]);
    renderList();
    expect(await screen.findByText("Curse of Strahd")).toBeInTheDocument();
    expect(await screen.findByText("Lost Mine")).toBeInTheDocument();
  });

  it("shows empty state when there are no campaigns", async () => {
    vi.spyOn(api, "fetchCampaigns").mockResolvedValue([]);
    renderList();
    expect(await screen.findByText("Todavía no hay ninguna campaña")).toBeInTheDocument();
  });

  // **La tarjeta de la maqueta (2026-09-03).** Lo que se comprueba aquí es exactamente lo que
  // la tarjeta anterior NO decía: tu papel en esa mesa, cuánta gente hay, y cuánto hace que
  // existe — en huecos, no en una fecha absoluta que obliga a restar.
  it("cada tarjeta dice tu papel, cuánta gente hay y cuánto hace, en huecos", async () => {
    const anteayer = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    vi.spyOn(api, "fetchCampaigns").mockResolvedValue([
      {
        id: "c1",
        name: "Las Mareas de Sarnath",
        description: null,
        ownerId: "u1",
        createdAt: anteayer,
        members: [{ role: "DM" }],
        _count: { members: 4 },
      },
      {
        id: "c2",
        name: "Los Reinos de Ceniza",
        description: null,
        ownerId: "u9",
        createdAt: anteayer,
        members: [{ role: "PLAYER" }],
        _count: { members: 1 },
      },
    ]);
    renderList();

    // Ningún valor de enumeración llega a la pantalla: "DM" y "PLAYER" se dicen en español.
    expect(await screen.findByText("Diriges")).toBeInTheDocument();
    expect(screen.getByText("Juegas")).toBeInTheDocument();
    expect(screen.queryByText("DM")).not.toBeInTheDocument();
    expect(screen.queryByText("PLAYER")).not.toBeInTheDocument();

    // Plural y singular, escritos y no generados.
    expect(screen.getByText("4 miembros")).toBeInTheDocument();
    expect(screen.getByText("1 miembro")).toBeInTheDocument();

    // El hueco, no la fecha. Dos días atrás se dice "anteayer" en español.
    expect(screen.getAllByText("anteayer")).toHaveLength(2);
  });

  // U4 (tarea 33): el conteo llega ya filtrado por canView desde el servidor — la tarjeta solo
  // decide cómo se lee, en singular/plural/cero, sin generar ningún plural a mano en el JSX.
  it("dice cuántas fichas del mundo puede ver quien mira, en forma legible", async () => {
    vi.spyOn(api, "fetchCampaigns").mockResolvedValue([
      {
        id: "c1",
        name: "Doce fichas",
        description: null,
        ownerId: "u1",
        createdAt: "2026-01-01",
        entityCount: 12,
      },
      {
        id: "c2",
        name: "Una ficha",
        description: null,
        ownerId: "u1",
        createdAt: "2026-01-01",
        entityCount: 1,
      },
      {
        id: "c3",
        name: "Sin fichas",
        description: null,
        ownerId: "u1",
        createdAt: "2026-01-01",
        entityCount: 0,
      },
    ]);
    renderList();
    expect(await screen.findByText("12 fichas")).toBeInTheDocument();
    expect(screen.getByText("1 ficha")).toBeInTheDocument();
    expect(screen.getByText("Sin fichas todavía")).toBeInTheDocument();
  });

  // El "+" era el carácter de ancho completo, que es un glifo de fuente usado como icono —
  // justo lo que la regla de interfaz prohíbe. Ahora es un dibujo.
  it("el botón que crea lleva un dibujo, no un glifo de fuente", async () => {
    vi.spyOn(api, "fetchCampaigns").mockResolvedValue([
      { id: "c1", name: "Una campaña", description: null, ownerId: "u1", createdAt: "2026-01-01" },
    ]);
    const { container } = render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <CampaignList onCreate={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const boton = await screen.findByRole("button", { name: "Nueva campaña" });
    expect(boton.querySelector("svg")).toBeInTheDocument();
    expect(container.textContent).not.toContain("\uFF0B");
    expect(container.textContent).not.toContain("+");
  });
});
