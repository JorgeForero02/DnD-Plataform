import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BarraDeSesion } from "../BarraDeSesion";
import { ControlesDeSesion } from "../ControlesDeSesion";
import { lineaDeLog } from "../linea-de-log";
import { duracionDesde, nombreSello } from "../vocabulario";
import * as sessionsApi from "../api";
import * as logApi from "../log-api";
import * as members from "../../campaigns/members";
import * as charactersApi from "../../characters/api";

const sesion = (over: Partial<sessionsApi.Session> = {}): sessionsApi.Session => ({
  id: "s1",
  campaignId: "c1",
  title: "El puerto en llamas",
  scheduledAt: null,
  notes: null,
  visibility: "PLAYERS",
  createdAt: "2026-09-02T20:00:00.000Z",
  status: "PLANNED",
  startedAt: null,
  endedAt: null,
  attendance: null,
  ...over,
});

function montar(ui: React.ReactNode, ruta = "/campaigns/c1") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/campaigns/:id" element={<>{ui}</>} />
          <Route path="*" element={<>{ui}</>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("la barra de «en juego»", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);
  });

  it("no se ve cuando no hay ninguna sesión en curso", async () => {
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(null);

    montar(<BarraDeSesion campaignId="c1" />);

    await waitFor(() => expect(sessionsApi.fetchCurrentSession).toHaveBeenCalled());
    expect(screen.queryByRole("status", { name: "Sesión en curso" })).not.toBeInTheDocument();
  });

  it("aparece con el título de la sesión cuando la hay", async () => {
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(
      sesion({ status: "IN_PROGRESS", startedAt: new Date().toISOString() }),
    );

    montar(<BarraDeSesion campaignId="c1" />);

    expect(await screen.findByText("El puerto en llamas")).toBeInTheDocument();
  });

  it("un sello se manda con su clase y sin `sessionId`: la sesión la busca el servidor", async () => {
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(
      sesion({ status: "IN_PROGRESS", startedAt: new Date().toISOString() }),
    );
    const espia = vi.spyOn(sessionsApi, "stampSessionNote").mockResolvedValue({ id: "ev1" });

    montar(<BarraDeSesion campaignId="c1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Anotar" }));
    fireEvent.change(screen.getByLabelText("Qué anotar"), { target: { value: "los guardias" } });
    fireEvent.click(screen.getByRole("button", { name: /Combate/ }));

    await waitFor(() =>
      expect(espia).toHaveBeenCalledWith("c1", {
        kind: "COMBAT",
        text: "los guardias",
        visibility: "PLAYERS",
      }),
    );
  });

  it("marcando «solo el DM», el sello viaja como DM_ONLY", async () => {
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(
      sesion({ status: "IN_PROGRESS", startedAt: new Date().toISOString() }),
    );
    const espia = vi.spyOn(sessionsApi, "stampSessionNote").mockResolvedValue({ id: "ev1" });

    montar(<BarraDeSesion campaignId="c1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Anotar" }));
    // El texto ahora hace falta, y esta línea es la única que cambia: **el sello vacío ya no se
    // manda**. Era el defecto de la auditoría del 2026-09-04 —pulsar «Nota» escribía en el
    // registro una entrada que decía «Nota» y nada más— y tenía DOS compositores; el del hilo se
    // arregló en su carril y este es el segundo, que además se pinta en toda pantalla de campaña.
    // **Lo que esta prueba comprueba no cambia**: que marcar «Solo el DM» hace viajar el sello
    // como `DM_ONLY`.
    fireEvent.change(screen.getByLabelText("Qué anotar"), {
      target: { value: "una puerta falsa" },
    });
    fireEvent.click(screen.getByLabelText("Solo el DM lo ve"));
    fireEvent.click(screen.getByRole("button", { name: /Hallazgo/ }));

    await waitFor(() =>
      expect(espia).toHaveBeenCalledWith("c1", expect.objectContaining({ visibility: "DM_ONLY" })),
    );
  });
});

