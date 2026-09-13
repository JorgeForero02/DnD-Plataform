import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AbilitiesRule, AbilityRollAttemptDto } from "@dnd/shared";
import { AsignarCaracteristicas } from "../AsignarCaracteristicas";
import * as characterSheetApi from "../api";

// Task 6 (spec 2026-09-13, D-CF-53) — la mesa fija el método de las seis características, y esta
// pantalla es donde se obedece: matriz estándar, compra por puntos o los dados del servidor.
//
// Se espía la API, no los ganchos: mismo patrón que `CharacterEditor.test.tsx` y
// `HojaCalculada.test.tsx` — `QueryClientProvider` de verdad, así que la invalidación tras
// «Quedarme con este» y tras «Tirar características» se comprueba de verdad, no se simula.

function renderAsignar(regla: AbilitiesRule, puedeEditar = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AsignarCaracteristicas
        campaignId="c1"
        characterId="ch1"
        regla={regla as Exclude<AbilitiesRule, { metodo: "LIBRE" }>}
        puedeEditar={puedeEditar}
      />
    </QueryClientProvider>,
  );
}

function tirada(total: number): AbilityRollAttemptDto["rolls"][number] {
  return {
    eventId: "e1",
    expression: "4d6kh3",
    rolls: [total, 1, 1, 1],
    kept: [total],
    dropped: [1, 1, 1],
    modifier: 0,
    total,
    natural: "NONE",
    outcome: "NO_DC",
  };
}

function intentoDePrueba(over: Partial<AbilityRollAttemptDto> = {}): AbilityRollAttemptDto {
  const values = over.values ?? [12, 9, 15, 10, 14, 11];
  return {
    id: "a1",
    values,
    chosen: false,
    attempt: 1,
    of: 2,
    createdAt: "2026-09-13T00:00:00Z",
    rolls: values.map((v) => tirada(v)),
    ...over,
  };
}

