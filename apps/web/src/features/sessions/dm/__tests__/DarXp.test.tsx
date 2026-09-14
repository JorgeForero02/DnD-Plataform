import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarXp } from "../DarXp";
import * as charactersApi from "../../../characters/api";
import type { Character } from "../../../characters/api";
import type { XpPropuesto } from "@dnd/shared";

// Puerta de efectos §5 bis (D-CF-68/D-CF-69) — «Dar XP», la séptima herramienta del DM (E-PE-8).
//
// Lo que se prueba aquí es lo que puede romperse en silencio: que un PNJ de statblock se enseña
// bloqueado y CON su motivo (docs/04-convenciones.md — nunca escondido), que la propuesta del
// combate precarga el formulario en vez de obligar al DM a repetir lo que el servidor ya calculó,
// y que «a repartir» de verdad reparte en vez de mandar el total tal cual.

const CAMPANA = "camp-1";

function personaje(over: Partial<Character>): Character {
  return {
    id: "a",
    campaignId: CAMPANA,
    ownerId: "u1",
    name: "Aria",
    raceKey: null,
    subraceKey: null,
    classKey: "fighter",
    level: 3,
    bio: null,
    visibility: "PLAYERS",
    createdAt: "2026-01-01",
    archivedAt: null,
    color: null,
    statblockRef: null,
    ...over,
  };
}

const A = personaje({ id: "a", name: "Aria" });
const B = personaje({ id: "b", name: "Brann" });
const P = personaje({ id: "p", name: "Klarg", statblockRef: "SRD:goblin" });

function pintar(propuesta?: XpPropuesto) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DarXp campaignId={CAMPANA} propuesta={propuesta} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([A, P]);
});

describe("DarXp", () => {
  it("un PNJ de statblock se pinta marcado como no seleccionable, con el motivo a la vista", async () => {
    pintar();
    await screen.findByLabelText("Aria");

    const casillaPnj = screen.getByLabelText("Klarg") as HTMLInputElement;
    expect(casillaPnj).toBeDisabled();
    expect(screen.getByText("Un PNJ de statblock no acumula XP")).toBeInTheDocument();

    const casillaJugador = screen.getByLabelText("Aria") as HTMLInputElement;
    expect(casillaJugador).not.toBeDisabled();
  });

  it("hay dos radios de reparto, cada uno con su frase", async () => {
    pintar();
    await screen.findByLabelText("Aria");

    expect(screen.getByRole("radio", { name: /A cada uno/ })).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /A repartir entre los elegidos/ }),
    ).toBeInTheDocument();
  });

  it("con una propuesta del combate, el formulario abre prellenado y enseña el resumen del VD", async () => {
    const propuesta: XpPropuesto = {
      total: 100,
      porCabeza: 50,
      destinatarios: [
        { characterId: "a", name: "Aria" },
        { characterId: "b", name: "Brann" },
      ],
      desglose: [
        { characterId: "g1", name: "Goblin", cr: 0.25, xp: 50 },
        { characterId: "g2", name: "Goblin", cr: 0.25, xp: 50 },
      ],
    };
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([A, B, P]);
    pintar(propuesta);
    await screen.findByLabelText("Aria");

    expect(screen.getByLabelText("Aria")).toBeChecked();
    expect(screen.getByLabelText("Brann")).toBeChecked();
    expect(screen.getByLabelText("Cantidad")).toHaveValue(50);
    expect(screen.getByRole("radio", { name: /A cada uno/ })).toBeChecked();
    expect(
      screen.getByText("Propuesto por el combate: 100 PX (2 goblins · VD 1/4)"),
    ).toBeInTheDocument();
  });

  it("enviar llama a awardXp con los elegidos, la cantidad y el motivo", async () => {
    const dar = vi.spyOn(charactersApi, "awardXp").mockResolvedValue({ awarded: [] });
    pintar();
    await screen.findByLabelText("Aria");

    fireEvent.click(screen.getByLabelText("Aria"));
    fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Motivo (opcional)"), {
      target: { value: "El troll de la mina" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dar experiencia" }));

    await waitFor(() =>
      expect(dar).toHaveBeenCalledWith(CAMPANA, {
        characterIds: ["a"],
        amount: 50,
        reason: "El troll de la mina",
      }),
    );
  });

  it("«a repartir» divide el total entre los elegidos, no lo manda tal cual", async () => {
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([A, B, P]);
    const dar = vi.spyOn(charactersApi, "awardXp").mockResolvedValue({ awarded: [] });
    pintar();
    await screen.findByLabelText("Aria");

    fireEvent.click(screen.getByLabelText("Aria"));
    fireEvent.click(screen.getByLabelText("Brann"));
    fireEvent.click(screen.getByRole("radio", { name: /A repartir entre los elegidos/ }));
    fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Dar experiencia" }));

    await waitFor(() =>
      expect(dar).toHaveBeenCalledWith(
        CAMPANA,
        expect.objectContaining({ characterIds: ["a", "b"], amount: 50 }),
      ),
    );
  });

  it("cantidad 0 se dice en línea y no se manda; el botón no se deshabilita", async () => {
    const dar = vi.spyOn(charactersApi, "awardXp").mockResolvedValue({ awarded: [] });
    pintar();
    await screen.findByLabelText("Aria");

    fireEvent.click(screen.getByLabelText("Aria"));
    fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "0" } });
    const boton = screen.getByRole("button", { name: "Dar experiencia" });
    expect(boton).not.toBeDisabled();
    fireEvent.click(boton);

    expect(await screen.findByText(/no puede ser cero/)).toBeInTheDocument();
    expect(dar).not.toHaveBeenCalled();
    expect(boton).not.toBeDisabled();
  });
});
