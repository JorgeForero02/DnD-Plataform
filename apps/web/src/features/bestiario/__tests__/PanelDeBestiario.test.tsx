import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { Statblock } from "@dnd/shared";
import { PanelDeBestiario } from "../PanelDeBestiario";
import * as bestiarioApi from "../api";
import * as membersApi from "../../campaigns/members";
import * as entitiesApi from "../../entities/api";
import type { Entity } from "../../entities/api";
import { useAuthStore } from "../../../store/auth.store";

// Fase 2D — la mitad de pantalla del bestiario. Mismo molde que `PanelDeTablas.test.tsx`:
// `api.ts` simulado con `vi.spyOn`, sin tocar `fetch` de verdad.

function renderPanel() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // `MemoryRouter` porque la lista «En la mesa» enlaza a la ficha del PNJ: hacerle daño ocurre
  // allí, no aquí.
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <PanelDeBestiario campaignId="c1" />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

function comoDm() {
  useAuthStore.setState({
    user: { id: "dm1", email: "dm@b.com", displayName: "DM", isAdmin: false },
  });
}
function comoJugador() {
  useAuthStore.setState({
    user: { id: "p1", email: "p@b.com", displayName: "Alice", isAdmin: false },
  });
}

const goblin: Statblock = {
  ref: "SRD:goblin",
  source: "SRD",
  name: "Goblin",
  size: "SMALL",
  type: "HUMANOID",
  subtype: "trasgo",
  alignment: "neutral malvado",
  ac: 15,
  acNote: "armadura de cuero, escudo",
  hitDiceCount: 2,
  abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
  saveProficiencies: [],
  skillProficiencies: { stealth: "expertise" },
  damageResistances: [],
  damageImmunities: [],
  damageVulnerabilities: [],
  conditionImmunities: [],
  darkvisionFeet: 60,
  otherSenses: [],
  speeds: { walk: 30 },
  languages: "común, goblin",
  cr: 0.25,
  traits: [{ name: "Huida Veloz", desc: "Puede destrabarse o esconderse como acción adicional." }],
  actions: [{ name: "Cimitarra", desc: "+4 a impactar, 5 (1d6 + 2) de daño cortante." }],
  reactions: [],
  legendaryActions: [],
};

const dragoncillo: Statblock = {
  ...goblin,
  ref: "CAMPAIGN:sb1",
  source: "CAMPAIGN",
  name: "Dragoncillo de la cripta",
  size: "MEDIUM",
  type: "DRAGON",
  subtype: undefined,
  ac: 16,
  acNote: "armadura natural",
  hitDiceCount: 6,
  cr: 3,
};

const garrik: Entity = {
  id: "garrik-id",
  campaignId: "c1",
  type: "NPC",
  name: "Garrik",
  tags: [],
  visibility: "DM_ONLY",
  createdById: "dm1",
  createdAt: "2026-01-01",
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
    { userId: "dm1", displayName: "DM", role: "DM" },
    { userId: "p1", displayName: "Alice", role: "PLAYER" },
  ]);
  vi.spyOn(bestiarioApi, "fetchStatblocks").mockResolvedValue({
    srd: [goblin],
    campaign: [dragoncillo],
  });
  vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([]);
  vi.spyOn(entitiesApi, "fetchEntities").mockResolvedValue([garrik]);
});

