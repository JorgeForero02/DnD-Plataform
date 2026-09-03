import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { DerivedValue } from "@dnd/shared";
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
  attacks: [],
  money: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
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

    render(<PuntosDeGolpe campaignId="c1" characterId="ch1" hp={hpNormal} puedeEditar />, {
      wrapper: wrapper(qc),
    });

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

    render(<PuntosDeGolpe campaignId="c1" characterId="ch1" hp={hpNormal} puedeEditar />, {
      wrapper: wrapper(qc),
    });

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
        puedeEditar={false}
      />,
      { wrapper: wrapper(qc) },
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/superan el máximo/);
  });
});

// --- Tarea 2C.4 — por qué los PG máximos son la mitad ---
//
// Con agotamiento 4 el servidor parte los PG máximos y lo deja escrito en la traza de `maxHp`
// (`sourceKey: "exhaustion:4"`, `labelKey: "maxHp.exhaustion.half"`). Sin esta línea la mesa veía
// la mitad de sus puntos de golpe sin ninguna explicación en pantalla.

const maxHpPartidos: DerivedValue = {
  key: "maxHp",
  total: 12,
  steps: [
    {
      op: "base",
      amount: 25,
      sourceType: "class",
      sourceKey: "fighter",
      labelKey: "maxHp.firstLevel",
    },
    {
      op: "cap",
      amount: -13,
      sourceType: "manual",
      sourceKey: "exhaustion:4",
      labelKey: "maxHp.exhaustion.half",
    },
  ],
};

describe("PuntosDeGolpe — el agotamiento partiendo los PG máximos", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function pintarConMaxHp(maxHp?: DerivedValue) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <PuntosDeGolpe
        campaignId="c1"
        characterId="ch1"
        hp={{ current: 6, max: 12, temp: 0, version: 1, exceedsMax: false }}
        maxHp={maxHp}
        puedeEditar
      />,
      { wrapper: wrapper(qc) },
    );
  }

  it("dice por qué son la mitad, con el rótulo traducido y el nivel de agotamiento", () => {
    pintarConMaxHp(maxHpPartidos);

    expect(
      screen.getByText("Agotamiento: los puntos de golpe máximos, a la mitad (nivel 4)."),
    ).toBeInTheDocument();
    // Y nunca la clave cruda del motor.
    expect(document.body.textContent).not.toContain("maxHp.exhaustion.half");
    expect(document.body.textContent).not.toContain("exhaustion:4");
  });

  it("sin agotamiento no se inventa ninguna explicación", () => {
    pintarConMaxHp({
      key: "maxHp",
      total: 25,
      steps: [
        {
          op: "base",
          amount: 25,
          sourceType: "class",
          sourceKey: "fighter",
          labelKey: "maxHp.firstLevel",
        },
      ],
    });

    expect(screen.queryByText(/Agotamiento/)).not.toBeInTheDocument();
  });
});
