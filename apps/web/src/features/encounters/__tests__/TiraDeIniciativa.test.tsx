import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Encounter } from "@dnd/shared";
import { TiraDeIniciativa } from "../TiraDeIniciativa";
import * as membersApi from "../../campaigns/members";
import * as rollRequestsApi from "../../roll-requests/api";
import type { RollRequestRow } from "../../roll-requests/api";
import type { Character } from "../../characters/api";
import { useAuthStore } from "../../../store/auth.store";

// Correcciones de interfaz 2026-09-19, tarea 1 — las dos frases nuevas que ni
// `capa-de-combate.test.tsx` (bloque `ACTIVE`, siempre `round: 2`) ni `SalaDeEspera.test.tsx`
// (siempre 4 combatientes) cubrían: el singular del diálogo de terminar (5.1) y que el contador
// también se pinta al jugador, no solo al DM (3.5).

const THORA: Character = {
  id: "p-thora",
  campaignId: "c1",
  ownerId: "u-ana",
  name: "Thora Piedrahonda",
  raceKey: "dwarf",
  subraceKey: null,
  classKey: "fighter",
  level: 3,
  bio: null,
  visibility: "PLAYERS",
  createdAt: "2026-09-01T10:00:00.000Z",
} as Character;

const SIN_GASTAR = { actionUsed: false, bonusUsed: false, reactionUsed: false, movementUsed: 0 };
const EN_PIE = { ...SIN_GASTAR, derrotado: false };

/** Un único combatiente, en su primer asalto: es el caso que hace singular la frase (5.1). */
const ENCUENTRO_ASALTO_1: Encounter = {
  id: "e1",
  sessionId: "s1",
  status: "ACTIVE",
  round: 1,
  activePosition: 0,
  finalPropuesto: false,
  combatants: [
    {
      id: "cb1",
      characterId: "p-thora",
      initiative: 18,
      position: 0,
      side: "ALLY" as const,
      ...EN_PIE,
    },
  ],
};

function montarTira(encuentro: Encounter, esDm = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TiraDeIniciativa
          campaignId="c1"
          sessionId="s1"
          encuentro={encuentro}
          personajes={[THORA]}
          pnjs={[]}
          esDm={esDm}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("terminar el combate: la frase del asalto (5.1)", () => {
  it("con round: 1 el diálogo dice «su asalto», no «sus 1 asaltos»", () => {
    montarTira(ENCUENTRO_ASALTO_1);

    fireEvent.click(screen.getByRole("button", { name: "Terminar el combate" }));

    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toHaveTextContent("queda con su asalto y su rastro en el registro.");
    expect(dialogo).not.toHaveTextContent(/sus 1 asalto/i);
  });
});

describe("la sala de espera: el contador también al jugador (3.5)", () => {
  /** Cinco combatientes: Thora ya tiró, los otros cuatro (PNJ del DM) todavía no. */
  const PREPARANDO_CINCO: Encounter = {
    id: "e2",
    sessionId: "s1",
    status: "PREPARING",
    round: 1,
    activePosition: 0,
    finalPropuesto: false,
    combatants: [
      {
        id: "cb1",
        characterId: "p-thora",
        initiative: 12,
        position: 0,
        side: "ALLY" as const,
        ...SIN_GASTAR,
        derrotado: false,
      },
      {
        id: "cb2",
        characterId: "n1",
        initiative: 0,
        position: 0,
        side: "ENEMY" as const,
        ...SIN_GASTAR,
        derrotado: false,
      },
      {
        id: "cb3",
        characterId: "n2",
        initiative: 0,
        position: 0,
        side: "ENEMY" as const,
        ...SIN_GASTAR,
        derrotado: false,
      },
      {
        id: "cb4",
        characterId: "n3",
        initiative: 0,
        position: 0,
        side: "ENEMY" as const,
        ...SIN_GASTAR,
        derrotado: false,
      },
      {
        id: "cb5",
        characterId: "n4",
        initiative: 0,
        position: 0,
        side: "ENEMY" as const,
        ...SIN_GASTAR,
        derrotado: false,
      },
    ],
  };

  /** Petición base de iniciativa, sin resolver. */
  const PETICION_BASE: RollRequestRow = {
    id: "rr1",
    campaignId: "c1",
    characterId: "p-thora",
    requestedById: "u-dm",
    key: "initiative",
    label: "Iniciativa",
    dc: null,
    mode: "NORMAL",
    audience: "PUBLIC",
    createdAt: "2026-09-19T10:00:00.000Z",
    resolvedAt: null,
    resolvedEventId: null,
    encounterId: "e2",
  };

  it("un jugador en la sala de espera ve «2 de 5»", async () => {
    // `montarTira` monta directamente `TiraDeIniciativa` con lo que `fetchRollRequests` devuelva
    // aquí — igual que hace `SalaDeEspera.test.tsx` —, así que esta prueba es sobre la cuenta y
    // la visibilidad (3.5: el número se pinta también al jugador), no sobre qué recorta el
    // servidor por dueño. Con 3 de los 5 combatientes todavía pendientes, «2 de 5» ya han tirado.
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "u-ana", displayName: "Ana", role: "PLAYER" },
    ]);
    vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([
      { ...PETICION_BASE, id: "rr1", characterId: "n1" },
      { ...PETICION_BASE, id: "rr2", characterId: "n2" },
      { ...PETICION_BASE, id: "rr3", characterId: "n3" },
    ]);
    useAuthStore.setState({ user: { id: "u-ana", email: "x@y.z", displayName: "Ana" } as never });

    montarTira(PREPARANDO_CINCO, false);

    expect(await screen.findByText("2 de 5")).toBeInTheDocument();
    expect(screen.queryByText(/esperando a/i)).not.toBeInTheDocument();
  });
});