describe("PanelDeBestiario — lo que la ficha enseña", () => {
  it("dice de un vistazo para qué es la pantalla", async () => {
    comoDm();
    renderPanel();
    await screen.findByRole("heading", { name: "Bestiario" });
    expect(screen.getByText(/de un vistazo en mitad de un turno/i)).toBeInTheDocument();
  });

  it("los tres números grandes son CA, PG y velocidad, con el VD al lado", async () => {
    comoDm();
    renderPanel();
    await screen.findByText("Goblin");
    // Los rótulos, no los valores: es lo que hace legible un número suelto en mitad de un turno.
    expect(screen.getAllByText("CA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PG").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Vel").length).toBeGreaterThan(0);
    expect(screen.getAllByText("VD").length).toBeGreaterThan(0);
  });

  it("los PG que enseña son los del libro, derivados y no guardados", async () => {
    comoDm();
    renderPanel();
    await screen.findByText("Goblin");
    // 2d6 con CON 10 → 7, que es lo que imprime el SRD.
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText(/2d6/)).toBeInTheDocument();
  });

  it("**la velocidad va en pies, no en metros**, aunque el prototipo diga metros", async () => {
    comoDm();
    renderPanel();
    await screen.findByText("Goblin");
    expect(screen.getAllByText("pies").length).toBeGreaterThan(0);
    expect(screen.queryByText(/\b9 m\b/)).not.toBeInTheDocument();
  });

  it("**ningún valor de enumeración llega a la pantalla**", async () => {
    comoDm();
    const { container } = renderPanel();
    await screen.findByText("Goblin");
    const texto = container.textContent ?? "";
    for (const enumeracion of ["SMALL", "MEDIUM", "HUMANOID", "DRAGON", "SRD", "CAMPAIGN"]) {
      expect(texto).not.toContain(enumeracion);
    }
    // Y sí llega la forma legible.
    expect(texto).toContain("Pequeño humanoide (trasgo)");
    expect(texto).toContain("Mediano dragón");
  });

  it("el valor de desafío se escribe en fracción, como en el libro", async () => {
    comoDm();
    renderPanel();
    await screen.findByText("Goblin");
    expect(screen.getByText("1/4")).toBeInTheDocument();
    expect(screen.queryByText("0.25")).not.toBeInTheDocument();
  });

  it("dice de dónde viene cada criatura sin decir «SRD»", async () => {
    comoDm();
    renderPanel();
    await screen.findByText("Goblin");
    // Acotado a las fichas: «Del libro» también es el rótulo de un filtro, y que las dos digan
    // lo mismo es coherencia, no un choque — el filtro y la marca hablan del mismo concepto.
    const fichas = screen.getAllByTestId("ficha-de-criatura");
    expect(within(fichas[0]).getByText("De la campaña")).toBeInTheDocument();
    expect(within(fichas[1]).getByText("Del libro")).toBeInTheDocument();
  });
});

describe("PanelDeBestiario — bajar una criatura a la mesa", () => {
  it("**el botón dice lo que hace, no «Meter al combate»**", async () => {
    comoDm();
    renderPanel();
    await screen.findByText("Goblin");
    // El prototipo lo llama «Meter al combate» y no hay combate: la iniciativa es Encuentros,
    // un bloque planificado y sin escribir. Si el texto y el servidor discrepan, miente el texto.
    expect(screen.getAllByRole("button", { name: /Bajar a la mesa/i }).length).toBe(2);
    expect(screen.queryByRole("button", { name: /combate/i })).not.toBeInTheDocument();
  });

  it("un jugador no ve el botón — y eso no es el control de acceso, solo no molestar", async () => {
    comoJugador();
    renderPanel();
    await screen.findByText("Goblin");
    expect(screen.queryByRole("button", { name: /Bajar a la mesa/i })).not.toBeInTheDocument();
  });

  it("baja la cantidad que se pide, y avisa de que solo la ve el DM", async () => {
    comoDm();
    const spy = vi.spyOn(bestiarioApi, "instantiateNpc").mockResolvedValue([
      {
        id: "n1",
        name: "Goblin 1",
        statblockRef: "SRD:goblin",
        currentHp: 7,
        ownerId: "u-dm",
        visibility: "DM_ONLY",
      },
      {
        id: "n2",
        name: "Goblin 2",
        statblockRef: "SRD:goblin",
        currentHp: 7,
        ownerId: "u-dm",
        visibility: "DM_ONLY",
      },
    ]);
    renderPanel();
    await screen.findByText("Goblin");

    fireEvent.change(screen.getByLabelText(/Cuántos/i, { selector: "#cuantos-SRD\\:goblin" }), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: /Bajar a la mesa/i })[1]);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith("c1", { ref: "SRD:goblin", count: 2, hp: "AVERAGE" });
    // El aviso importa: si no dijera que nace escondida, el DM creería que la mesa ya la ve.
    expect(await screen.findByRole("status")).toHaveTextContent(/solo las ves tú/i);
  });

  it("los que ya están en la mesa salen con sus puntos de golpe", async () => {
    comoDm();
    vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([
      {
        id: "n1",
        name: "Goblin 1",
        statblockRef: "SRD:goblin",
        currentHp: 4,
        ownerId: "u-dm",
        visibility: "DM_ONLY",
      },
    ]);
    renderPanel();
    expect(await screen.findByTestId("pnj-en-la-mesa")).toHaveTextContent("Goblin 1");
    expect(screen.getByTestId("pnj-en-la-mesa")).toHaveTextContent("4 PG");
  });

  it("el nombre enlaza a su ficha, que es donde se le hace daño", async () => {
    comoDm();
    vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([
      {
        id: "n1",
        name: "Goblin 1",
        statblockRef: "SRD:goblin",
        currentHp: 4,
        ownerId: "u-dm",
        visibility: "DM_ONLY",
      },
    ]);
    renderPanel();
    const enlace = await screen.findByRole("link", { name: "Goblin 1" });
    expect(enlace).toHaveAttribute("href", "/campaigns/c1/personajes/n1");
  });

  it("**las condiciones vivas se pintan traducidas**, y el nivel solo si es mayor que uno", async () => {
    comoDm();
    vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([
      {
        id: "n1",
        name: "Ogro",
        statblockRef: "SRD:ogre",
        currentHp: 30,
        ownerId: "u-dm",
        visibility: "DM_ONLY",
        conditions: [
          { key: "prone", level: 1 },
          { key: "exhaustion", level: 3 },
        ],
      },
    ]);
    renderPanel();
    await screen.findByTestId("pnj-en-la-mesa");
    const marcas = screen.getAllByTestId("condicion-de-pnj").map((e) => e.textContent);
    // Traducidas: ni «prone» ni «exhaustion» llegan a la pantalla.
    expect(marcas.join(" ")).not.toContain("prone");
    expect(marcas.join(" ")).not.toContain("exhaustion");
    // Y el nivel solo cuando dice algo: «Derribado 1» sería ruido.
    expect(marcas.some((m) => /\s1$/.test(m ?? ""))).toBe(false);
    expect(marcas.some((m) => /\s3$/.test(m ?? ""))).toBe(true);
  });

  it("no pinta el PG máximo: su fuente única es la ficha", async () => {
    comoDm();
    vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([
      {
        id: "n1",
        name: "Ogro",
        statblockRef: "SRD:ogre",
        currentHp: 30,
        ownerId: "u-dm",
        visibility: "DM_ONLY",
      },
    ]);
    renderPanel();
    const lista = await screen.findByTestId("pnj-en-la-mesa");
    // Ni «30/59» ni «de 59»: derivarlo aquí discreparía de la hoja en cuanto hubiera agotamiento.
    expect(lista.textContent).toContain("30 PG");
    expect(lista.textContent).not.toContain("59");
  });
});

