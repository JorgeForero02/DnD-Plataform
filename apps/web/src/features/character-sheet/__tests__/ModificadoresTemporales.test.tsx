import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModificadoresTemporales } from "../ModificadoresTemporales";
import type { TemporaryModifierRow } from "../api";
import * as api from "../api";

// Plan 13, ficha M8 — **«+2 a Fuerza durante una hora».**
//
// Lo que estas pruebas defienden no es la suma —eso es del motor y tiene su e2e—: es que **el
// vencido no desaparezca**, que el motivo sea obligatorio y que la pantalla **diga que el reloj es
// el de la partida**, no el de la pared. Las tres son la diferencia entre un número que se puede
// entender y uno que cambia solo.

function fila(over: Partial<TemporaryModifierRow>): TemporaryModifierRow {
  return {
    id: "t1",
    characterId: "ch1",
    target: "ability.str",
    amount: 2,
    reason: "Poción de fuerza de gigante",
    expiresAtClock: 3600,
    createdAt: "x",
    expired: false,
    ...over,
  };
}

function montar(puedeEditar = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ModificadoresTemporales campaignId="c1" characterId="ch1" puedeEditar={puedeEditar} />
    </QueryClientProvider>,
  );
}

describe("los modificadores temporales", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("pinta el número con su signo, a qué apunta y **de dónde sale**", async () => {
    vi.spyOn(api, "fetchTemporaryModifiers").mockResolvedValue([fila({})]);
    montar();
    // Acotado a la fila: «+2» también aparece en el formulario de abajo, y lo que se comprueba
    // aquí es lo que la lista dice de un modificador ya puesto.
    const entrada = await screen.findByRole("listitem");
    expect(entrada).toHaveTextContent("+2");
    expect(entrada).toHaveTextContent(/a Fuerza/);
    // Un +2 sin origen es lo que la traza existe para impedir; la lista tampoco lo esconde.
    expect(screen.getByText(/Poción de fuerza de gigante/)).toBeInTheDocument();
  });

  it("**un vencido sigue en la lista y lo DICE**, no solo tachado", async () => {
    // D-2C-2: si desapareciera, el jugador vería su Fuerza bajar sin nada que mirar. Y «vencido»
    // va escrito porque el estilo no puede ser el único portador de la información.
    vi.spyOn(api, "fetchTemporaryModifiers").mockResolvedValue([fila({ expired: true })]);
    montar();
    expect(await screen.findByText("Vencido")).toBeInTheDocument();
    expect(screen.getByText(/Poción de fuerza de gigante/)).toBeInTheDocument();
  });

  it("**dice que el reloj es el de la partida**, no el de la pared", async () => {
    // Callarlo habría hecho que la mesa esperara que caducase con el tiempo real.
    vi.spyOn(api, "fetchTemporaryModifiers").mockResolvedValue([]);
    montar();
    expect(await screen.findByText(/reloj de la partida/)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "1 hora de juego" })).toBeInTheDocument();
    // Y «hasta que se quite» existe: hay efectos que duran lo que el DM diga.
    expect(screen.getByRole("option", { name: "Hasta que se quite" })).toBeInTheDocument();
  });

  it("**sin motivo no deja ponerlo**: es lo único que la traza puede enseñar", async () => {
    vi.spyOn(api, "fetchTemporaryModifiers").mockResolvedValue([]);
    montar();
    const boton = await screen.findByRole("button", { name: "Ponerlo" });
    expect(boton).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Poción de fuerza de gigante"), {
      target: { value: "Bendición del druida" },
    });
    expect(boton).toBeEnabled();
  });

  it("lo manda con su objetivo, su cantidad y su duración en segundos", async () => {
    vi.spyOn(api, "fetchTemporaryModifiers").mockResolvedValue([]);
    const conceder = vi.spyOn(api, "grantTemporaryModifier").mockResolvedValue(fila({}) as never);
    montar();
    fireEvent.change(await screen.findByPlaceholderText("Poción de fuerza de gigante"), {
      target: { value: "Bendición del druida" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ponerlo" }));
    await waitFor(() =>
      expect(conceder).toHaveBeenCalledWith("c1", "ch1", {
        target: "ability.str",
        amount: 2,
        reason: "Bendición del druida",
        durationSeconds: 3600,
      }),
    );
  });

  it("quien no puede editar **los ve y no los toca**", async () => {
    // Esconderlos le dejaría con un número que no puede explicar; el control lo impone el servidor.
    vi.spyOn(api, "fetchTemporaryModifiers").mockResolvedValue([fila({})]);
    montar(false);
    expect(await screen.findByText(/Poción de fuerza de gigante/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Quitar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ponerlo" })).not.toBeInTheDocument();
  });
});
