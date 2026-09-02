import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Propuestas } from "../Propuestas";
import * as rulesApi from "../api";
import type { RuleRow, RuleTraceRow } from "../api";

// Tarea 2A.17 — "Aplicar manda {action:'APPLY'} y Rechazar manda {action:'REJECT'}".
// Es el par de botones donde equivocarse cambia el mundo cuando el DM dijo que no.

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const regla = {
  id: "regla1",
  name: "La puerta del santuario",
  status: "ARMED",
  mode: "PROPOSAL",
} as RuleRow;

const propuesta: RuleTraceRow = {
  id: "traza1",
  campaignId: "c1",
  ruleId: "regla1",
  ruleVersion: 1,
  triggeredByUserId: "u1",
  delegatedByUserId: "u2",
  depth: 0,
  chainId: "cadena1",
  status: "PROPOSED",
  effects: {
    conditions: [],
    effects: [
      {
        effect: { kind: "SET_FLAG", key: "puerta", value: true },
        before: false,
        after: true,
      },
    ],
  },
  reason: null,
  createdAt: "2026-09-02T10:00:00.000Z",
};

function pintar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<Propuestas campaignId="c1" entities={[]} reglas={[regla]} activo />, {
    wrapper: wrapper(qc),
  });
}

describe("Propuestas", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(rulesApi, "fetchProposals").mockResolvedValue([propuesta]);
  });

  it("dice, con todas las letras, que todavía no ha cambiado nada", async () => {
    pintar();
    expect(await screen.findByText(/Nada de esto ha ocurrido todavía/)).toBeInTheDocument();
  });

  it("«Aplicar» manda la acción APPLY al endpoint de resolución", async () => {
    const resolver = vi
      .spyOn(rulesApi, "resolveProposal")
      .mockResolvedValue({ ...propuesta, status: "APPLIED" });
    pintar();

    fireEvent.click(await screen.findByRole("button", { name: "Aplicar" }));

    await waitFor(() => expect(resolver).toHaveBeenCalledWith("c1", "traza1", { action: "APPLY" }));
  });

  it("«Rechazar» manda la acción REJECT, no APPLY", async () => {
    const resolver = vi
      .spyOn(rulesApi, "resolveProposal")
      .mockResolvedValue({ ...propuesta, status: "REJECTED" });
    pintar();

    fireEvent.click(await screen.findByRole("button", { name: "Rechazar" }));

    await waitFor(() =>
      expect(resolver).toHaveBeenCalledWith("c1", "traza1", { action: "REJECT" }),
    );
  });
});
