import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { CampaignOverview } from "../CampaignOverview";
import * as campaignsApi from "../api";
import * as entitiesApi from "../../entities/api";
import * as sessionsApi from "../../sessions/api";
import * as charactersApi from "../../characters/api";
import * as members from "../members";

// **El resumen como tablero (maqueta de Figma, 2026-09-02).**
//
// Esta pantalla no tenía ni una prueba de componente: se escribió en el reseño y se dio por
// buena mirándola. Lo que se comprueba aquí es lo que la hace distinta de la lista de cifras
// que sustituye — qué pasó, quién está, a dónde vas — y, sobre todo, **lo que se negó a
// inventar**: sin sesiones jugadas no hay tarjeta de última sesión rellena, y una nota que no
// es texto no se pinta.

const SESION_BASE = {
  campaignId: "c1",
  visibility: "PLAYERS" as const,
  createdAt: "2026-01-01",
  status: "PLANNED" as const,
  startedAt: null,
  endedAt: null,
  attendance: null,
};

const PERSONAJE_BASE = {
  campaignId: "c1",
  ownerId: "u1",
  race: null,
  class: null,
  raceKey: null,
  subraceKey: null,
  classKey: null,
  bio: null,
  visibility: "PUBLIC" as const,
  createdAt: "2026-01-01",
  archivedAt: null,
};

