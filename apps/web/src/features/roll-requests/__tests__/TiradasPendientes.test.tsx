import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TiradasPendientes } from "../TiradasPendientes";
import * as rollRequestsApi from "../api";
import type { RollRequestRow } from "../api";
import * as charactersApi from "../../characters/api";
import type { Character } from "../../characters/api";
import * as characterSheetApi from "../../character-sheet/api";

// Tarea 2C.5 — la mitad de quien recibe el recado. Se prueba **lo que puede romperse en
// silencio**:
//
//  · que la petición se lee entera: la frase del DM y la CD que puso;
//  · que «Tirar» llama al endpoint de **esa** petición, sin cuerpo que la reinterprete;
//  · que una respuesta `revealed: false` dice que se tiró a ciegas y **no** deja escapar un
//    total — el agujero que 2C.1 cerró en el servidor y que aquí se podía reabrir;
//  · que sin peticiones **no se pinta ninguna caja**, ni siquiera una vacía.
//
// Tarea 9 (plan 2026-09-05-iniciativa-y-bando) suma una más:
//
//  · que **solo** la petición con `encounterId` usa `PanelDeIniciativa` — una normal, no.

const CAMPANA = "camp-1";

const PENDIENTE: RollRequestRow = {
  id: "req-1",
  campaignId: CAMPANA,
  characterId: "ch-1",
  requestedById: "dm1",
  key: "skill.perception",
  label: "Percepción para ver si oís al posadero",
  dc: 15,
  mode: "NORMAL",
  audience: "PUBLIC",
  createdAt: "2026-01-01",
  resolvedAt: null,
  resolvedEventId: null,
  encounterId: null,
};

const BRANN: Character = {
  id: "ch-1",
  campaignId: CAMPANA,
  ownerId: "u1",
  name: "Brann",
  race: null,
  class: null,
  raceKey: null,
  subraceKey: null,
  classKey: null,
  level: 1,
  bio: null,
  visibility: "PLAYERS",
  createdAt: "2026-01-01",
  archivedAt: null,
  color: null,
};

function pintar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={qc}>
      <TiradasPendientes campaignId={CAMPANA} />
    </QueryClientProvider>,
  );
  return { ...utils, qc };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([BRANN]);
  vi.spyOn(characterSheetApi, "fetchResources").mockResolvedValue([]);
});

describe("TiradasPendientes", () => {
  it("pinta la frase del DM y su CD, y «Tirar» llama al endpoint de esa petición", async () => {
    vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([PENDIENTE]);
    const responder = vi.spyOn(rollRequestsApi, "answerRollRequest").mockResolvedValue({
      revealed: true,
      eventId: "ev-1",
      expression: "1d20+5",
      audience: "PUBLIC",
      rolls: [12],
      kept: [12],
      dropped: [],
      modifier: 5,
      total: 17,
      dc: 15,
      natural: "NONE",
      outcome: "SUCCESS",
    });

    pintar();

    expect(await screen.findByText("Percepción para ver si oís al posadero")).toBeInTheDocument();
    expect(screen.getByText(/CD 15/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Tirar: Percepción para ver si oís al posadero" }),
    );

    await waitFor(() => expect(responder).toHaveBeenCalledTimes(1));
    // El tercer argumento es «gastar la inspiración» (plan 08, I8): sin marcarla, `false`.
    expect(responder).toHaveBeenCalledWith(CAMPANA, "req-1", false);
    expect(await screen.findByText("17")).toBeInTheDocument();
  });

  it("una respuesta a ciegas dice que se tiró a ciegas y no enseña ningún total", async () => {
    vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([
      { ...PENDIENTE, audience: "BLIND", dc: null },
    ]);
    vi.spyOn(rollRequestsApi, "answerRollRequest").mockResolvedValue({
      revealed: false,
      eventId: "ev-2",
      expression: "1d20+5",
      audience: "BLIND",
    });

    pintar();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Tirar: Percepción para ver si oís al posadero",
      }),
    );

    expect(await screen.findByText(/Tirado a ciegas/)).toBeInTheDocument();
    // Ni el total, ni los dados, ni el desglose: una tirada a ciegas no trae nada de eso, y esta
    // pantalla no puede inventarlo.
    expect(screen.queryByText("17")).not.toBeInTheDocument();
    expect(document.querySelector("[data-dado]")).toBeNull();
  });

  it("sin peticiones pendientes no pinta ninguna caja", async () => {
    vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([]);

    const { container } = pintar();

    await waitFor(() => expect(rollRequestsApi.fetchRollRequests).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(screen.queryByText("Te han pedido tirar")).not.toBeInTheDocument();
  });

  it("una petición normal NO usa el panel de iniciativa", async () => {
    vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([PENDIENTE]);

    pintar();

    expect(await screen.findByText("Percepción para ver si oís al posadero")).toBeInTheDocument();
    expect(screen.queryByText(/empieza el combate/i)).not.toBeInTheDocument();
  });

  it("una petición con encounterId usa el panel de iniciativa, y no la caja de siempre", async () => {
    const DE_ENCUENTRO: RollRequestRow = { ...PENDIENTE, id: "req-2", encounterId: "enc-1" };
    vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([DE_ENCUENTRO]);

    pintar();

    expect(await screen.findByText(/empieza el combate/i)).toBeInTheDocument();
    // No pasa por la caja pequeña de «Te han pedido tirar»: nada de eso se pinta para ella.
    expect(screen.queryByText("Te han pedido tirar")).not.toBeInTheDocument();
  });

  it("cuando su petición deja de estar en la lista, el panel de iniciativa se va solo", async () => {
    const DE_ENCUENTRO: RollRequestRow = { ...PENDIENTE, id: "req-2", encounterId: "enc-1" };
    const fetchMock = vi
      .spyOn(rollRequestsApi, "fetchRollRequests")
      .mockResolvedValue([DE_ENCUENTRO]);

    const { qc } = pintar();

    expect(await screen.findByText(/empieza el combate/i)).toBeInTheDocument();

    // El DM cancela el combate: la petición desaparece del listado sin que nadie tirara y sin
    // ningún suceso de resolución — exactamente lo que pasa cuando se borra sin escribir nada.
    // Se fuerza el refresco en vez de esperar los 60 s del sondeo (`lib/sondeo.ts`): el panel
    // se pinta **a partir de los datos**, así que en cuanto los datos cambian, tiene que irse
    // solo — sin que nadie tenga que pulsar nada, y sin un estado propio que lo mantenga vivo.
    fetchMock.mockResolvedValue([]);
    await qc.refetchQueries({ queryKey: ["campaigns", CAMPANA, "roll-requests"] });

    await waitFor(() => expect(screen.queryByText(/empieza el combate/i)).not.toBeInTheDocument());
  });
});
