import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Encounter } from "@dnd/shared";
import { TiraDeIniciativa } from "../TiraDeIniciativa";
import type { Character } from "../../characters/api";

// Correcciones de interfaz 2026-09-19, tarea 1 — la frase nueva que ni `capa-de-combate.test.tsx`
// (bloque `ACTIVE`, siempre `round: 2`) cubría: el singular del diálogo de terminar (5.1).
//
// **3.5 (el contador «N de M» también al jugador) se retiró en el fix round 1**: E-N-5
// (docs/decisiones.md) manda — el jugador sigue viendo solo su propio estado, así que el caso que
// vivía aquí («un jugador en la sala de espera ve «2 de 5»») se quitó con el revert.

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
