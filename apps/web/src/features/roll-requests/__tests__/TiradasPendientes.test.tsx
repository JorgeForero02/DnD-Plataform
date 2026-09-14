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

// Ronda de arreglo 1 (C-1) — la clave real que manda el servidor al pedir iniciativa
// (`encounters.service.ts`), no una clave inventada con forma de característica. Con
// `save.dex`/`skill.perception` estas pruebas no habrían visto que `nombreDeClave` no conocía
// `initiative` en absoluto.
const DE_ENCUENTRO: RollRequestRow = {
  id: "req-2",
  campaignId: CAMPANA,
  characterId: "ch-1",
  requestedById: "dm1",
  key: "initiative",
  label: "Iniciativa",
  dc: null,
  mode: "NORMAL",
  audience: "PUBLIC",
  createdAt: "2026-01-01",
  resolvedAt: null,
  resolvedEventId: null,
  encounterId: "enc-1",
  modifier: 2,
};

const BRANN: Character = {
  id: "ch-1",
  campaignId: CAMPANA,
  ownerId: "u1",
  name: "Brann",
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
    vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([DE_ENCUENTRO]);

    pintar();

    expect(await screen.findByText(/empieza el combate/i)).toBeInTheDocument();
    // No pasa por la caja pequeña de «Te han pedido tirar»: nada de eso se pinta para ella.
    expect(screen.queryByText("Te han pedido tirar")).not.toBeInTheDocument();
    // Y el modificador que mandó el servidor se ve antes de tirar.
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("cuando su petición deja de estar en la lista, el panel de iniciativa se va solo", async () => {
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

  // Ronda de arreglo 1 (I-6) — el resultado de una iniciativa ya tirada tiene su propio sitio, y
  // no aterriza bajo el rótulo de la caja pequeña, que hablaría de una petición pendiente que ya
  // no existe.
  it("al tirar la iniciativa, el resultado sale en su propia caja, no en «Te han pedido tirar»", async () => {
    vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([DE_ENCUENTRO]);
    vi.spyOn(rollRequestsApi, "answerRollRequest").mockResolvedValue({
      revealed: true,
      eventId: "ev-3",
      expression: "1d20+2",
      audience: "PUBLIC",
      rolls: [14],
      kept: [14],
      dropped: [],
      modifier: 2,
      total: 16,
      natural: "NONE",
      outcome: "NO_DC",
    });

    pintar();

    fireEvent.click(await screen.findByRole("button", { name: /Tirar iniciativa/i }));

    expect(await screen.findByText("16")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Tu iniciativa" })).toBeInTheDocument();
    // El panel grande ya se fue (la petición dejó de estar pendiente) y la caja pequeña de
    // siempre nunca llegó a abrirse: no había ninguna petición normal ni respuesta normal que la
    // justificara.
    expect(screen.queryByText(/empieza el combate/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Te han pedido tirar")).not.toBeInTheDocument();
  });

  // I-3 — dos peticiones de iniciativa a la vez (un jugador con dos personajes): tirar en una no
  // puede apagar el botón de la otra.
  it("con dos peticiones de iniciativa, tirar una no apaga el botón de la otra", async () => {
    const OTRA: RollRequestRow = { ...DE_ENCUENTRO, id: "req-3", characterId: "ch-2" };
    vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([DE_ENCUENTRO, OTRA]);
    // No se resuelve nunca: lo que importa es el instante en que la mutación está en vuelo.
    vi.spyOn(rollRequestsApi, "answerRollRequest").mockReturnValue(new Promise(() => {}));

    pintar();

    const botones = await screen.findAllByRole("button", { name: /Tirar iniciativa/i });
    expect(botones).toHaveLength(2);

    fireEvent.click(botones[0]);

    await waitFor(() => expect(botones[0]).toHaveAttribute("aria-disabled", "true"));
    // El segundo botón sigue activo: nadie tiró por ese personaje.
    expect(botones[1]).not.toHaveAttribute("aria-disabled", "true");
  });

  // I-4 — la ausencia de panel afirma «no hay ningún combate esperándote». Con la consulta en
  // error eso es mentira por omisión.
  it("si no se puede comprobar si hay peticiones, lo dice, no se queda callado", async () => {
    vi.spyOn(rollRequestsApi, "fetchRollRequests").mockRejectedValue(new Error("caído"));

    pintar();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /No se pudo comprobar si te han pedido tirar/,
    );
  });

  // --- Tarea 6 (puerta de efectos, §4.3) — lo que el servidor aplicó de verdad al responder ---
  //
  // El servidor puede devolver `effectApplied` en la respuesta de `answer()` cuando la petición
  // traía un `pendingEffect` (fc8b369). Aquí se prueba que la pantalla dice qué pasó, con las
  // tres frases que puede pintar — no una interpolación genérica del número.
  describe("el daño aplicado al responder (E-PE-2/§4.3)", () => {
    it("falló: «Aplicado: −14 PG (falló)»", async () => {
      vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([PENDIENTE]);
      vi.spyOn(rollRequestsApi, "answerRollRequest").mockResolvedValue({
        revealed: true,
        eventId: "ev-4",
        expression: "1d20+5",
        audience: "PUBLIC",
        rolls: [3],
        kept: [3],
        dropped: [],
        modifier: 5,
        total: 8,
        dc: 15,
        natural: "NONE",
        outcome: "FAILURE",
        effectApplied: { delta: -14, saved: false },
      });

      pintar();

      fireEvent.click(
        await screen.findByRole("button", {
          name: "Tirar: Percepción para ver si oís al posadero",
        }),
      );

      expect(await screen.findByText("Aplicado: −14 PG (falló)")).toBeInTheDocument();
    });

    it("salvó con mitad de daño: «Aplicado: −7 PG (salvó, mitad)»", async () => {
      vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([PENDIENTE]);
      vi.spyOn(rollRequestsApi, "answerRollRequest").mockResolvedValue({
        revealed: true,
        eventId: "ev-5",
        expression: "1d20+5",
        audience: "PUBLIC",
        rolls: [18],
        kept: [18],
        dropped: [],
        modifier: 5,
        total: 23,
        dc: 15,
        natural: "NONE",
        outcome: "SUCCESS",
        effectApplied: { delta: -7, saved: true },
      });

      pintar();

      fireEvent.click(
        await screen.findByRole("button", {
          name: "Tirar: Percepción para ver si oís al posadero",
        }),
      );

      expect(await screen.findByText("Aplicado: −7 PG (salvó, mitad)")).toBeInTheDocument();
    });

    it("salvó sin ningún daño: «Salvó: sin daño»", async () => {
      vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([PENDIENTE]);
      vi.spyOn(rollRequestsApi, "answerRollRequest").mockResolvedValue({
        revealed: true,
        eventId: "ev-6",
        expression: "1d20+5",
        audience: "PUBLIC",
        rolls: [20],
        kept: [20],
        dropped: [],
        modifier: 5,
        total: 25,
        dc: 15,
        natural: "NONE",
        outcome: "SUCCESS",
        effectApplied: { delta: 0, saved: true },
      });

      pintar();

      fireEvent.click(
        await screen.findByRole("button", {
          name: "Tirar: Percepción para ver si oís al posadero",
        }),
      );

      expect(await screen.findByText("Salvó: sin daño")).toBeInTheDocument();
    });

    it("sin effectApplied no se pinta ninguna frase de daño aplicado", async () => {
      vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([PENDIENTE]);
      vi.spyOn(rollRequestsApi, "answerRollRequest").mockResolvedValue({
        revealed: true,
        eventId: "ev-7",
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

      fireEvent.click(
        await screen.findByRole("button", {
          name: "Tirar: Percepción para ver si oís al posadero",
        }),
      );

      await screen.findByText("17");
      expect(screen.queryByText(/^Aplicado:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/^Salvó:/)).not.toBeInTheDocument();
    });
  });
});
