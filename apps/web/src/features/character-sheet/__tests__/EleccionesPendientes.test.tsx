import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { EleccionesPendientes } from "../EleccionesPendientes";
import * as characterSheetApi from "../api";
import type { PendingChoiceDto } from "../api";

// Tarea 2A.10 — "un aviso de elección pendiente se ve", pintado como tarea, no como error.

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const eleccionSemielfo: PendingChoiceDto = {
  grantId: "half-elf-skills",
  labelKey: "race.halfElf.skills",
  kind: "skillChoice",
  choose: 2,
  from: ["stealth", "perception", "persuasion"],
};

describe("EleccionesPendientes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("se ve como una tarea, con las opciones traducidas, no un valor de enumeración crudo", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <EleccionesPendientes
        campaignId="c1"
        characterId="ch1"
        pendingChoices={[eleccionSemielfo]}
        choicesActuales={{}}
      />,
      { wrapper: wrapper(qc) },
    );

    expect(screen.getByText("Elige 2 habilidades — Semielfo")).toBeInTheDocument();
    expect(screen.getByText("Sigilo")).toBeInTheDocument();
    expect(screen.getByText("Percepción")).toBeInTheDocument();
    // La clave cruda del motor nunca llega a pantalla.
    expect(screen.queryByText("stealth")).not.toBeInTheDocument();
    expect(screen.queryByText("skillChoice")).not.toBeInTheDocument();
  });

  it("al completar y guardar, hace el PATCH con las elecciones acumuladas", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.spyOn(characterSheetApi, "updateSheet").mockResolvedValue({
      character: {} as never,
      sheet: null,
      hp: { current: null, max: null, temp: 0, version: 0, exceedsMax: false },
      deathSaves: { successes: 0, failures: 0, status: "alive" },
    });

    render(
      <EleccionesPendientes
        campaignId="c1"
        characterId="ch1"
        pendingChoices={[eleccionSemielfo]}
        choicesActuales={{ "otra-eleccion": ["athletics"] }}
      />,
      { wrapper: wrapper(qc) },
    );

    fireEvent.click(screen.getByText("Sigilo"));
    fireEvent.click(screen.getByText("Percepción"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar elección" }));

    // `mutate()` agenda la ejecución de forma asíncrona (react-query), no la corre en el mismo
    // tick del clic.
    await waitFor(() =>
      expect(characterSheetApi.updateSheet).toHaveBeenCalledWith("c1", "ch1", {
        choices: {
          "otra-eleccion": ["athletics"],
          "half-elf-skills": ["stealth", "perception"],
        },
      }),
    );
  });
});
