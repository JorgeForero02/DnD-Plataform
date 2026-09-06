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
//
// Ronda de arreglo 1 (revisión de `c8395ec`) — el contador volvía a mentir («N tirarán su
// iniciativa» cuando quien tira es una sola persona por grupo de idénticos) y los radios de
// bando no decían de quién eran para quien tabula. Se corrige aquí: el contador vuelve a
// «combatientes» y cada terna de radios vive en su propio `radiogroup` con nombre.

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

    // La terna de bando solo aparece para quien ya está elegido (m-6): antes de marcar a nadie
    // no hay ningún radio en la pantalla.
    expect(within(dialogo).queryAllByRole("radio")).toHaveLength(0);

    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /Thora Piedrahonda/ }));
    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /Sylas/ }));

    // El grupo entra propuesto como aliado, y el PNJ como enemigo, visible sin tocar nada.
    const grupoDeThora = within(dialogo).getByRole("radiogroup", {
      name: "Bando de Thora Piedrahonda",
    });
    const grupoDeSylas = within(dialogo).getByRole("radiogroup", { name: "Bando de Sylas" });
    expect(within(grupoDeThora).getByRole("radio", { name: /aliado/i })).toBeChecked();
    expect(within(grupoDeSylas).getByRole("radio", { name: /enemigo/i })).toBeChecked();

    // Se cambia el bando de Sylas a neutral, dentro de SU radiogroup — no hace falta adivinar
    // qué posición ocupa entre los doce radios de la pantalla.
    fireEvent.click(within(grupoDeSylas).getByRole("radio", { name: /neutral/i }));

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

  it("dice cuántos combatientes hay elegidos, sin afirmar quién tira", async () => {
    // La pantalla no sabe quién es el dueño de cada PNJ ni si comparte tirada con otro idéntico
    // (eso lo decide el servidor con datos que aquí no llegan): el contador dice «combatientes»,
    // no «tirarán su iniciativa».
    montar();
    const dialogo = await abrirDialogo();

    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /Thora Piedrahonda/ }));
    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /Sylas/ }));

    expect(within(dialogo).getByText("2 combatientes")).toBeInTheDocument();
    expect(within(dialogo).queryByText(/tirará/i)).not.toBeInTheDocument();
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

  it("desmarcar a alguien lo saca del cuerpo entero de la petición, no solo de la lista visible", async () => {
    // Objeto EXACTO (no `objectContaining`): si `characterIds` o `sides` llevaran a Goblin
    // después de desmarcarlo, esta prueba lo vería.
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

    const cajaThora = within(dialogo).getByRole("checkbox", { name: /Thora Piedrahonda/ });
    const cajaGoblin = within(dialogo).getByRole("checkbox", { name: /Goblin/ });
    fireEvent.click(cajaThora);
    fireEvent.click(cajaGoblin);
    fireEvent.click(cajaGoblin); // se desmarca: Goblin ya no combate

    fireEvent.click(within(dialogo).getByRole("button", { name: "Pedir iniciativa" }));

    await waitFor(() =>
      expect(empezar).toHaveBeenCalledWith("c1", "s1", {
        characterIds: ["p-thora"],
        sides: { "p-thora": "ALLY" },
      }),
    );
  });

  it("sin nadie elegido no se puede tirar: un combate de cero combatientes no existe", async () => {
    montar();
    const dialogo = await abrirDialogo();

    const boton = within(dialogo).getByRole("button", { name: "Pedir iniciativa" });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    const recuento = within(dialogo).getByText("Nadie elegido todavía");
    expect(recuento).toBeInTheDocument();
    // El motivo del apagado está asociado al botón, no solo escrito al lado: quien usa lector
    // de pantalla lo oye al llegar al botón, no tiene que encontrarlo por su cuenta.
    expect(boton).toHaveAttribute("aria-describedby", recuento.id);
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

    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /Sylas/ }));
    const grupoDeSylas = within(dialogo).getByRole("radiogroup", { name: "Bando de Sylas" });
    expect(within(grupoDeSylas).getByRole("radio", { name: /enemigo/i })).toBeChecked();
  });

  it("sin personajes pero CON un PNJ, el combate sigue siendo posible", () => {
    montar([], [SYLAS]);
    expect(
      screen.queryByText("No hay ningún personaje en esta campaña con el que combatir."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar en combate" })).toBeInTheDocument();
  });
});