function renderOverview() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/campaigns/c1"]}>
        <CampaignOverview campaignId="c1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CampaignOverview — el tablero de la campaña", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue({
      id: "c1",
      name: "Las Mareas de Sarnath",
      description: null,
      ownerId: "u1",
      createdAt: "2026-01-01",
    });
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
    vi.spyOn(sessionsApi, "fetchSessions").mockResolvedValue([]);
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);
    vi.spyOn(members, "fetchMembers").mockResolvedValue([
      { userId: "u1", displayName: "Ada", role: "DM" },
    ]);
  });

  it("pinta la última sesión jugada con sus notas, no la que aún no ha ocurrido", async () => {
    vi.spyOn(sessionsApi, "fetchSessions").mockResolvedValue([
      {
        ...SESION_BASE,
        id: "s1",
        title: "El humo del puerto",
        scheduledAt: "2020-03-01T20:00:00.000Z",
        notes: "Kellan mintió sobre el registro.",
      },
      {
        ...SESION_BASE,
        id: "s2",
        title: "Lo que viene después",
        scheduledAt: "2999-03-01T20:00:00.000Z",
        notes: "Nadie ha jugado esto todavía.",
      },
    ]);
    renderOverview();

    expect(await screen.findByRole("heading", { name: "El humo del puerto" })).toBeInTheDocument();
    expect(screen.getByText("Kellan mintió sobre el registro.")).toBeInTheDocument();
    // La sesión futura va en su propia tarjeta, y su nota NO se cuela en la de la última: el
    // tablero dice "qué pasó" a la izquierda y "cuándo se vuelve" a la derecha.
    expect(screen.getByText("Lo que viene después")).toBeInTheDocument();
    expect(screen.queryByText("Nadie ha jugado esto todavía.")).not.toBeInTheDocument();
  });

  it("sin ninguna sesión pasada no inventa una última: lo dice", async () => {
    vi.spyOn(sessionsApi, "fetchSessions").mockResolvedValue([
      {
        ...SESION_BASE,
        id: "s2",
        title: "La primera",
        scheduledAt: "2999-03-01T20:00:00.000Z",
        notes: null,
      },
    ]);
    renderOverview();

    expect(await screen.findByText(/Todavía no habéis jugado ninguna/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "La primera" })).not.toBeInTheDocument();
  });

  it("una nota que no es texto no llega a la pantalla", async () => {
    vi.spyOn(sessionsApi, "fetchSessions").mockResolvedValue([
      {
        ...SESION_BASE,
        id: "s1",
        title: "El humo del puerto",
        scheduledAt: "2020-03-01T20:00:00.000Z",
        // `Session.notes` es `Json?` en el esquema y `unknown` aquí: esta pantalla solo
        // escribe texto, pero la base admite cualquier cosa. Sin la guarda, esto se pintaba
        // como el resultado de convertir un objeto a texto.
        notes: { bloques: ["algo"] },
      },
    ]);
    renderOverview();

    expect(await screen.findByRole("heading", { name: "El humo del puerto" })).toBeInTheDocument();
    expect(screen.getByText(/Nadie escribió notas de esa sesión/)).toBeInTheDocument();
    expect(screen.queryByText(/object Object/)).not.toBeInTheDocument();
  });

  it("«Quién está en la mesa» dice el nombre, la raza, la clase y el nivel, no una cifra", async () => {
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([
      {
        ...PERSONAJE_BASE,
        id: "p1",
        name: "Corvin Vhael",
        raceKey: "human",
        classKey: "rogue",
        level: 5,
      },
    ]);
    renderOverview();

    // Se espera al DATO, no al rótulo: el rótulo de la tarjeta está pintado desde el primer
    // render y una espera sobre él pasa antes de que la petición resuelva.
    await screen.findByText("Corvin Vhael");
    const mesa = screen.getByText("Quién está en la mesa").closest("section");
    expect(mesa).not.toBeNull();
    expect(within(mesa as HTMLElement).getByText("Corvin Vhael")).toBeInTheDocument();
    // Ninguna clave del catálogo llega a la pantalla: `descriptorDePersonaje` la traduce.
    const linea = within(mesa as HTMLElement).getByText(/Nivel 5/);
    expect(linea.textContent).not.toMatch(/rogue|human/);
    expect(linea.textContent).toMatch(/·/);
  });

  it("los accesos rápidos llevan a la sección por el mismo ?seccion= de la barra lateral, con su cuenta", async () => {
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([
      {
        id: "e1",
        campaignId: "c1",
        type: "LOCATION",
        name: "El puerto de Sarnath",
        tags: [],
        visibility: "PUBLIC",
        createdById: "u1",
        createdAt: "2026-01-02",
      },
      {
        id: "e2",
        campaignId: "c1",
        type: "LOCATION",
        name: "La Torre Gris",
        tags: [],
        visibility: "PUBLIC",
        createdById: "u1",
        createdAt: "2026-01-03",
      },
    ]);
    renderOverview();

    const lugares = await screen.findByRole("link", { name: /Lugares/ });
    expect(lugares).toHaveAttribute("href", "/campaigns/c1?seccion=LOCATION");
    // Las baldosas se pintan antes de que llegue la lista, así que la cuenta se espera.
    await waitFor(() => expect(lugares).toHaveTextContent("2"));
    // Un tipo sin nada escrito sigue ofreciéndose, con un cero honesto: la sección existe.
    expect(screen.getByRole("link", { name: /Misiones/ })).toHaveTextContent("0");
  });

  // **Maqueta 2026-09-03: la tarjeta de la última sesión tiene salida.** Enseñaba una nota y
  // dejaba al lector dentro, sin decir dónde estaban las demás. El enlace va por el mismo
  // `?seccion=` que el carril y los accesos rápidos, así que es enlazable y sobrevive a una
  // recarga; y no aparece cuando no hay ninguna sesión jugada, porque un enlace a una lista
  // vacía es una promesa que la pantalla de al lado incumple.
  it("la tarjeta de la última sesión lleva a la lista de sesiones, por ?seccion=", async () => {
    vi.spyOn(sessionsApi, "fetchSessions").mockResolvedValue([
      {
        ...SESION_BASE,
        id: "s1",
        title: "El humo del puerto",
        scheduledAt: "2020-03-01T20:00:00.000Z",
        notes: "Kellan mintió sobre el registro.",
      },
    ]);
    renderOverview();

    const salida = await screen.findByRole("link", { name: "Ver todas las sesiones" });
    expect(salida).toHaveAttribute("href", "/campaigns/c1?seccion=sessions");
  });

  it("sin sesiones jugadas no hay enlace a la lista: no se promete lo que no hay", async () => {
    renderOverview();

    expect(await screen.findByText(/Todavía no habéis jugado ninguna/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ver todas las sesiones" })).not.toBeInTheDocument();
  });

  it("las bandas se rotulan a la izquierda, y el rótulo es un encabezado de verdad", async () => {
    renderOverview();

    expect(await screen.findByRole("heading", { name: "Accesos rápidos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Lo último del mundo" })).toBeInTheDocument();
  });

  it("las siete secciones del mundo tienen su baldosa, y ninguna enseña un valor de enumeración", async () => {
    renderOverview();

    const accesos = await screen.findAllByRole("link");
    const rotulos = accesos.map((a) => a.textContent ?? "");
    expect(rotulos).toHaveLength(7);
    for (const rotulo of rotulos) {
      expect(rotulo).not.toMatch(/NPC|LOCATION|QUEST|FACTION|OBJECT|EVENT|DOCUMENT/);
    }
  });
});

