import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AyudarA } from "../AyudarA";
import type { Character } from "../../../characters/api";
import * as charactersApi from "../../../characters/api";
import * as sheetApi from "../../../character-sheet/api";

// Plan 08, ficha I8 — **Ayudar da ventaja, y la pantalla dice lo que el servidor no comprueba.**
//
// Lo que se prueba aquí no es la mecánica —eso es del servidor y tiene su e2e—: es que la pantalla
// **no mienta**. El SRD exige que el enemigo esté a cinco pies de quien ayuda, y este producto no
// tiene distancias; callarlo dejaría a la mesa creyendo que el sistema lo vigila.

function personaje(id: string, name: string): Character {
  return {
    id,
    campaignId: "c1",
    ownerId: "u1",
    name,
    race: null,
    class: null,
    raceKey: null,
    subraceKey: null,
    classKey: null,
    level: 1,
    bio: null,
    visibility: "PLAYERS",
    color: null,
    createdAt: "x",
    archivedAt: null,
  };
}

const MIRA = personaje("ch-mira", "Mira");
const BRANN = personaje("ch-brann", "Brann");

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AyudarA campaignId="c1" personaje={MIRA} />
    </QueryClientProvider>,
  );
}

describe("la acción Ayudar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([MIRA, BRANN]);
  });

  it("**no promete lo que el servidor no comprueba**: la cercanía la juzga la mesa", async () => {
    montar();
    expect(await screen.findByText(/La cercanía la juzgas tú/i)).toBeInTheDocument();
    // Y dice los dos límites que sí se cumplen, porque son los que cambian cómo se juega.
    expect(screen.getByText(/primer ataque/i)).toBeInTheDocument();
    expect(screen.getByText(/Caduca al empezar tu turno siguiente/i)).toBeInTheDocument();
  });

  it("**ningún rótulo dice «+1d4» ni «+3»**: Ayudar da ventaja", async () => {
    // Los dos números de la maqueta son de otras reglas —`Bless` y el flanqueo de 3.ª—, y la regla
    // del proyecto es que las reglas de D&D mandan sobre la maqueta.
    const { container } = montar();
    await screen.findByRole("combobox");
    expect(container.textContent ?? "").not.toMatch(/\+1d4|\+3\b/);
    expect(container.textContent ?? "").toMatch(/ventaja/i);
  });

  it("no se ofrece ayudarse a sí mismo", async () => {
    montar();
    await screen.findByRole("combobox");
    expect(screen.queryByRole("option", { name: "Mira" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Brann" })).toBeInTheDocument();
  });

  it("manda a quién se ayuda, y hasta entonces el botón está apagado", async () => {
    const help = vi.spyOn(sheetApi, "help").mockResolvedValue(undefined as never);
    montar();
    const boton = await screen.findByRole("button", { name: "Ayudar" });
    expect(boton).toHaveAttribute("aria-disabled", "true");

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ch-brann" } });
    expect(boton).toBeEnabled();
    fireEvent.click(boton);

    await waitFor(() => expect(help).toHaveBeenCalledWith("c1", "ch-mira", "ch-brann"));
  });
});
