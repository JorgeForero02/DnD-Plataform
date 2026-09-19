import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DarXp } from "../DarXp";
import * as charactersApi from "../../../characters/api";
import * as bestiarioApi from "../../../bestiario/api";
import type { Character } from "../../../characters/api";
import type { NpcEnLaMesa } from "../../../bestiario/api";
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

/**
 * **El PNJ llega por `GET /npcs`, no por `GET /characters`** (ola de arreglos 1, I9): la lista de
 * personajes filtra `statblockRef: null` a propósito, así que el fixture de antes —un `Character`
 * con `statblockRef`— era un caso que el servidor nunca produce, y la casilla bloqueada era código
 * muerto. Aquí el PNJ viene de donde viene de verdad.
 */
const KLARG: NpcEnLaMesa = {
  id: "p",
  name: "Klarg",
  statblockRef: "SRD:goblin",
  currentHp: 7,
  ownerId: "u-dm",
  visibility: "DM_ONLY",
};

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
  vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([A]);
  vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([KLARG]);
});

describe("DarXp", () => {
  it("un PNJ de statblock —que llega por /npcs, no por /characters— se pinta bloqueado, con el motivo a la vista y asociado", async () => {
    pintar();
    await screen.findByLabelText("Aria");

    const casillaPnj = (await screen.findByLabelText("Klarg")) as HTMLInputElement;
    expect(casillaPnj).toBeDisabled();
    const motivo = screen.getByText("Las criaturas del bestiario no acumulan PX.");
    expect(motivo).toBeInTheDocument();
    // a11y (Minor de la revisión): el motivo está asociado a la casilla, no suelto al lado.
    expect(casillaPnj).toHaveAccessibleDescription("Las criaturas del bestiario no acumulan PX.");

    const casillaJugador = screen.getByLabelText("Aria") as HTMLInputElement;
    expect(casillaJugador).not.toBeDisabled();
  });

  it("un PNJ que viniera en las dos listas no sale dos veces", async () => {
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([
      A,
      personaje({ id: "p", name: "Klarg", statblockRef: "SRD:goblin" }),
    ]);
    pintar();
    await screen.findByLabelText("Aria");
    await screen.findByLabelText("Klarg");
    expect(screen.getAllByLabelText("Klarg")).toHaveLength(1);
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
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([A, B]);
    pintar(propuesta);
    await screen.findByLabelText("Aria");

    expect(screen.getByLabelText("Aria")).toBeChecked();
    expect(screen.getByLabelText("Brann")).toBeChecked();
    expect(screen.getByLabelText("Cantidad")).toHaveValue(50);
    expect(screen.getByRole("radio", { name: /A cada uno/ })).toBeChecked();
    // «2 Goblin», no «2 goblins»: el nombre tal cual, sin un plural pegado con «s».
    expect(
      screen.getByText("Propuesto por el combate: 100 PX (2 Goblin · VD 1/4)"),
    ).toBeInTheDocument();
  });

  // Handoff de la ola 1 de la API: `xpPropuesto.sinTabla` lista los enemigos cuyo VD no tiene
  // fila en la tabla del SRD. Se enseñan con su VD y la frase de «añádelos a mano»; con el total a
  // 0 la propuesta sigue siendo válida y el DM teclea la cantidad.
  it("los enemigos sin fila en la tabla se listan con su VD, y una propuesta de total 0 se acepta", async () => {
    const propuesta: XpPropuesto = {
      total: 0,
      porCabeza: 0,
      destinatarios: [{ characterId: "a", name: "Aria" }],
      desglose: [],
      sinTabla: [{ characterId: "x", name: "Quimera de la mina", cr: 2.5 }],
    };
    pintar(propuesta);
    await screen.findByLabelText("Aria");

    expect(screen.getByText("Propuesto por el combate: 0 PX")).toBeInTheDocument();
    expect(screen.getByText(/Sin fila en la tabla del SRD/)).toHaveTextContent(
      "Quimera de la mina (VD 2.5)",
    );
    expect(screen.getByLabelText("Aria")).toBeChecked();
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
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([A, B]);
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

  // Ola de arreglos 1 (I8) — sin confirmación ni vaciado, el formulario seguía abierto con las
  // mismas casillas y la misma cantidad: la receta para dar dos veces (el servidor no lo
  // idempotiza). Ahora se dice qué se dio, se vacía y se avisa al padre con la misma frase.
  it("tras dar con éxito: «Dados 50 PX a Aria», el formulario se vacía y onHecho recibe la frase", async () => {
    vi.spyOn(charactersApi, "awardXp").mockResolvedValue({ awarded: [] });
    const onHecho = vi.fn();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <DarXp campaignId={CAMPANA} onHecho={onHecho} />
      </QueryClientProvider>,
    );
    await screen.findByLabelText("Aria");

    fireEvent.click(screen.getByLabelText("Aria"));
    fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "Dar experiencia" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Dados 50 PX a Aria");
    expect(screen.getByLabelText("Aria")).not.toBeChecked();
    expect(screen.getByLabelText("Cantidad")).toHaveValue(null);
    expect(onHecho).toHaveBeenCalledWith("Dados 50 PX a Aria");
  });

  it("un decimal no se trunca en silencio: se dice en línea y no se manda", async () => {
    const dar = vi.spyOn(charactersApi, "awardXp").mockResolvedValue({ awarded: [] });
    pintar();
    await screen.findByLabelText("Aria");

    fireEvent.click(screen.getByLabelText("Aria"));
    fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "300.7" } });
    fireEvent.click(screen.getByRole("button", { name: "Dar experiencia" }));

    expect(await screen.findByText(/número entero/)).toBeInTheDocument();
    expect(dar).not.toHaveBeenCalled();
  });

  it("«a repartir» un total negativo redondea hacia cero: −100 entre 3 son −33, no −34", async () => {
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([
      A,
      B,
      personaje({ id: "c", name: "Cora" }),
    ]);
    const dar = vi.spyOn(charactersApi, "awardXp").mockResolvedValue({ awarded: [] });
    pintar();
    await screen.findByLabelText("Aria");

    fireEvent.click(screen.getByLabelText("Aria"));
    fireEvent.click(screen.getByLabelText("Brann"));
    fireEvent.click(screen.getByLabelText("Cora"));
    fireEvent.click(screen.getByRole("radio", { name: /A repartir entre los elegidos/ }));
    fireEvent.change(screen.getByLabelText("Cantidad"), { target: { value: "-100" } });
    fireEvent.click(screen.getByRole("button", { name: "Dar experiencia" }));

    await waitFor(() =>
      expect(dar).toHaveBeenCalledWith(CAMPANA, expect.objectContaining({ amount: -33 })),
    );
  });
});