describe("PanelDeBestiario — buscar y filtrar", () => {
  it("filtra por origen", async () => {
    comoDm();
    renderPanel();
    await screen.findByText("Goblin");
    fireEvent.click(screen.getByRole("button", { name: "De la campaña" }));
    expect(screen.queryByText("Goblin")).not.toBeInTheDocument();
    expect(screen.getByText("Dragoncillo de la cripta")).toBeInTheDocument();
  });

  it("busca por nombre, y si no hay nada lo dice sin dejar la pantalla en blanco", async () => {
    comoDm();
    renderPanel();
    await screen.findByText("Goblin");
    fireEvent.change(screen.getByLabelText("Buscar una criatura"), {
      target: { value: "basilisco" },
    });
    expect(screen.getByText(/No hay ninguna criatura que se llame así/i)).toBeInTheDocument();
  });
});

describe("PanelDeBestiario — «¿de qué ficha del mundo es?»", () => {
  it("desplegar, elegir «Garrik» y «Bajar a la mesa» manda el entityId", async () => {
    comoDm();
    const spy = vi.spyOn(bestiarioApi, "instantiateNpc").mockResolvedValue([
      {
        id: "n1",
        name: "Garrik 1",
        statblockRef: "SRD:goblin",
        currentHp: 7,
        ownerId: "u-dm",
        visibility: "DM_ONLY",
        entityId: "garrik-id",
      },
    ]);
    renderPanel();
    await screen.findByText("Goblin");

    // Índice 1: `criaturas` es `[...campaign, ...srd]` (dragoncillo primero), y este PNJ nace
    // de la del SRD — igual que el resto de pruebas de esta sección (ver arriba, índice 1).
    fireEvent.click(screen.getAllByRole("button", { name: /¿De qué ficha del mundo es\?/i })[1]);
    const radio = await screen.findByRole("radio", { name: /Garrik/i });
    fireEvent.click(radio);

    fireEvent.click(screen.getAllByRole("button", { name: /Bajar a la mesa/i })[1]);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith("c1", {
      ref: "SRD:goblin",
      count: 1,
      hp: "AVERAGE",
      entityId: "garrik-id",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(/enlazado con su ficha del mundo/i);
  });
});