describe("AsignarCaracteristicas", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("MATRIZ: seis desplegables que se agotan y Fijar manda las seis juntas", async () => {
    const patchSpy = vi.spyOn(characterSheetApi, "updateSheet").mockResolvedValue({} as never);
    renderAsignar({ metodo: "MATRIZ" });

    fireEvent.change(screen.getByLabelText("Fuerza"), { target: { value: "15" } });

    // El 15 ya se usó: desaparece de las opciones de las otras cinco.
    expect(
      within(screen.getByLabelText("Destreza") as HTMLSelectElement).queryByRole("option", {
        name: "15",
      }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Destreza"), { target: { value: "14" } });
    fireEvent.change(screen.getByLabelText("Constitución"), { target: { value: "13" } });
    fireEvent.change(screen.getByLabelText("Inteligencia"), { target: { value: "12" } });
    fireEvent.change(screen.getByLabelText("Sabiduría"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Carisma"), { target: { value: "8" } });

    fireEvent.click(screen.getByRole("button", { name: "Fijar características" }));

    await waitFor(() => expect(patchSpy).toHaveBeenCalledTimes(1));
    expect(patchSpy.mock.calls[0][2]).toEqual({
      abilities: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    });
  });

  it("PUNTOS: el contador baja con el coste de cada valor y con 28 gastados dice que sobran 1", async () => {
    const patchSpy = vi.spyOn(characterSheetApi, "updateSheet");
    renderAsignar({ metodo: "PUNTOS", puntos: 27 });

    fireEvent.change(screen.getByLabelText("Fuerza"), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("Destreza"), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("Constitución"), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("Inteligencia"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("Sabiduría"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Carisma"), { target: { value: "8" } });

    expect(screen.getByText("Te quedan -1 de 27 puntos")).toBeInTheDocument();

    // Nunca deshabilitado: manda el error en línea y no llama al servidor.
    const boton = screen.getByRole("button", { name: "Fijar características" });
    expect(boton).not.toHaveAttribute("disabled");
    fireEvent.click(boton);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(patchSpy).not.toHaveBeenCalled();
  });

  it(
    "DADOS: «Tirar características» pide al servidor, enseña seis tiradas con sus dados e " +
      "«Intento 1 de 2»; «Quedarme con este» manda attemptId y las seis",
    async () => {
      const attempt = intentoDePrueba({ values: [12, 9, 15, 10, 14, 11] });
      vi.spyOn(characterSheetApi, "fetchAbilityRolls")
        .mockResolvedValueOnce([])
        .mockResolvedValue([attempt]);
      vi.spyOn(characterSheetApi, "rollAbilities").mockResolvedValue(attempt);
      const patchSpy = vi.spyOn(characterSheetApi, "updateSheet").mockResolvedValue({} as never);

      renderAsignar({ metodo: "DADOS", expresion: "4d6kh3", intentos: 2, asignacionLibre: true });

      await screen.findByRole("button", { name: "Tirar características" });
      fireEvent.click(screen.getByRole("button", { name: "Tirar características" }));

      await screen.findByText("Intento 1 de 2");
      expect(screen.getAllByRole("status")).toHaveLength(6);

      // Seis selects de asignación libre, con los valores del intento (índice por valor).
      fireEvent.change(screen.getByLabelText("Fuerza"), { target: { value: "0" } }); // 12
      fireEvent.change(screen.getByLabelText("Destreza"), { target: { value: "1" } }); // 9
      fireEvent.change(screen.getByLabelText("Constitución"), { target: { value: "2" } }); // 15
      fireEvent.change(screen.getByLabelText("Inteligencia"), { target: { value: "3" } }); // 10
      fireEvent.change(screen.getByLabelText("Sabiduría"), { target: { value: "4" } }); // 14
      fireEvent.change(screen.getByLabelText("Carisma"), { target: { value: "5" } }); // 11

      fireEvent.click(screen.getByRole("button", { name: "Quedarme con este" }));

      await waitFor(() => expect(patchSpy).toHaveBeenCalledTimes(1));
      expect(patchSpy.mock.calls[0][2]).toEqual({
        attemptId: "a1",
        abilities: { str: 12, dex: 9, con: 15, int: 10, wis: 14, cha: 11 },
      });
    },
  );

  it("DADOS sin asignación libre: no hay selects, los seis van en orden, y la fila dice a qué característica va cada uno", async () => {
    const attempt = intentoDePrueba({ values: [15, 14, 13, 12, 10, 8], of: 1 });
    vi.spyOn(characterSheetApi, "fetchAbilityRolls").mockResolvedValue([attempt]);

    renderAsignar({ metodo: "DADOS", expresion: "4d6kh3", intentos: 1, asignacionLibre: false });

    await screen.findByText("Intento 1 de 1");
    expect(screen.queryByLabelText("Fuerza")).not.toBeInTheDocument();
    expect(screen.getByText(/Fuerza 15/)).toBeInTheDocument();
    expect(screen.getByText(/Carisma 8/)).toBeInTheDocument();
  });

  it("con un intento ya elegido enseña «Fijadas con dados» y no hay botón de tirar", async () => {
    const attempt = intentoDePrueba({ values: [15, 14, 13, 12, 10, 8], chosen: true, of: 1 });
    vi.spyOn(characterSheetApi, "fetchAbilityRolls").mockResolvedValue([attempt]);

    renderAsignar({ metodo: "DADOS", expresion: "4d6kh3", intentos: 1, asignacionLibre: true });

    expect(await screen.findByText("Fijadas con dados")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tirar características" })).not.toBeInTheDocument();
  });

  it("DADOS: agotados los intentos, «Tirar características» escribe el error en línea sin pedir nada", async () => {
    const attempts = [
      intentoDePrueba({ id: "a1", attempt: 1 }),
      intentoDePrueba({ id: "a2", attempt: 2 }),
    ];
    vi.spyOn(characterSheetApi, "fetchAbilityRolls").mockResolvedValue(attempts);
    const rollSpy = vi.spyOn(characterSheetApi, "rollAbilities");

    renderAsignar({ metodo: "DADOS", expresion: "4d6kh3", intentos: 2, asignacionLibre: true });

    await screen.findByText("Intento 2 de 2");
    fireEvent.click(screen.getByRole("button", { name: "Tirar características" }));

    expect(await screen.findByText("Ya usaste los 2 intentos.")).toBeInTheDocument();
    expect(rollSpy).not.toHaveBeenCalled();
  });
});
