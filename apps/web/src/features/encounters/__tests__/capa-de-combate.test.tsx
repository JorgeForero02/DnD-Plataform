import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Encounter } from "@dnd/shared";
import { TiraDeIniciativa } from "../TiraDeIniciativa";
import { EmpezarCombate } from "../EmpezarCombate";
import * as encountersApi from "../api";
import type { Character } from "../../characters/api";
import type { NpcEnLaMesa } from "../../bestiario/api";

// Tarea 2.5.6 — la capa de combate. Lo que se prueba aquí es lo que la capa **hace**: qué se puede
// tocar, qué se manda al servidor y qué NO se enseña. Lo que solo se ve maquetado (que la tira no
// arrastre la página a lo ancho, que el turno actual se distinga) se mide en el navegador.

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
const GOBLIN_B = { ...GOBLIN_A, id: "g2" };

/** Un personaje en la posición 0 y dos goblins compartiendo la 1: dos turnos, tres filas. */
const ENCUENTRO: Encounter = {
  id: "e1",
  sessionId: "s1",
  status: "ACTIVE",
  round: 2,
  activePosition: 0,
  combatants: [
    // `side` desde el plan 02: el bando lo dice el DM al empezar el encuentro. Esta pantalla
    // todavía no lo pinta —el dato llega y no se usa—, así que aquí solo hace falta para que el
    // fixture tenga la forma que el servidor devuelve de verdad.
    { id: "cb1", characterId: "p-thora", initiative: 18, position: 0, side: "ALLY" as const },
    { id: "cb2", characterId: "g1", initiative: 11, position: 1, side: "ENEMY" as const },
    { id: "cb3", characterId: "g2", initiative: 11, position: 1, side: "ENEMY" as const },
  ],
};

/**
 * **Un PNJ en la mesa, que NO sale en `GET /characters`.** Esa lista es «quién se sienta a la
 * mesa» y excluye los PNJ instanciados a propósito (2D.6), así que el orden de turnos solo sabe
 * su nombre si se le pasa esta segunda lista. Sin ella los llamaba «Alguien», también al DM.
 */
const KLARG: NpcEnLaMesa = {
  id: "npc-klarg",
  name: "Klarg",
  statblockRef: "CAMPAIGN:cap",
  currentHp: 27,
  visibility: "DM_ONLY",
};

