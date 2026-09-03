import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MesaDeSesion } from "../MesaDeSesion";
import { selloDeSuceso } from "../linea-de-log";
import * as sessionsApi from "../api";
import * as logApi from "../log-api";
import * as members from "../../campaigns/members";
import * as charactersApi from "../../characters/api";
import * as sheetApi from "../../character-sheet/api";
import * as entitiesHooks from "../../entities/hooks";
import { useAuthStore } from "../../../store/auth.store";

// La mesa adoptada de la maqueta. Lo que se prueba aquí es lo que la pantalla **hace**, no cómo
// está maquetada: `jsdom` no maqueta, y lo que solo se ve pintado se mide en el navegador
// (`apps/web/e2e/sesion.spec.ts`).

const SESION: sessionsApi.Session = {
  id: "s1",
  campaignId: "c1",
  title: "El puerto en llamas",
  scheduledAt: null,
  notes: null,
  visibility: "PLAYERS",
  createdAt: "2026-09-02T20:00:00.000Z",
  status: "IN_PROGRESS",
  startedAt: "2026-09-02T20:00:00.000Z",
  endedAt: null,
  attendance: [
    { userId: "u-ana", characterId: "p-corvin" },
    { userId: "u-marco", characterId: "p-thora" },
  ],
};

const CORVIN = {
  id: "p-corvin",
  campaignId: "c1",
  ownerId: "u-ana",
  name: "Corvin Vhael",
  race: null,
  class: null,
  raceKey: "human",
  subraceKey: null,
  classKey: "rogue",
  level: 5,
  bio: null,
  visibility: "PLAYERS",
  createdAt: "2026-09-01T10:00:00.000Z",
} as charactersApi.Character;

const THORA = { ...CORVIN, id: "p-thora", ownerId: "u-marco", name: "Thora Piedrahonda" };

function hoja(current: number, max: number): sheetApi.SheetResponse {
  return {
    character: { id: "x" } as sheetApi.CharacterRow,
    sheet: null,
    hp: { current, max, temp: 0, version: 1, exceedsMax: false },
    deathSaves: {
      successes: 0,
      failures: 0,
      status: "alive",
    } as sheetApi.SheetResponse["deathSaves"],
  };
}

function condicion(key: string, id = key): sheetApi.ConditionRow {
  return {
    id,
    characterId: "p-corvin",
    key,
    level: null,
    note: null,
    appliedById: "u-dm",
    createdAt: "2026-09-02T21:00:00.000Z",
  };
}

