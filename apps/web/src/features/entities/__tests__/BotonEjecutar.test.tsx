import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BotonEjecutar } from "../BotonEjecutar";
import type { RuleRow } from "../../rules/api";
import * as rulesApi from "../../rules/api";
import * as entitiesApi from "../api";

// Plan 09, ficha I19 — **la batuta, y lo que la hace honesta.**
//
// Un botón que siempre parece hacer algo enseña a desconfiar de él. Lo que estas pruebas defienden
// no es que ejecute: es que **diga cuántas reglas escuchan** y que con cero no finja.

function regla(over: Partial<RuleRow>): RuleRow {
  return {
    id: "r1",
    campaignId: "c1",
    name: "Al leer la inscripción",
    createdById: "u1",
    mode: "AUTOMATIC",
    status: "ARMED",
    version: 1,
    trigger: { kind: "DM_EXECUTED", entityId: "e1" },
    conditions: [],
    effects: [{ kind: "SET_FLAG", key: "x", value: true }],
    maxFires: null,
    fireCount: 0,
    lastFiredAt: null,
    brokenReason: null,
    createdAt: "x",
    updatedAt: "x",
    ...over,
  } as RuleRow;
}

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BotonEjecutar campaignId="c1" entityId="e1" />
    </QueryClientProvider>,
  );
}

describe("el botón de la batuta", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("**con cero reglas escuchando se apaga y lo dice**, en vez de fingir", async () => {
    vi.spyOn(rulesApi, "fetchRules").mockResolvedValue([]);
    montar();
    const boton = await screen.findByRole("button", { name: "Ejecutar" });
    await waitFor(() => expect(boton).toHaveAttribute("aria-disabled", "true"));
    expect(screen.getByText(/Ninguna regla espera a esta ficha/i)).toBeInTheDocument();
  });

  it("con una, lo dice en singular y deja pulsar", async () => {
    vi.spyOn(rulesApi, "fetchRules").mockResolvedValue([regla({})]);
    const ejecutar = vi.spyOn(entitiesApi, "executeEntity").mockResolvedValue(undefined as never);
    montar();
    const boton = await screen.findByRole("button", { name: "Ejecutar" });
    await waitFor(() => expect(boton).toBeEnabled());
    expect(screen.getByText("Una regla espera a esta ficha.")).toBeInTheDocument();

    fireEvent.click(boton);
    await waitFor(() => expect(ejecutar).toHaveBeenCalledWith("c1", "e1"));
    // Y dice qué pasó, sin prometer qué verá la mesa: eso depende de cada efecto.
    expect(await screen.findByRole("status")).toHaveTextContent(/Ejecutada/);
  });

  it("**no cuenta las de OTRA ficha ni las desarmadas**", async () => {
    // Contar de más sería la misma mentira al revés: prometer que va a pasar algo que no pasa.
    vi.spyOn(rulesApi, "fetchRules").mockResolvedValue([
      regla({ id: "r-otra", trigger: { kind: "DM_EXECUTED", entityId: "e2" } }),
      regla({ id: "r-desarmada", status: "DISARMED" }),
      regla({ id: "r-otro-suceso", trigger: { kind: "SESSION_STARTED" } }),
    ]);
    montar();
    await screen.findByRole("button", { name: "Ejecutar" });
    expect(await screen.findByText(/Ninguna regla espera a esta ficha/i)).toBeInTheDocument();
  });

  it("con varias, lo dice con su número", async () => {
    vi.spyOn(rulesApi, "fetchRules").mockResolvedValue([
      regla({ id: "a" }),
      regla({ id: "b" }),
      regla({ id: "c" }),
    ]);
    montar();
    expect(await screen.findByText("3 reglas esperan a esta ficha.")).toBeInTheDocument();
  });
});
