import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { PuntosDeGolpe } from "../PuntosDeGolpe";
import * as characterSheetApi from "../api";
import type { HpState, SheetResponse } from "../api";

// Tarea 2A.10 — "un delta de PG llama a la mutación con el número correcto". El caso normal de
// la mesa es un delta («recibo 5», «me curo 3»), nunca escribir el total a mano.

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const respuestaOk: SheetResponse = {
  character: {} as never,
  sheet: null,
  hp: { current: 10, max: 20, temp: 0, version: 1, exceedsMax: false },
  deathSaves: { successes: 0, failures: 0, status: "alive" },
};

const hpNormal: HpState = { current: 12, max: 20, temp: 0, version: 3, exceedsMax: false };

describe("PuntosDeGolpe", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("«recibo daño» manda un delta negativo con el número escrito", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.spyOn(characterSheetApi, "changeHp").mockResolvedValue(respuestaOk);

    render(
      <PuntosDeGolpe
        campaignId="c1"
        characterId="ch1"
        hp={hpNormal}
        deathSaves={{ successes: 0, failures: 0, status: "alive" }}
        puedeEditar
      />,
      { wrapper: wrapper(qc) },
    );

    fireEvent.change(screen.getByLabelText("Cambio de puntos de golpe"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Recibo daño" }));

    // `mutate()` dispara la ejecución de forma asíncrona (react-query la agenda, no la corre en
    // el mismo tick del clic), así que la aserción tiene que esperar a que ocurra.
    await waitFor(() =>
      expect(characterSheetApi.changeHp).toHaveBeenCalledWith("c1", "ch1", { delta: -5 }),
    );
  });

  it("«me curo» manda un delta positivo con el mismo número", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.spyOn(characterSheetApi, "changeHp").mockResolvedValue(respuestaOk);

    render(
      <PuntosDeGolpe
        campaignId="c1"
        characterId="ch1"
        hp={hpNormal}
        deathSaves={{ successes: 0, failures: 0, status: "alive" }}
        puedeEditar
      />,
      { wrapper: wrapper(qc) },
    );

    fireEvent.change(screen.getByLabelText("Cambio de puntos de golpe"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Me curo" }));

    await waitFor(() =>
      expect(characterSheetApi.changeHp).toHaveBeenCalledWith("c1", "ch1", { delta: 3 }),
    );
  });

  it("muestra los PG temporales aparte del total, no sumados", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <PuntosDeGolpe
        campaignId="c1"
        characterId="ch1"
        hp={{ current: 12, max: 20, temp: 4, version: 1, exceedsMax: false }}
        deathSaves={{ successes: 0, failures: 0, status: "alive" }}
        puedeEditar={false}
      />,
      { wrapper: wrapper(qc) },
    );
    expect(screen.getByText("12 / 20")).toBeInTheDocument();
    expect(screen.getByText("+4 temporales")).toBeInTheDocument();
  });

  it("si los PG guardados superan el máximo, se ve recortado con su aviso", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <PuntosDeGolpe
        campaignId="c1"
        characterId="ch1"
        hp={{ current: 20, max: 20, temp: 0, version: 1, exceedsMax: true }}
        deathSaves={{ successes: 0, failures: 0, status: "alive" }}
        puedeEditar={false}
      />,
      { wrapper: wrapper(qc) },
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/superan el máximo/);
  });
});
