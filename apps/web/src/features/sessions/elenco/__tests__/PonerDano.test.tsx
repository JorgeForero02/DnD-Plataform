import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PonerDano } from "../PonerDano";
import * as sheetApi from "../../../character-sheet/api";
import * as charactersApi from "../../../characters/api";
import * as bestiarioApi from "../../../bestiario/api";

// Tarea 11 del pulido (C4, #15), ronda de revisión — **el selector «¿De quién viene?» faltaba
// por probar**: que el propio objetivo (a quien se le está poniendo el daño) no puede citarse a
// sí mismo como origen, y que `sourceCharacterId` viaja solo cuando de verdad se elige algo —sin
// elegir, `changeHp` no lo recibe, que es el comportamiento de antes de esta tarea.

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

function montar(onCerrar = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <PonerDano campaignId="c1" characterId="brann" nombre="Brann" abierto onCerrar={onCerrar} />
    </QueryClientProvider>,
  );
  return onCerrar;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([
    { id: "brann", name: "Brann" } as charactersApi.Character,
    { id: "sylas", name: "Sylas" } as charactersApi.Character,
  ]);
  vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([
    { id: "klarg", name: "Klarg" } as bestiarioApi.NpcEnLaMesa,
  ]);
});

describe("PonerDano — «¿De quién viene?»", () => {
  it("el propio objetivo no aparece entre sus orígenes posibles, pero el resto del elenco y los PNJ sí", async () => {
    montar();

    const selector = await screen.findByLabelText("¿De quién viene?");
    // Se espera a que las dos listas hayan llegado antes de mirar las opciones.
    await waitFor(() => expect(within(selector).getByText("Klarg")).toBeInTheDocument());

    const opciones = within(selector)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(opciones).toEqual(["Sin decir", "Sylas", "Klarg"]);
    expect(opciones).not.toContain("Brann");
  });

  it("sin elegir origen, el golpe se manda exactamente como antes de esta tarea", async () => {
    const cambiarPg = vi.spyOn(sheetApi, "changeHp").mockResolvedValue(hoja(10, 20));
    montar();

    await screen.findByLabelText("¿De quién viene?");
    fireEvent.change(screen.getByLabelText("Cuánto daño"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar daño" }));

    await waitFor(() => expect(cambiarPg).toHaveBeenCalled());
    expect(cambiarPg.mock.calls[0][2]).not.toHaveProperty("sourceCharacterId");
  });

  it("eligiendo un origen, el golpe manda su id — y solo el suyo", async () => {
    const cambiarPg = vi.spyOn(sheetApi, "changeHp").mockResolvedValue(hoja(10, 20));
    montar();

    const selector = await screen.findByLabelText("¿De quién viene?");
    await waitFor(() => expect(within(selector).getByText("Klarg")).toBeInTheDocument());
    fireEvent.change(selector, { target: { value: "klarg" } });
    fireEvent.change(screen.getByLabelText("Cuánto daño"), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar daño" }));

    await waitFor(() =>
      expect(cambiarPg).toHaveBeenCalledWith(
        "c1",
        "brann",
        expect.objectContaining({ sourceCharacterId: "klarg" }),
      ),
    );
  });
});