function montar(quienSoy = "u-dm") {
  useAuthStore.setState({ user: { id: quienSoy, email: "x@y.z", displayName: "Yo" } as never });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/campaigns/c1/sesion"]}>
        <MesaDeSesion campaignId="c1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function conMiembros(rolMio: "DM" | "PLAYER") {
  vi.spyOn(members, "useMembers").mockReturnValue({
    data: [
      { userId: "u-dm", displayName: "Ada", role: "DM" },
      { userId: "u-ana", displayName: "Ana", role: "PLAYER" },
      { userId: "u-marco", displayName: "Marco", role: "PLAYER" },
      { userId: "u-lena", displayName: "Lena", role: "PLAYER" },
    ],
  } as never);
  vi.spyOn(members, "useMyRole").mockReturnValue({
    role: rolMio,
    isLoading: false,
    isError: false,
    retry: () => {},
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(SESION);
  vi.spyOn(logApi, "fetchGameEvents").mockResolvedValue({ nextCursor: null, events: [] });
  vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([CORVIN, THORA]);
  vi.spyOn(sheetApi, "fetchSheet").mockResolvedValue(hoja(42, 58));
  vi.spyOn(sheetApi, "fetchConditions").mockResolvedValue([]);
  vi.spyOn(entitiesHooks, "useAllEntities").mockReturnValue({ data: [] } as never);
  conMiembros("DM");
});

describe("el elenco: la maqueta trae los datos que se miran treinta veces por sesión", () => {
  it("pinta el personaje con su descriptor, quién lo lleva y sus puntos de golpe", async () => {
    montar();

    const elenco = await screen.findByRole("region", { name: "En la mesa" });
    expect(await within(elenco).findByText("Corvin Vhael")).toBeInTheDocument();
    // Descriptor traducido del catálogo, nunca la clave: `human`/`rogue` no llegan a la pantalla.
    expect(within(elenco).getAllByText(/Humano · Pícaro · Nivel 5/)).not.toHaveLength(0);
    expect(within(elenco).getByText("Lo lleva Ana")).toBeInTheDocument();
    // La cifra dice lo mismo que la barra: el color nunca es el único portador.
    expect(within(elenco).getAllByText("42/58").length).toBeGreaterThan(0);
    expect(
      within(elenco).getByRole("img", { name: "Corvin Vhael: 42 de 58 puntos de golpe" }),
    ).toBeInTheDocument();
  });

  it("las condiciones se leen traducidas, nunca la clave del enumerado", async () => {
    vi.spyOn(sheetApi, "fetchConditions").mockResolvedValue([
      condicion("poisoned"),
      condicion("prone"),
    ]);

    montar();

    const elenco = await screen.findByRole("region", { name: "En la mesa" });
    expect(await within(elenco).findAllByText("Envenenado")).not.toHaveLength(0);
    expect(within(elenco).getAllByText("Derribado")).not.toHaveLength(0);
    expect(within(elenco).queryByText(/poisoned/)).not.toBeInTheDocument();
  });

  it("solo se listan los personajes DECLARADOS presentes, y quien no vino se nombra al pie", async () => {
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue({
      ...SESION,
      attendance: [{ userId: "u-ana", characterId: "p-corvin" }],
    });

    montar();

    const elenco = await screen.findByRole("region", { name: "En la mesa" });
    expect(await within(elenco).findByText("Corvin Vhael")).toBeInTheDocument();
    expect(within(elenco).queryByText("Thora Piedrahonda")).not.toBeInTheDocument();
    expect(within(elenco).getByText(/No vinieron: Ada, Marco, Lena\./)).toBeInTheDocument();
  });

  it("−5 manda un delta relativo de −5 a ESE personaje", async () => {
    const espia = vi.spyOn(sheetApi, "changeHp").mockResolvedValue(hoja(37, 58));

    montar();

    const boton = await screen.findByRole("button", {
      name: "Quitar 5 puntos de golpe a Corvin Vhael",
    });
    fireEvent.click(boton);

    await waitFor(() => expect(espia).toHaveBeenCalledWith("c1", "p-corvin", { delta: -5 }));
  });

  it("un jugador NO ve los botones de PG de un personaje ajeno, y sí los del suyo", async () => {
    conMiembros("PLAYER");

    montar("u-ana");

    expect(
      await screen.findByRole("button", { name: "Quitar 5 puntos de golpe a Corvin Vhael" }),
    ).toBeInTheDocument();
    // Esconder el botón NO es control de acceso — el servidor exige dueño o DM igual. Es
    // honestidad: ofrecer un control que va a devolver 403 enseña a desconfiar de la pantalla.
    expect(
      screen.queryByRole("button", { name: "Quitar 5 puntos de golpe a Thora Piedrahonda" }),
    ).not.toBeInTheDocument();
  });
});

describe("la banda de estado", () => {
  it("cuenta la asistencia DECLARADA, no las conexiones", async () => {
    montar();
    const banda = await screen.findByRole("region", { name: "Estado de la sesión" });
    expect(within(banda).getByText(/2 en la mesa/)).toBeInTheDocument();
    expect(within(banda).getByRole("heading", { name: "El puerto en llamas" })).toBeInTheDocument();
  });

  it("sin asistencia declarada lo DICE, en vez de inventarse un número", async () => {
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue({
      ...SESION,
      attendance: null,
    });

    montar();
    const banda = await screen.findByRole("region", { name: "Estado de la sesión" });
    expect(within(banda).getByText(/asistencia sin declarar/)).toBeInTheDocument();
  });
});

describe("el registro en vivo", () => {
  const anotacion = {
    id: "e1",
    campaignId: "c1",
    sessionId: "s1",
    actorUserId: "u-ana",
    type: "SESSION_NOTE",
    subjectType: "session",
    subjectId: "s1",
    payload: { type: "SESSION_NOTE", kind: "DISCOVERY", text: "media carta con el sello" },
    visibility: "PLAYERS",
    createdAt: "2026-09-02T21:33:00.000Z",
  };
  const golpe = {
    ...anotacion,
    id: "e2",
    actorUserId: "u-dm",
    type: "HP_CHANGED",
    payload: { type: "HP_CHANGED", delta: -7, from: 24, to: 17 },
  };

  it("cada anotación lleva su chip de clase y QUIÉN la puso; un suceso del motor no lleva chip", async () => {
    vi.spyOn(logApi, "fetchGameEvents").mockResolvedValue({
      nextCursor: null,
      events: [anotacion, golpe] as never,
    });

    montar();

    // Se busca DENTRO de la lista de sucesos, no de la región: los seis botones de sellar
    // repiten los mismos nombres y `getByText("Hallazgo")` los encontraba a ellos — el chip
    // podía desaparecer entero con la prueba en verde. Lo cazó la prueba de mutación, no la
    // revisión.
    const lista = await screen.findByRole("list", { name: "Sucesos de la sesión" });
    expect(await within(lista).findByText("Hallazgo")).toBeInTheDocument();
    expect(within(lista).getByText("Hallazgo: media carta con el sello")).toBeInTheDocument();
    expect(within(lista).getByText(/^Ana ·/)).toBeInTheDocument();
    // El suceso del motor se lee igual, pero no se le inventa una categoría: sin chip.
    expect(within(lista).getByText("Pierde 7 PG (24 → 17)")).toBeInTheDocument();
    expect(selloDeSuceso(anotacion.payload as never)).toBe("DISCOVERY");
    expect(selloDeSuceso(golpe.payload as never)).toBeNull();
  });

  it("cualquier miembro sella, no solo el DM, y el sello viaja con su clase", async () => {
    conMiembros("PLAYER");
    const espia = vi.spyOn(sessionsApi, "stampSessionNote").mockResolvedValue({ id: "ev1" });

    montar("u-ana");

    const registro = await screen.findByRole("region", { name: "Registro de la sesión" });
    fireEvent.change(within(registro).getByLabelText("Qué anotar"), {
      target: { value: "media carta" },
    });
    fireEvent.click(within(registro).getByRole("button", { name: /Hallazgo/ }));

    await waitFor(() =>
      expect(espia).toHaveBeenCalledWith("c1", {
        kind: "DISCOVERY",
        text: "media carta",
        visibility: "PLAYERS",
      }),
    );
  });

  it("«ver el registro como» vuelve a pedir el log CON otro espectador: el DM ve menos, no más", async () => {
    const espia = vi.spyOn(logApi, "fetchGameEvents");

    montar();

    fireEvent.change(await screen.findByLabelText("Ver el registro como"), {
      target: { value: "u-ana" },
    });

    await waitFor(() => expect(espia).toHaveBeenCalledWith("c1", { sessionId: "s1", as: "u-ana" }));
    // El aviso lleva «menos» en negrita, así que el texto está partido en varios nodos: se lee
    // el texto compuesto de la región en vez de buscar un nodo que lo tenga entero.
    const registro = screen.getByRole("region", { name: "Registro de la sesión" });
    await waitFor(() => expect(registro.textContent).toContain("ves menos, nunca más"));
  });

  it("un jugador no tiene el selector de «ver como»: no es suyo", async () => {
    conMiembros("PLAYER");
    montar("u-ana");

    await screen.findByRole("region", { name: "Registro de la sesión" });
    expect(screen.queryByLabelText("Ver el registro como")).not.toBeInTheDocument();
  });
});
