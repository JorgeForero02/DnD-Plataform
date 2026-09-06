import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmpezarCombate } from "../EmpezarCombate";
import * as encountersApi from "../api";
import type { Character } from "../../characters/api";
import type { NpcEnLaMesa } from "../../bestiario/api";

// Tarea 7 (2026-09-05, iniciativa y bando) — **el diálogo del DM manda los bandos, y deja de
// mentir.** Estas pruebas vivían en `capa-de-combate.test.tsx` («entrar en combate»); se mudan
// aquí porque la tarea cambia lo que ese bloque afirmaba: el botón ya no dice «Tirar iniciativa»
// y el `POST` ya no manda solo `characterIds`.

const THORA: Character = {
  id: "p-thora",
  campaignId: "c1",
  ownerId: "u-ana",
  name: "Thora Piedrahonda",
  race: null,
  class: null,
  raceKey: "dwarf",
  subraceKey: null,
  classKey: "fighter",
  level: 3,
  bio: null,
  visibility: "PLAYERS",
  createdAt: "2026-09-01T10:00:00.000Z",
} as Character;

const GOBLIN_A = { ...THORA, id: "g1", name: "Goblin", ownerId: "u-dm" };

const sylasId = "npc-sylas";
const SYLAS: NpcEnLaMesa = {
  id: sylasId,
  name: "Sylas",
  statblockRef: "SRD:bandit-captain",
  currentHp: 65,
  visibility: "DM_ONLY",
};

const props = {
  campaignId: "c1",
  sessionId: "s1",
  personajes: [THORA],
  pnjs: [SYLAS],
};

async function abrirDialogo() {
  fireEvent.click(screen.getByRole("button", { name: "Entrar en combate" }));
  return screen.findByRole("dialog");
}

function montar(personajes: Character[] = props.personajes, pnjs: NpcEnLaMesa[] = props.pnjs) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <EmpezarCombate
          campaignId={props.campaignId}
          sessionId={props.sessionId}
          personajes={personajes}
          pnjs={pnjs}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("entrar en combate: quién combate y de qué lado", () => {
  it("propone aliado al grupo y enemigo a los PNJ, y se puede cambiar", async () => {
    const empezar = vi.spyOn(encountersApi, "startEncounter").mockResolvedValue({
      id: "e1",
      sessionId: "s1",
      status: "PREPARING",
      round: 1,
      activePosition: null,
      combatants: [],
    });
    montar();
    const dialogo = await abrirDialogo();

    // El grupo entra propuesto como aliado, visible sin tocar nada.
    expect(
      within(dialogo).getByRole("radio", { name: /aliado/i, checked: true }),
    ).toBeInTheDocument();

    // Se eligen los dos combatientes (Thora y Sylas) y se cambia el bando de Sylas a neutral —
    // es la SEGUNDA fila «neutral» de la lista, porque Thora («El grupo») va antes que Sylas
    // («PNJ en la mesa»).
    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /Thora Piedrahonda/ }));
    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /Sylas/ }));
    fireEvent.click(within(dialogo).getAllByRole("radio", { name: /neutral/i })[1]);

    fireEvent.click(within(dialogo).getByRole("button", { name: /pedir iniciativa/i }));

    await waitFor(() =>
      expect(empezar).toHaveBeenCalledWith(
        "c1",
        "s1",
        expect.objectContaining({ sides: expect.objectContaining({ [sylasId]: "NEUTRAL" }) }),
      ),
    );
  });

  it("ya no dice que la iniciativa la tira el servidor", async () => {
    montar();
    const dialogo = await abrirDialogo();

    expect(within(dialogo).queryByText(/la tira el servidor/i)).not.toBeInTheDocument();
    expect(within(dialogo).getByText(/cada jugador tira la suya/i)).toBeInTheDocument();
  });

  it("dice cuántos van a tirar", async () => {
    montar();
    const dialogo = await abrirDialogo();

    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /Thora Piedrahonda/ }));
    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /Sylas/ }));

    expect(within(dialogo).getByText(/2 tirarán su iniciativa/i)).toBeInTheDocument();
  });

  it("manda a quién representa cada uno y el bando de cada uno, y ningún número de iniciativa", async () => {
    const empezar = vi.spyOn(encountersApi, "startEncounter").mockResolvedValue({
      id: "e1",
      sessionId: "s1",
      status: "ACTIVE",
      round: 1,
      activePosition: 0,
      combatants: [],
    });
    montar([THORA, GOBLIN_A], []);
    const dialogo = await abrirDialogo();

    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /Thora Piedrahonda/ }));
    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /Goblin/ }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Pedir iniciativa" }));

    await waitFor(() =>
      expect(empezar).toHaveBeenCalledWith("c1", "s1", {
        characterIds: ["p-thora", "g1"],
        sides: { "p-thora": "ALLY", g1: "ALLY" },
      }),
    );
  });

  it("sin nadie elegido no se puede tirar: un combate de cero combatientes no existe", async () => {
    montar();
    const dialogo = await abrirDialogo();

    expect(within(dialogo).getByRole("button", { name: "Pedir iniciativa" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(within(dialogo).getByText("Nadie elegido todavía")).toBeInTheDocument();
  });

  it("sin ningún personaje en la campaña se dice por qué, en texto que se puede leer", () => {
    montar([], []);
    expect(screen.queryByRole("button", { name: "Entrar en combate" })).not.toBeInTheDocument();
    expect(
      screen.getByText("No hay ningún personaje en esta campaña con el que combatir."),
    ).toBeInTheDocument();
  });

  it("ofrece también los PNJ de la mesa, en su propio grupo, propuestos como enemigos", async () => {
    montar([THORA], [SYLAS]);
    const dialogo = await abrirDialogo();

    expect(within(dialogo).getByText("El grupo")).toBeInTheDocument();
    expect(within(dialogo).getByText("PNJ en la mesa")).toBeInTheDocument();
    // La fila de Sylas propone enemigo, sin que nadie lo haya tocado.
    const filaSylas = within(dialogo).getByRole("checkbox", { name: /Sylas/ }).closest("li")!;
    expect(within(filaSylas).getByRole("radio", { name: /enemigo/i })).toBeChecked();
  });

  it("sin personajes pero CON un PNJ, el combate sigue siendo posible", () => {
    montar([], [SYLAS]);
    expect(
      screen.queryByText("No hay ningún personaje en esta campaña con el que combatir."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar en combate" })).toBeInTheDocument();
  });
});