describe("empezar y cerrar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(members, "useMembers").mockReturnValue({
      data: [{ userId: "u1", displayName: "Ysolde", role: "PLAYER" }],
    } as never);
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);
  });

  it("una sesión planeada ofrece empezar; el jugador la ve deshabilitada con su motivo", () => {
    montar(<ControlesDeSesion campaignId="c1" session={sesion()} puedeGestionar={false} />);

    const boton = screen.getByRole("button", { name: "Empezar" });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    expect(boton).toHaveAttribute("title", "Solo el DM empieza una sesión.");
  });

  it("empezar manda la asistencia de quien se marca", async () => {
    const espia = vi
      .spyOn(sessionsApi, "startSession")
      .mockResolvedValue(sesion({ status: "IN_PROGRESS" }));

    montar(<ControlesDeSesion campaignId="c1" session={sesion()} puedeGestionar />);
    fireEvent.click(screen.getByRole("button", { name: "Empezar" }));
    fireEvent.click(await screen.findByLabelText("Ysolde"));
    fireEvent.click(screen.getByRole("button", { name: "Empezar la sesión" }));

    await waitFor(() =>
      expect(espia).toHaveBeenCalledWith("c1", "s1", {
        attendance: [{ userId: "u1", characterId: undefined }],
      }),
    );
  });

  it("una sesión en curso ofrece ir a la mesa y cerrarla", () => {
    montar(
      <ControlesDeSesion
        campaignId="c1"
        session={sesion({ status: "IN_PROGRESS" })}
        puedeGestionar
      />,
    );

    expect(screen.getByRole("link", { name: "Ir a la mesa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
  });

  it("la crónica sale PRE-RELLENADA con los sellos de la sesión", async () => {
    // Es lo que ningún producto estudiado hace: derivar la crónica del registro. Si esto se
    // rompe, el DM vuelve al folio en blanco y la crónica deja de escribirse.
    vi.spyOn(logApi, "fetchGameEvents").mockResolvedValue({
      nextCursor: null,
      events: [
        {
          id: "e2",
          campaignId: "c1",
          sessionId: "s1",
          actorUserId: "dm1",
          type: "SESSION_NOTE",
          subjectType: "session",
          subjectId: "s1",
          payload: { type: "SESSION_NOTE", kind: "NPC", text: "Maestre Kellan" },
          visibility: "PLAYERS",
          createdAt: "2026-09-02T21:02:00.000Z",
        },
        {
          id: "e1",
          campaignId: "c1",
          sessionId: "s1",
          actorUserId: "dm1",
          type: "SESSION_NOTE",
          subjectType: "session",
          subjectId: "s1",
          payload: { type: "SESSION_NOTE", kind: "COMBAT" },
          visibility: "PLAYERS",
          createdAt: "2026-09-02T21:14:00.000Z",
        },
      ] as never,
    });

    montar(
      <ControlesDeSesion
        campaignId="c1"
        session={sesion({ status: "IN_PROGRESS" })}
        puedeGestionar
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    const area = await screen.findByLabelText("Qué pasó");
    await waitFor(() => expect((area as HTMLTextAreaElement).value).toContain("· Combate"));
    expect((area as HTMLTextAreaElement).value).toContain("· PNJ: Maestre Kellan");
  });

  it("**el DM elige quién puede leer la crónica, y esa elección viaja al servidor**", async () => {
    // El servidor ya respeta `recapVisibility` desde el plan 02; hasta entonces publicaba el
    // suceso con la visibilidad de la SESIÓN y elegir no hacía nada. Sin este control, el arreglo
    // del servidor no lo usaría nadie: una ficha con servidor hecho y sin pantalla sigue abierta.
    vi.spyOn(logApi, "fetchGameEvents").mockResolvedValue({ nextCursor: null, events: [] });
    const cerrar = vi
      .spyOn(sessionsApi, "closeSession")
      .mockResolvedValue(sesion({ status: "CLOSED" }) as never);

    montar(
      <ControlesDeSesion
        campaignId="c1"
        session={sesion({ status: "IN_PROGRESS" })}
        puedeGestionar
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await screen.findByLabelText("Qué pasó");

    // Los niveles se ofrecen **traducidos**, nunca como valores del enum.
    expect(screen.queryByText("DM_ONLY")).not.toBeInTheDocument();
    const soloDm = screen.getByRole("radio", { name: /Solo el DM/i });
    fireEvent.click(soloDm);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar la sesión" }));

    await waitFor(() =>
      expect(cerrar).toHaveBeenCalledWith(
        "c1",
        "s1",
        expect.objectContaining({ recapVisibility: "DM_ONLY" }),
      ),
    );
  });
});

describe("el log se lee en prosa, nunca en claves", () => {
  it("traduce los sucesos que más salen en una partida", () => {
    expect(lineaDeLog({ type: "SESSION_STARTED", sessionTitle: "S12" })).toBe(
      "Empieza la sesión «S12»",
    );
    expect(
      lineaDeLog({ type: "HP_CHANGED", delta: -7, from: 24, to: 17, reason: "Espadazo" }),
    ).toBe("Pierde 7 PG (24 → 17) — Espadazo");
    expect(lineaDeLog({ type: "HP_CHANGED", delta: -60, from: 7, to: 0, massive: true })).toContain(
      "muere en el acto",
    );
    expect(lineaDeLog({ type: "REST_DECLARED", rest: "LONG" })).toBe("Descanso largo");
    expect(lineaDeLog({ type: "SESSION_NOTE", kind: "DECISION", text: "pagan" })).toBe(
      "Decisión: pagan",
    );
  });

  it("una tirada dice el 20 natural Y si llegó a la CD: son dos hechos distintos", () => {
    const linea = lineaDeLog({
      type: "ABILITY_ROLL",
      expression: "1d20+3",
      rolls: [20],
      kept: [20],
      dropped: [],
      modifier: 3,
      total: 23,
      dc: 25,
      natural: "TWENTY",
      outcome: "FAILURE",
      reason: "Sigilo",
    });

    expect(linea).toContain("no llega a la CD 25");
    expect(linea).toContain("20 natural");
  });

  it("una clave sin traducción se VE, no se cae en silencio", () => {
    expect(nombreSello("INVENTADO")).toBe("Sin traducir: INVENTADO");
  });

  it("la duración se cuenta en horas y minutos, sin segundos", () => {
    const inicio = new Date("2026-09-02T20:00:00.000Z").toISOString();
    const ahora = new Date("2026-09-02T21:47:00.000Z").getTime();
    expect(duracionDesde(inicio, ahora)).toBe("1h 47m");
    expect(duracionDesde(null, ahora)).toBe("");
  });
});