// **La invitación, en su sitio.** Es lo último que quedaba del reseño: el flujo ya estaba
// construido —con su recorrido de dos navegadores— y vivía en Ajustes, la última de seis
// secciones, cuando invitar es de lo primero que se hace con una campaña nueva.
describe("CampaignOverview — quién juega", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(campaignsApi, "fetchCampaign").mockResolvedValue({
      id: "c1",
      name: "Las Mareas de Sarnath",
      description: null,
      ownerId: "u1",
      createdAt: "2026-01-01",
    });
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
    vi.spyOn(sessionsApi, "fetchSessions").mockResolvedValue([]);
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);
  });

  it("con solo el DM lo dice y ofrece invitar, en un clic", async () => {
    vi.spyOn(members, "fetchMembers").mockResolvedValue([
      { userId: "u1", displayName: "Ada", role: "DM" },
    ]);
    renderOverview();

    const tarjeta = await screen.findByRole("region", { name: "Quién juega" });
    // Se espera al CONTENIDO, no al contenedor: la región existe desde el primer pintado y
    // los miembros llegan después.
    expect(await within(tarjeta).findByText("Ada")).toBeInTheDocument();
    expect(within(tarjeta).getByText("DM")).toBeInTheDocument();
    expect(within(tarjeta).getByText(/Todavía no hay jugadores/)).toBeInTheDocument();
    expect(within(tarjeta).getByRole("link", { name: "Invitar a un jugador" })).toHaveAttribute(
      "href",
      "/campaigns/c1?seccion=settings",
    );
  });

  it("con un jugador dentro, ni el aviso ni el enlace: ya no hay nada que resolver", async () => {
    vi.spyOn(members, "fetchMembers").mockResolvedValue([
      { userId: "u1", displayName: "Ada", role: "DM" },
      { userId: "u2", displayName: "Marco", role: "PLAYER" },
    ]);
    renderOverview();

    const tarjeta = await screen.findByRole("region", { name: "Quién juega" });
    expect(await within(tarjeta).findByText("Marco")).toBeInTheDocument();
    // **El papel traducido, nunca la clave.** `PLAYER` no llega a la pantalla.
    expect(within(tarjeta).getByText("Jugador")).toBeInTheDocument();
    expect(within(tarjeta).queryByText("PLAYER")).not.toBeInTheDocument();
    expect(within(tarjeta).queryByText(/Todavía no hay jugadores/)).not.toBeInTheDocument();
  });

  it("«quién juega» son PERSONAS y «quién está en la mesa» son PERSONAJES: dos tarjetas distintas", async () => {
    // La pantalla prometía «quién está» y solo enseñaba personajes. Un DM que acaba de crear la
    // campaña veía tres personajes suyos y ninguna pista de que no había invitado a nadie.
    vi.spyOn(members, "fetchMembers").mockResolvedValue([
      { userId: "u1", displayName: "Ada", role: "DM" },
    ]);
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([
      { ...PERSONAJE_BASE, id: "ch1", name: "Corvin", level: 5 },
    ] as never);
    renderOverview();

    const juegan = await screen.findByRole("region", { name: "Quién juega" });
    await within(juegan).findByText("Ada");
    const enLaMesa = await screen.findByRole("region", { name: "Quién está en la mesa" });
    expect(within(juegan).queryByText("Corvin")).not.toBeInTheDocument();
    expect(within(enLaMesa).getByText("Corvin")).toBeInTheDocument();
    expect(within(enLaMesa).queryByText("Ada")).not.toBeInTheDocument();
  });
});
