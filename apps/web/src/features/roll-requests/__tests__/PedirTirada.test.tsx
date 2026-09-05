import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PedirTirada } from "../PedirTirada";
import * as rollRequestsApi from "../api";
import type { RollRequestRow } from "../api";
import * as charactersApi from "../../characters/api";
import type { Character } from "../../characters/api";

// Tarea 2C.5 — el formulario con el que el DM pide. Se prueba **lo que puede romperse en
// silencio**:
//
//  · que se manda la clave de la hoja y no una expresión montada en el navegador;
//  · que se mandan **todos** los personajes marcados, no el último ni el primero;
//  · que la guía de CD del SRD **rellena** el campo y no lo sustituye — que es la diferencia
//    entre una ayuda y una jaula, y la razón por la que el SRD la llama guía.

const CAMPANA = "camp-1";

function personaje(id: string, name: string): Character {
  return {
    id,
    campaignId: CAMPANA,
    ownerId: "u1",
    name,
    race: null,
    class: null,
    raceKey: null,
    subraceKey: null,
    classKey: null,
    level: 1,
    bio: null,
    visibility: "PLAYERS",
    createdAt: "2026-01-01",
    archivedAt: null,

    color: null,
  };
}

const PETICION_CREADA: RollRequestRow = {
  id: "req-1",
  campaignId: CAMPANA,
  characterId: "ch-1",
  requestedById: "dm1",
  key: "skill.perception",
  label: "Percepción para ver si oís al posadero",
  dc: 15,
  mode: "NORMAL",
  audience: "PUBLIC",
  createdAt: "2026-01-01",
  resolvedAt: null,
  resolvedEventId: null,
};

function pintar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <PedirTirada campaignId={CAMPANA} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([
    personaje("ch-1", "Brann"),
    personaje("ch-2", "Lía"),
  ]);
  vi.spyOn(rollRequestsApi, "fetchDifficultyClasses").mockResolvedValue([
    { key: "very-easy", dc: 5 },
    { key: "easy", dc: 10 },
    { key: "medium", dc: 15 },
    { key: "hard", dc: 20 },
    { key: "very-hard", dc: 25 },
    { key: "nearly-impossible", dc: 30 },
  ]);
});

describe("PedirTirada", () => {
  it("manda los personajes elegidos, la clave, la frase y la CD", async () => {
    const pedir = vi
      .spyOn(rollRequestsApi, "createRollRequest")
      .mockResolvedValue([
        PETICION_CREADA,
        { ...PETICION_CREADA, id: "req-2", characterId: "ch-2" },
      ]);

    pintar();
    await screen.findByLabelText("Brann");

    fireEvent.click(screen.getByLabelText("Brann"));
    fireEvent.click(screen.getByLabelText("Lía"));
    fireEvent.change(screen.getByLabelText("Qué le pides"), { target: { value: "skill.stealth" } });
    fireEvent.change(screen.getByLabelText("Qué se le dice"), {
      target: { value: "Sigilo para pasar junto al perro" },
    });
    fireEvent.change(screen.getByLabelText("CD (opcional)"), { target: { value: "17" } });
    fireEvent.click(screen.getByRole("radio", { name: "Ventaja" }));
    fireEvent.click(screen.getByRole("button", { name: "Pedir la tirada" }));

    await waitFor(() => expect(pedir).toHaveBeenCalledTimes(1));
    expect(pedir).toHaveBeenCalledWith(CAMPANA, {
      characterIds: ["ch-1", "ch-2"],
      key: "skill.stealth",
      label: "Sigilo para pasar junto al perro",
      dc: 17,
      mode: "ADVANTAGE",
      audience: "PUBLIC",
    });
  });

  it("una fila de la guía del SRD rellena la CD, y se puede escribir otro número encima", async () => {
    const pedir = vi
      .spyOn(rollRequestsApi, "createRollRequest")
      .mockResolvedValue([PETICION_CREADA]);

    pintar();
    await screen.findByRole("button", { name: "Media: CD 15" });

    const campoCd = screen.getByLabelText("CD (opcional)") as HTMLInputElement;
    fireEvent.click(screen.getByRole("button", { name: "Media: CD 15" }));
    expect(campoCd.value).toBe("15");

    // **Y no es una jaula.** El SRD da la tabla como guía —«the DM sets the DC»—, así que un
    // número que no está en las seis filas tiene que poder escribirse encima y llegar al
    // servidor tal cual.
    fireEvent.change(campoCd, { target: { value: "23" } });
    expect(campoCd.value).toBe("23");

    fireEvent.click(screen.getByLabelText("Brann"));
    fireEvent.change(screen.getByLabelText("Qué se le dice"), { target: { value: "Percepción" } });
    fireEvent.click(screen.getByRole("button", { name: "Pedir la tirada" }));

    await waitFor(() => expect(pedir).toHaveBeenCalledTimes(1));
    expect(pedir.mock.calls[0][1].dc).toBe(23);
  });

  it("sin personajes marcados no se pide nada y se dice por qué", async () => {
    const pedir = vi.spyOn(rollRequestsApi, "createRollRequest").mockResolvedValue([]);

    pintar();
    await screen.findByLabelText("Brann");

    fireEvent.change(screen.getByLabelText("Qué se le dice"), { target: { value: "Percepción" } });
    fireEvent.click(screen.getByRole("button", { name: "Pedir la tirada" }));

    expect(await screen.findByText("Elige al menos un personaje.")).toBeInTheDocument();
    expect(pedir).not.toHaveBeenCalled();
  });
});
