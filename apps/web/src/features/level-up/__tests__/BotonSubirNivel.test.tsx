import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BotonSubirNivel } from "../BotonSubirNivel";
import * as levelUpApi from "../api";
import type { LevelUpPreview } from "../api";
import { ApiError } from "../../../lib/api";

// Tarea 2A.11 — lo que estas pruebas exigen es el contrato de la pantalla, no su maquetación:
// que el diff pintado son los números del previo, que pedir el previo con `roll` no aplica
// nada, que confirmar manda el `POST` y refresca la hoja, que el techo del SRD no ofrece subir,
// y que un rechazo del servidor se ve con su propio mensaje.

function wrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function nuevoCliente() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

/** Guerrero enano de nivel 3 subiendo a 4: la competencia no cambia, pero sí toca una ASI. */
const previoMedia: LevelUpPreview = {
  from: 3,
  to: 4,
  hp: {
    method: "AVERAGE",
    hitDie: 10,
    conModifier: 2,
    delta: 8,
    current: 28,
    next: 36,
  },
  proficiencyBonus: { from: 2, to: 2, changed: false },
  attacksPerAction: { from: 1, to: 1, changed: false },
  hitDice: { from: 3, to: 4, dieSize: 10 },
  spellSlots: { from: [], to: [], changed: false },
  newFeatures: [
    { source: "class", key: "fighter.ability-score-improvement", name: "Mejora de característica" },
    { source: "subclass", key: "champion.remarkable-athlete", name: "Atleta excepcional" },
  ],
  abilityScoreImprovementPending: true,
};

const previoTirado: LevelUpPreview = {
  ...previoMedia,
  hp: {
    method: "ROLL",
    hitDie: 10,
    conModifier: 2,
    delta: 9,
    current: 28,
    next: 37,
    roll: { expression: "1d10", rolled: 7, total: 9 },
  },
};

async function abrirDialogo() {
  fireEvent.click(screen.getByRole("button", { name: "Subir a nivel 4" }));
  await screen.findByRole("dialog", { name: "Subir de nivel" });
}

describe("BotonSubirNivel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("pinta el diff con los números que manda el previo, y traduce las enumeraciones", async () => {
    vi.spyOn(levelUpApi, "fetchLevelUpPreview").mockResolvedValue(previoMedia);
    render(<BotonSubirNivel campaignId="c1" characterId="ch1" level={3} />, {
      wrapper: wrapper(nuevoCliente()),
    });
    await abrirDialogo();

    expect(await screen.findByText("Nivel 3 → 4")).toBeInTheDocument();
    // PG máximos: el antes, el después y el delta salen del previo, no de una cuenta local.
    expect(screen.getByText("28 → 36")).toBeInTheDocument();
    expect(screen.getByText("(+8)")).toBeInTheDocument();
    // La competencia no cambia a este nivel, y se dice en vez de callarse.
    expect(screen.getByText("No cambia (+2)")).toBeInTheDocument();
    expect(screen.getByText("3d10 → 4d10")).toBeInTheDocument();
    // Aptitudes nuevas, con su origen traducido — nunca «class» ni «subclass».
    expect(screen.getByText("Mejora de característica")).toBeInTheDocument();
    expect(screen.getByText("Atleta excepcional")).toBeInTheDocument();
    expect(screen.getByText("Clase")).toBeInTheDocument();
    expect(screen.getByText("Subclase")).toBeInTheDocument();
    expect(screen.getByRole("dialog").textContent).not.toMatch(/\bsubclass\b|\bAVERAGE\b/);
  });

  it("pedir el previo con «roll» no aplica nada: enseña la tirada y no manda el POST", async () => {
    const previo = vi
      .spyOn(levelUpApi, "fetchLevelUpPreview")
      .mockResolvedValueOnce(previoMedia)
      .mockResolvedValueOnce(previoTirado);
    const aplicar = vi.spyOn(levelUpApi, "applyLevelUp");

    render(<BotonSubirNivel campaignId="c1" characterId="ch1" level={3} />, {
      wrapper: wrapper(nuevoCliente()),
    });
    await abrirDialogo();
    await screen.findByText("Nivel 3 → 4");

    fireEvent.click(screen.getByRole("button", { name: "Tirar el dado de golpe" }));

    await waitFor(() => expect(previo).toHaveBeenCalledWith("c1", "ch1", true));
    expect(await screen.findByText(/sacaste 7/)).toBeInTheDocument();
    expect(screen.getByText("28 → 37")).toBeInTheDocument();
    // Lo que esta prueba existe para vigilar: tirar no sube de nivel.
    expect(aplicar).not.toHaveBeenCalled();
  });

  it("confirmar manda el POST y invalida la hoja del personaje", async () => {
    vi.spyOn(levelUpApi, "fetchLevelUpPreview").mockResolvedValue(previoMedia);
    const aplicar = vi.spyOn(levelUpApi, "applyLevelUp").mockResolvedValue({ id: "ch1", level: 4 });

    const qc = nuevoCliente();
    const invalidar = vi.spyOn(qc, "invalidateQueries");

    render(<BotonSubirNivel campaignId="c1" characterId="ch1" level={3} />, {
      wrapper: wrapper(qc),
    });
    await abrirDialogo();
    await screen.findByText("Nivel 3 → 4");

    fireEvent.click(screen.getByRole("button", { name: "Confirmar subida de nivel" }));

    await waitFor(() => expect(aplicar).toHaveBeenCalledWith("c1", "ch1"));
    await waitFor(() =>
      expect(invalidar).toHaveBeenCalledWith({
        queryKey: ["campaigns", "c1", "characters", "ch1", "sheet"],
      }),
    );
    // Y el diálogo se cierra solo: la subida ya está hecha, no hay nada más que confirmar.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("a nivel 20 no se ofrece subir, y se explica por qué", () => {
    const previo = vi.spyOn(levelUpApi, "fetchLevelUpPreview");
    render(<BotonSubirNivel campaignId="c1" characterId="ch1" level={20} />, {
      wrapper: wrapper(nuevoCliente()),
    });

    expect(screen.queryByRole("button", { name: /Subir a nivel/ })).not.toBeInTheDocument();
    expect(screen.getByText(/el techo del SRD 5\.1/)).toBeInTheDocument();
    expect(previo).not.toHaveBeenCalled();
  });

  it("un rechazo del servidor se ve con el mensaje del servidor, no con uno inventado", async () => {
    vi.spyOn(levelUpApi, "fetchLevelUpPreview").mockRejectedValue(
      new ApiError("No se puede subir de nivel: faltan con, raza.", 400),
    );

    render(<BotonSubirNivel campaignId="c1" characterId="ch1" level={3} />, {
      wrapper: wrapper(nuevoCliente()),
    });
    await abrirDialogo();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se puede subir de nivel: faltan con, raza.",
    );
  });
});
