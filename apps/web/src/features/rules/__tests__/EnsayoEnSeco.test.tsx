import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { EnsayoEnSeco } from "../EnsayoEnSeco";
import { useDryRun } from "../hooks";
import * as rulesApi from "../api";
import type { RuleRow } from "../api";

// Tarea 2A.17 — "el ensayo en seco no dispara ninguna mutación".
//
// Es la propiedad que separa simular de hacer, y no se puede comprobar mirando la pantalla: se
// comprueba espiando **todas** las funciones que escriben y exigiendo que ninguna se llame.

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const regla = {
  id: "regla1",
  name: "El barril de pólvora",
  trigger: { kind: "SESSION_STARTED" },
  conditions: [],
  effects: [{ kind: "SET_FLAG", key: "mecha", value: true }],
  status: "ARMED",
  mode: "AUTOMATIC",
} as unknown as RuleRow;

/** Monta el diálogo con el hook real, que es lo que de verdad decide a qué endpoint se llama. */
function Arnes() {
  const ensayo = useDryRun("c1");
  return (
    <EnsayoEnSeco
      abierto
      regla={regla}
      entities={[]}
      simulando={ensayo.isPending}
      resultado={ensayo.data}
      onSimular={(trigger) => ensayo.mutate({ ruleId: regla.id, trigger })}
      onCerrar={() => {}}
    />
  );
}

describe("EnsayoEnSeco", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("simula contra el endpoint de ensayo y no llama a ninguna función que escriba", async () => {
    const ensayo = vi.spyOn(rulesApi, "dryRunRule").mockResolvedValue({
      traces: [],
      brokenRules: [],
      fireCountDeltas: {},
      triggerReachableToday: true,
    });
    const crear = vi.spyOn(rulesApi, "createRule");
    const actualizar = vi.spyOn(rulesApi, "updateRule");
    const borrar = vi.spyOn(rulesApi, "deleteRule");
    const resolver = vi.spyOn(rulesApi, "resolveProposal");

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<Arnes />, { wrapper: wrapper(qc) });

    fireEvent.click(screen.getByRole("button", { name: "Simular" }));

    await waitFor(() =>
      expect(ensayo).toHaveBeenCalledWith("c1", "regla1", { kind: "SESSION_STARTED" }),
    );
    expect(crear).not.toHaveBeenCalled();
    expect(actualizar).not.toHaveBeenCalled();
    expect(borrar).not.toHaveBeenCalled();
    expect(resolver).not.toHaveBeenCalled();
  });

  it("se presenta como simulación antes de que el DM pulse nada", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<Arnes />, { wrapper: wrapper(qc) });

    expect(screen.getByText("Es una simulación.")).toBeInTheDocument();
    expect(
      screen.getByText(/No cambia nada, no cuenta como disparo y no deja traza/),
    ).toBeInTheDocument();
  });

  it("avisa cuando el suceso simulado no lo emite hoy nada de la aplicación", async () => {
    vi.spyOn(rulesApi, "dryRunRule").mockResolvedValue({
      traces: [],
      brokenRules: [],
      fireCountDeltas: {},
      // Lo decide el servidor (`isTriggerReachableToday`); la pantalla no recalcula la lista.
      triggerReachableToday: false,
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<Arnes />, { wrapper: wrapper(qc) });

    fireEvent.click(screen.getByRole("button", { name: "Simular" }));

    expect(
      await screen.findByText(/nada de la aplicación emite este suceso todavía/),
    ).toBeInTheDocument();
  });
});
