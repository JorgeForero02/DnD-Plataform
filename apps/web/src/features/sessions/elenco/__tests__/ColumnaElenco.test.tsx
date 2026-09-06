import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Encounter } from "@dnd/shared";
import { ColumnaElenco } from "../ColumnaElenco";
import * as sessionsApi from "../../api";
import * as encountersApi from "../../../encounters/api";
import * as charactersApi from "../../../characters/api";
import * as membersApi from "../../../campaigns/members";
import * as sheetApi from "../../../character-sheet/api";
import type { NpcEnLaMesa } from "../../../bestiario/api";
import { useAuthStore } from "../../../../store/auth.store";

// Tarea 9b (2026-09-06) — **la queja original era literal: «no veo cómo quitarles vida».**
//
// `useCharacters` es «quién se sienta a la mesa» a propósito (`characters.service.ts`,
// `statblockRef: null`), así que un PNJ nunca ha pisado esta columna. El dato ya lo trae
// `MesaDeSesion.tsx` (`useNpcs`) para el orden de turnos y el diálogo de combate; esto prueba que
// también llega al elenco, y que sus mandos escriben contra EL PNJ, no contra un personaje.

const SESION: sessionsApi.Session = {
  id: "s1",
  campaignId: "c1",
  title: "El puerto en llamas",
  scheduledAt: null,
  notes: null,
  visibility: "PLAYERS",
  createdAt: "2026-09-02T20:00:00.000Z",
  status: "IN_PROGRESS",
  startedAt: "2026-09-02T20:00:00.000Z",
  endedAt: null,
  attendance: null,
};

const CORVIN = {
  id: "p-corvin",
  campaignId: "c1",
  ownerId: "u-ana",
  name: "Corvin Vhael",
  race: null,
  class: null,
  raceKey: "human",
  subraceKey: null,
  classKey: "rogue",
  level: 5,
  bio: null,
  visibility: "PLAYERS",
  color: null,
  createdAt: "2026-09-01T10:00:00.000Z",
  archivedAt: null,
} as charactersApi.Character;

const GOBLIN: NpcEnLaMesa = {
  id: "n-goblin",
  name: "Goblin capataz",
  statblockRef: "srd-goblin",
  currentHp: 7,
  visibility: "PLAYERS",
  conditions: [],
};

function encuentroActivo(): Encounter {
  return {
    id: "enc-1",
    sessionId: "s1",
    status: "ACTIVE",
    round: 1,
    activePosition: 0,
    combatants: [
      { id: "cb-corvin", characterId: "p-corvin", initiative: 18, position: 0, side: "ALLY" },
      { id: "cb-goblin", characterId: "n-goblin", initiative: 9, position: 1, side: "ENEMY" },
    ],
  };
}

function hoja(current: number, max: number): sheetApi.SheetResponse {
  return {
    character: { id: "x" } as sheetApi.CharacterRow,
    sheet: null,
    hp: { current, max, temp: 0, version: 1, exceedsMax: false },
    deathSaves: {
      successes: 0,
      failures: 0,
      status: "alive",
    } as sheetApi.SheetResponse["deathSaves"],
  };
}

function montar(pnjs: NpcEnLaMesa[] | undefined, esDm = true) {
  useAuthStore.setState({ user: { id: "u-dm", email: "x@y.z", displayName: "Yo" } as never });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ColumnaElenco campaignId="c1" asistencia={null} esDm={esDm} pnjs={pnjs} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(SESION);
  vi.spyOn(encountersApi, "fetchCurrentEncounter").mockResolvedValue(encuentroActivo());
  vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([CORVIN]);
  vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
    { userId: "u-dm", displayName: "Ada", role: "DM" },
    { userId: "u-ana", displayName: "Ana", role: "PLAYER" },
  ]);
  vi.spyOn(sheetApi, "fetchSheet").mockImplementation(async (_c, characterId) =>
    characterId === "n-goblin" ? hoja(7, 12) : hoja(42, 58),
  );
  vi.spyOn(sheetApi, "fetchConditions").mockResolvedValue([]);
});

describe("el elenco enseña a los PNJ combatientes (tarea 9b)", () => {
  it("con un encuentro en marcha, la columna enseña al PNJ combatiente y sus mandos responden", async () => {
    const cambiarPg = vi.spyOn(sheetApi, "changeHp").mockResolvedValue(hoja(2, 12));

    montar([GOBLIN]);

    const elenco = await screen.findByText("PNJ en combate");
    expect(elenco).toBeInTheDocument();
    expect(await screen.findByText("Goblin capataz")).toBeInTheDocument();
    // El bando se dice con palabra, no con color (regla vinculante de la interfaz).
    expect(screen.getByText(/PNJ · Enemigo/)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Daño a Goblin capataz" }));
    fireEvent.change(await screen.findByLabelText("Cuánto daño"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar daño" }));

    await waitFor(() => expect(cambiarPg).toHaveBeenCalledWith("c1", "n-goblin", { delta: -5 }));
  });

  it("un jugador ve al PNJ pero no lleva mandos sobre él", async () => {
    montar([GOBLIN], false);

    expect(await screen.findByText("Goblin capataz")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Daño a Goblin capataz" })).not.toBeInTheDocument();
  });

  it("**mutación**: sin la lista de PNJ, el combatiente desaparece de la columna", async () => {
    montar(undefined);

    await screen.findByText("Corvin Vhael");
    expect(screen.queryByText("PNJ en combate")).not.toBeInTheDocument();
    expect(screen.queryByText("Goblin capataz")).not.toBeInTheDocument();
  });
});
