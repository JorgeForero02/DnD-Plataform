import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ruleTraceStatusSchema } from "@dnd/shared";
import { TrazaDeReglas } from "../TrazaDeReglas";
import * as rulesApi from "../api";
import type { RuleRow, RuleTraceRow } from "../api";
import { NOMBRE_ESTADO_TRAZA } from "../vocabulario";

// Tarea 2A.17 — "un estado de traza se traduce". Los cinco estados pasan por el diccionario:
// ninguno llega crudo a la pantalla.

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

const regla = { id: "regla1", name: "El barril de pólvora" } as RuleRow;

function trazaCon(status: RuleTraceRow["status"], id: string): RuleTraceRow {
  return {
    id,
    campaignId: "c1",
    ruleId: "regla1",
    ruleVersion: 2,
    triggeredByUserId: "u1",
    delegatedByUserId: "u2",
    depth: 1,
    chainId: "cadena1",
    status,
    effects: { conditions: [], effects: [] },
    reason: null,
    createdAt: "2026-09-02T10:00:00.000Z",
  };
}

describe("TrazaDeReglas", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("pinta cada estado en español y ninguno en crudo", async () => {
    const estados = ruleTraceStatusSchema.options;
    vi.spyOn(rulesApi, "fetchTraces").mockResolvedValue({
      traces: estados.map((estado, i) => trazaCon(estado, `t${i}`)),
      nextCursor: null,
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<TrazaDeReglas campaignId="c1" entities={[]} reglas={[regla]} activo />, {
      wrapper: wrapper(qc),
    });

    for (const estado of estados) {
      expect(await screen.findByText(NOMBRE_ESTADO_TRAZA[estado])).toBeInTheDocument();
      // El valor del enum solo vive en el atributo de datos, nunca en un texto visible.
      expect(screen.queryByText(estado)).not.toBeInTheDocument();
    }
  });

  it("un conflicto explica por qué no se hizo nada", async () => {
    vi.spyOn(rulesApi, "fetchTraces").mockResolvedValue({
      traces: [trazaCon("CONFLICT", "t9")],
      nextCursor: null,
    });

    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<TrazaDeReglas campaignId="c1" entities={[]} reglas={[regla]} activo />, {
      wrapper: wrapper(qc),
    });

    expect(await screen.findByText("En conflicto")).toBeInTheDocument();
    expect(screen.getByText(/El motor no elige por ti/)).toBeInTheDocument();
  });
});
