import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GastarInspiracion } from "../GastarInspiracion";
import * as api from "../../../character-sheet/api";

// Plan 08, ficha I8 — **el único de los tres botones de la maqueta que el SRD respalda.**
//
// Lo que estas pruebas defienden es cuándo NO aparece. Un control que siempre está y siempre da
// 409 se aprende a ignorar en dos días, y entonces tampoco sirve el día que sí importa.

function fila(current: number) {
  return [
    {
      id: "r1",
      characterId: "ch1",
      key: "inspiration",
      label: "Inspiración",
      current,
      max: 1,
      resetOn: "NONE" as const,
      grantedBy: "DM_ONLY" as const,
    },
  ];
}

function montar(props: Partial<Parameters<typeof GastarInspiracion>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <GastarInspiracion
        campaignId="c1"
        characterId="ch1"
        modo="NORMAL"
        value={false}
        onChange={() => {}}
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe("gastar la inspiración", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchResources").mockResolvedValue(fila(1));
  });

  it("con inspiración, ofrece gastarla y dice que se gasta AL tirar", async () => {
    montar();
    expect(await screen.findByRole("checkbox")).toBeEnabled();
    // La frase importa: si no dice cuándo se gasta, nadie se atreve a marcarla antes de tirar.
    expect(screen.getByText(/si la tirada no sale, la conserva/i)).toBeInTheDocument();
  });

  it("**sin inspiración no se pinta nada**", async () => {
    vi.spyOn(api, "fetchResources").mockResolvedValue(fila(0));
    montar();
    // Se espera a que la consulta resuelva para no confundir «todavía no» con «no hay».
    await screen.findByText((_, e) => e?.tagName === "BODY");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("**sin personaje tampoco**: la inspiración es de un personaje, no de una persona", async () => {
    montar({ characterId: undefined });
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("**con desventaja se apaga, y dice por qué**: se anularían y se perdería para nada", async () => {
    // SRD: *«you are considered to have neither of them»*. El servidor lo rechaza; aquí se evita
    // antes, que es mejor que explicar el rechazo después.
    montar({ modo: "DISADVANTAGE", value: true });
    const casilla = await screen.findByRole("checkbox");
    expect(casilla).toBeDisabled();
    // Y no aparece marcada aunque el estado diga que sí: el control no puede mentir sobre lo que
    // va a mandar.
    expect(casilla).not.toBeChecked();
    expect(screen.getByText(/la perdería sin ganar nada/i)).toBeInTheDocument();
  });
});
