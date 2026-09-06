import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Encounter } from "@dnd/shared";
import { TiraDeIniciativa } from "../TiraDeIniciativa";
import * as encountersApi from "../api";
import * as membersApi from "../../campaigns/members";
import * as rollRequestsApi from "../../roll-requests/api";
import type { RollRequestRow } from "../../roll-requests/api";
import type { Character } from "../../characters/api";

// Tarea 8 (2026-09-05, iniciativa y bando) — **la sala de espera**: lo que sustituye al orden de
// turnos mientras el encuentro está `PREPARING`. Lo que se prueba aquí es lo que la pantalla
// ENSEÑA y lo que MANDA al servidor; lo que solo se ve maquetado se mide en el navegador
// (docs/04-convenciones.md).

const MARTA: Character = {
  id: "p-marta",
  campaignId: "c1",
  ownerId: "u-marta",
  name: "Fenwick",
  race: null,
  class: null,
  raceKey: null,
  subraceKey: null,
  classKey: null,
  level: 3,
  bio: null,
  visibility: "PLAYERS",
  createdAt: "2026-09-01T10:00:00.000Z",
} as Character;

const KEVIN: Character = { ...MARTA, id: "p-kevin", ownerId: "u-kevin", name: "Borin" };
const GOBLIN_A = { ...MARTA, id: "g1", ownerId: "u-dm", name: "Goblin" };
const GOBLIN_B = { ...GOBLIN_A, id: "g2" };

/** Cuatro combatientes: dos del DM ya tirados, dos jugadores todavía sin responder. */
const PREPARANDO: Encounter = {
  id: "e1",
  sessionId: "s1",
  status: "PREPARING",
  round: 1,
  activePosition: 0,
  combatants: [
    { id: "cb1", characterId: "p-marta", initiative: 0, position: 0, side: "ALLY" as const },
    { id: "cb2", characterId: "p-kevin", initiative: 0, position: 0, side: "ALLY" as const },
    { id: "cb3", characterId: "g1", initiative: 14, position: 0, side: "ENEMY" as const },
    { id: "cb4", characterId: "g2", initiative: 9, position: 0, side: "ENEMY" as const },
  ],
};

const PETICION_MARTA: RollRequestRow = {
  id: "rr1",
  campaignId: "c1",
  characterId: "p-marta",
  requestedById: "u-dm",
  key: "initiative",
  label: "Iniciativa",
  dc: null,
  mode: "NORMAL",
  audience: "PUBLIC",
  createdAt: "2026-09-05T10:00:00.000Z",
  resolvedAt: null,
  resolvedEventId: null,
  encounterId: "e1",
};

const PETICION_KEVIN: RollRequestRow = { ...PETICION_MARTA, id: "rr2", characterId: "p-kevin" };

function montarSala(
  encuentro: Encounter = PREPARANDO,
  esDm = true,
  peticiones: RollRequestRow[] = [PETICION_MARTA, PETICION_KEVIN],
) {
  vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
    { userId: "u-marta", displayName: "Marta", role: "PLAYER" },
    { userId: "u-kevin", displayName: "Kevin", role: "PLAYER" },
    { userId: "u-dm", displayName: "El DM", role: "DM" },
  ]);
  vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue(peticiones);

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TiraDeIniciativa
          campaignId="c1"
          sessionId="s1"
          encuentro={encuentro}
          personajes={[MARTA, KEVIN, GOBLIN_A, GOBLIN_B]}
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

describe("la sala de espera: quién ha tirado y a quién se espera", () => {
  it("cuenta quién ha tirado y nombra AL JUGADOR, no al personaje", async () => {
    montarSala();

    expect(await screen.findByText("2 de 4")).toBeInTheDocument();
    // «Marta», no «Fenwick»: quien tarda es una persona, y al DM le hace falta saber a quién
    // mirar, no qué ficha rellenar.
    expect(screen.getByText(/esperando a marta/i)).toBeInTheDocument();
    expect(screen.queryByText(/fenwick/i)).not.toBeInTheDocument();
  });

  it("el estado se lee con la palabra del vocabulario compartido, no escrita a mano", async () => {
    montarSala();
    // `NOMBRE_ESTADO_DE_COMBATE.PREPARING` (dominio/combate.ts): si el vocabulario cambia de
    // frase, esta pantalla la sigue sin que nadie la toque a mano aquí.
    expect(await screen.findByRole("region", { name: "Preparando combate" })).toBeInTheDocument();
  });

  it("un jugador no ve la cuenta exacta ni los nombres de los demás: solo su propio estado", async () => {
    // El servidor solo le manda SUS peticiones (RollRequestsService.list): a Kevin no le llega
    // la de Marta.
    montarSala(PREPARANDO, false, [PETICION_KEVIN]);

    await screen.findByText(/todavía te falta tirar tu iniciativa/i);
    expect(screen.queryByText("2 de 4")).not.toBeInTheDocument();
    expect(screen.queryByText(/esperando a/i)).not.toBeInTheDocument();
  });

  it("el jugador no ve los botones del DM", async () => {
    montarSala(PREPARANDO, false);

    await screen.findByText(/todavía te falta tirar tu iniciativa/i);
    expect(screen.queryByRole("button", { name: /empezar igualmente/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });

  it("el DM empieza igualmente contra la API de verdad", async () => {
    const espia = vi
      .spyOn(encountersApi, "forceStartEncounter")
      .mockResolvedValue({ ...PREPARANDO, status: "ACTIVE" });
    montarSala();

    await screen.findByText("2 de 4");
    fireEvent.click(screen.getByRole("button", { name: /empezar igualmente/i }));

    await waitFor(() => expect(espia).toHaveBeenCalledWith("c1", "s1", "e1"));
  });

  it("cancelar dice la consecuencia antes de borrar nada", async () => {
    const espia = vi.spyOn(encountersApi, "cancelEncounter").mockResolvedValue(undefined);
    montarSala();

    await screen.findByText("2 de 4");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(espia).not.toHaveBeenCalled();

    const dialogo = await screen.findByRole("dialog");
    expect(dialogo).toHaveTextContent(/se borra el combate entero/i);
    expect(dialogo).toHaveTextContent(/tampoco queda rastro en el registro/i);

    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar el combate" }));
    await waitFor(() => expect(espia).toHaveBeenCalledWith("c1", "s1", "e1"));
  });
});
