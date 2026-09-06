import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Encounter } from "@dnd/shared";
import { FichaDeElenco } from "../FichaDeElenco";
import * as sheetApi from "../../../character-sheet/api";
import * as encountersApi from "../../../encounters/api";
import type { Character } from "../../../characters/api";

// Tarea 10 (2026-09-05, iniciativa y bando) — **corregir el bando desde la ficha del elenco**,
// donde el prototipo ya lo resuelve al empezar el combate («un aliado te traiciona en el segundo
// asalto» es lo que le falta). Ver `.superpowers/sdd/2026-09-05-iniciativa-y-bando/task-10-report.md`.

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
} as Character;

function hoja(): sheetApi.SheetResponse {
  return {
    character: { id: "p-corvin" } as sheetApi.CharacterRow,
    sheet: null,
    hp: { current: 42, max: 58, temp: 0, version: 1, exceedsMax: false },
    deathSaves: {
      successes: 0,
      failures: 0,
      status: "alive",
    } as sheetApi.SheetResponse["deathSaves"],
  };
}

function encuentroTrasCorreccion(): Encounter {
  return {
    id: "enc-1",
    sessionId: "s1",
    status: "ACTIVE",
    round: 2,
    activePosition: 0,
    combatants: [
      { id: "cb-corvin", characterId: "p-corvin", initiative: 18, position: 0, side: "ENEMY" },
    ],
  };
}

function montar(props: Partial<Parameters<typeof FichaDeElenco>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <FichaDeElenco
        campaignId="c1"
        personaje={CORVIN}
        puedeCambiarPg={false}
        conMandos
        enCombate
        bando="ALLY"
        sessionId="s1"
        encounterId="enc-1"
        combatanteId="cb-corvin"
        {...props}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(sheetApi, "fetchSheet").mockResolvedValue(hoja());
  vi.spyOn(sheetApi, "fetchConditions").mockResolvedValue([]);
});

describe("el DM corrige el bando desde la ficha del elenco (tarea 10)", () => {
  it("un aliado se marca enemigo, y el servidor recibe el combatiente correcto", async () => {
    const cambiarBando = vi
      .spyOn(encountersApi, "setSide")
      .mockResolvedValue(encuentroTrasCorreccion());

    montar();

    expect(await screen.findByRole("group", { name: "Bando de Corvin Vhael" })).toBeInTheDocument();
    // El bando actual se ve, no solo se infiere del color (regla vinculante de la interfaz).
    expect(screen.getByRole("button", { name: /Aliado \(su bando actual\)/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /^Enemigo/i }));

    await waitFor(() =>
      expect(cambiarBando).toHaveBeenCalledWith("c1", "s1", "enc-1", "cb-corvin", {
        side: "ENEMY",
      }),
    );
  });

  it("el jugador no ve el mando de bando: la puerta está en el servidor, no en el botón", () => {
    montar({ conMandos: false });

    expect(screen.queryByRole("group", { name: "Bando de Corvin Vhael" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enemigo/i })).not.toBeInTheDocument();
  });

  it("fuera de combate no hay bando que corregir: el mando no se pinta", () => {
    montar({ enCombate: false, bando: undefined, encounterId: undefined, combatanteId: undefined });

    expect(screen.queryByRole("group", { name: /Bando de/i })).not.toBeInTheDocument();
  });
});