function montarTira(encuentro: Encounter = ENCUENTRO, esDm = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TiraDeIniciativa
          campaignId="c1"
          sessionId="s1"
          encuentro={encuentro}
          personajes={[THORA, GOBLIN_A, GOBLIN_B]}
          pnjs={[KLARG]}
          esDm={esDm}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("la tira de iniciativa: el orden, y quién está actuando", () => {
  it("los que comparten posición son UN turno, no dos filas", async () => {
    montarTira();

    const tira = screen.getByRole("region", { name: "Orden de turnos" });
    const turnos = within(tira).getAllByRole("listitem");
    // Tres combatientes, **dos** turnos: los dos goblins actúan a la vez, que es lo que dice el
    // SRD de un grupo de criaturas idénticas. Contar filas daría tres y sería el error.
    expect(turnos).toHaveLength(2);
    expect(turnos[1]).toHaveTextContent("Goblin · Goblin");
  });

  it("el turno actual se marca con un rótulo, no solo con un color", () => {
    montarTira();

    const turnos = within(screen.getByRole("region", { name: "Orden de turnos" })).getAllByRole(
      "listitem",
    );
    expect(turnos[0]).toHaveAttribute("aria-current", "step");
    // **El color no es portador único de significado**: la palabra tiene que estar ahí.
    expect(turnos[0]).toHaveTextContent("Le toca");
    expect(turnos[1]).not.toHaveAttribute("aria-current");
    expect(turnos[1]).not.toHaveTextContent("Le toca");
  });

  it("el asalto se dice, porque es lo que la mesa apunta en un papel", () => {
    montarTira();
    expect(screen.getByRole("region", { name: "Orden de turnos" })).toHaveTextContent("Asalto 2");
  });

  it("cuando el turno es de alguien que no ves, se dice en vez de dejar la tira sin marcar", () => {
    // El servidor manda `activePosition: null` cuando el turno toca a un PNJ escondido.
    montarTira({ ...ENCUENTRO, activePosition: null }, false);

    expect(screen.getByText("Le toca a alguien que no ves.")).toBeInTheDocument();
    const turnos = within(screen.getByRole("region", { name: "Orden de turnos" })).getAllByRole(
      "listitem",
    );
    expect(turnos.some((t) => t.getAttribute("aria-current") === "step")).toBe(false);
  });
});

describe("quién puede tocar el combate", () => {
  it("el jugador no ve pasar turno, ni terminar, ni corregir", () => {
    montarTira(ENCUENTRO, false);

    expect(screen.queryByRole("button", { name: "Pasar turno" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Terminar el combate" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Corregir la iniciativa/ }),
    ).not.toBeInTheDocument();
    // Pero sí ve el orden: saber cuándo te toca es justo para lo que sirve.
    expect(screen.getByRole("region", { name: "Orden de turnos" })).toHaveTextContent(
      "Thora Piedrahonda",
    );
  });

  it("el DM pasa turno contra la API de verdad", async () => {
    const espia = vi.spyOn(encountersApi, "advanceTurn").mockResolvedValue(ENCUENTRO);
    montarTira();

    fireEvent.click(screen.getByRole("button", { name: "Pasar turno" }));

    await waitFor(() => expect(espia).toHaveBeenCalledWith("c1", "s1", "e1"));
  });

  it("terminar el combate pide confirmación antes, porque quita la tira de la mesa", async () => {
    const espia = vi.spyOn(encountersApi, "endEncounter").mockResolvedValue({
      id: "e1",
      status: "ENDED",
    });
    montarTira();

    fireEvent.click(screen.getByRole("button", { name: "Terminar el combate" }));
    expect(espia).not.toHaveBeenCalled();

    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Terminar el combate" }));
    await waitFor(() => expect(espia).toHaveBeenCalledWith("c1", "s1", "e1"));
  });

  it("corregir una iniciativa manda el número al combatiente que se pulsó, no al primero", async () => {
    const espia = vi.spyOn(encountersApi, "setInitiative").mockResolvedValue(ENCUENTRO);
    montarTira();

    // Se corrige el turno de los goblins: su combatiente es `cb2`, no `cb1`.
    fireEvent.click(
      screen.getByRole("button", { name: "Corregir la iniciativa de Goblin · Goblin" }),
    );
    const dialogo = await screen.findByRole("dialog");
    const campo = within(dialogo).getByLabelText("Iniciativa");
    // El valor precargado es el suyo (11), no el de Thora (18): si no lo fuera, no distinguiría.
    expect(campo).toHaveValue(11);

    fireEvent.change(campo, { target: { value: "19" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(espia).toHaveBeenCalledWith("c1", "s1", "e1", "cb2", { initiative: 19 }),
    );
  });
});

describe("entrar en combate", () => {
  function montarEmpezar(personajes: Character[] = [THORA, GOBLIN_A], pnjs: NpcEnLaMesa[] = []) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <EmpezarCombate campaignId="c1" sessionId="s1" personajes={personajes} pnjs={pnjs} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("manda a quién representa cada uno, y ningún número: la iniciativa la tira el servidor", async () => {
    const espia = vi.spyOn(encountersApi, "startEncounter").mockResolvedValue(ENCUENTRO);
    montarEmpezar();

    fireEvent.click(screen.getByRole("button", { name: "Entrar en combate" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /Thora Piedrahonda/ }));
    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /Goblin/ }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Tirar iniciativa" }));

    await waitFor(() =>
      expect(espia).toHaveBeenCalledWith("c1", "s1", { characterIds: ["p-thora", "g1"] }),
    );
  });

  it("sin nadie elegido no se puede tirar: un combate de cero combatientes no existe", async () => {
    montarEmpezar();

    fireEvent.click(screen.getByRole("button", { name: "Entrar en combate" }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByRole("button", { name: "Tirar iniciativa" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(within(dialogo).getByText("Nadie elegido todavía")).toBeInTheDocument();
  });

  it("sin ningún personaje en la campaña se dice por qué, en texto que se puede leer", () => {
    // **No un botón deshabilitado con el motivo en un `title`**: un botón deshabilitado no recibe
    // foco, así que ese tooltip no lo alcanza nadie con teclado ni con lector de pantalla. La
    // versión anterior lo hacía así y esta prueba afirmaba sobre algo que el usuario no percibe.
    montarEmpezar([]);
    expect(screen.queryByRole("button", { name: "Entrar en combate" })).not.toBeInTheDocument();
    expect(
      screen.getByText("No hay ningún personaje en esta campaña con el que combatir."),
    ).toBeInTheDocument();
  });

  // --- Lo que encontró un paseo de uso sobre la campaña de demostración, no una prueba ---

  it("ofrece también los PNJ de la mesa, en su propio grupo", async () => {
    const espia = vi.spyOn(encountersApi, "startEncounter").mockResolvedValue(ENCUENTRO);
    montarEmpezar([THORA], [KLARG]);

    fireEvent.click(screen.getByRole("button", { name: "Entrar en combate" }));
    const dialogo = await screen.findByRole("dialog");
    expect(within(dialogo).getByText("El grupo")).toBeInTheDocument();
    expect(within(dialogo).getByText("PNJ en la mesa")).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /Thora/ }));
    fireEvent.click(within(dialogo).getByRole("checkbox", { name: /Klarg/ }));
    fireEvent.click(within(dialogo).getByRole("button", { name: "Tirar iniciativa" }));

    // **Un PNJ entra al combate por su id de personaje**, igual que cualquiera: es una fila de
    // `Character`, y esa decisión es la que hace barata toda la fase 2D.
    await waitFor(() =>
      expect(espia).toHaveBeenCalledWith("c1", "s1", { characterIds: ["p-thora", "npc-klarg"] }),
    );
  });

  it("sin personajes pero CON un PNJ, el combate sigue siendo posible", async () => {
    montarEmpezar([], [KLARG]);
    expect(
      screen.queryByText("No hay ningún personaje en esta campaña con el que combatir."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar en combate" })).toBeInTheDocument();
  });
});

describe("el nombre de un PNJ en el orden de turnos", () => {
  it("se lee, en vez de «Alguien»", () => {
    const conPnj: Encounter = {
      ...ENCUENTRO,
      combatants: [
        { id: "cb1", characterId: "p-thora", initiative: 18, position: 0, side: "ALLY" as const },
        { id: "cb9", characterId: "npc-klarg", initiative: 9, position: 1, side: "ENEMY" as const },
      ],
    };
    montarTira(conPnj);
    const tira = screen.getByRole("region", { name: "Orden de turnos" });
    expect(within(tira).getByText("Klarg")).toBeInTheDocument();
    expect(within(tira).queryByText("Alguien")).not.toBeInTheDocument();
  });

  it("y un PNJ que el jugador NO puede ver sigue siendo «Alguien» para él", () => {
    // La lista de PNJ llega ya filtrada por el servidor: lo que no se puede ver, no viaja. Aquí
    // se simula pasándola vacía, que es exactamente lo que recibe ese jugador.
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <TiraDeIniciativa
            campaignId="c1"
            sessionId="s1"
            encuentro={{
              ...ENCUENTRO,
              combatants: [
                {
                  id: "cb9",
                  characterId: "npc-klarg",
                  initiative: 9,
                  position: 0,
                  side: "ENEMY" as const,
                },
              ],
            }}
            personajes={[THORA]}
            pnjs={[]}
            esDm={false}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const tira = screen.getByRole("region", { name: "Orden de turnos" });
    expect(within(tira).getByText("Alguien")).toBeInTheDocument();
  });
});
