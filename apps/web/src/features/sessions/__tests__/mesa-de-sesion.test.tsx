import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MesaDeSesion } from "../MesaDeSesion";
import { TiradasPendientes } from "../../roll-requests/TiradasPendientes";
import { selloDeSuceso } from "../linea-de-log";
import * as sessionsApi from "../api";
import * as logApi from "../log-api";
import * as members from "../../campaigns/members";
import * as charactersApi from "../../characters/api";
import * as sheetApi from "../../character-sheet/api";
import * as entitiesHooks from "../../entities/hooks";
import * as rollRequestsApi from "../../roll-requests/api";
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
  vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([]);
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

// Ola 0 (2026-09-04) — la banda dejó de ser una `<section>` DENTRO del armazón común y pasó a ser
// la cabecera de una mesa a pantalla completa: un `<header>` con nombre «Estado de la mesa», que
// además absorbió lo que traía la cabecera de la aplicación (volver a las crónicas, la campaña) y
// el conmutador de tema. **Lo que se comprueba no cambió**: la asistencia es la DECLARADA y, si
// nadie la declaró, se dice en vez de inventar un número contando miembros.
describe("la banda de estado", () => {
  it("cuenta la asistencia DECLARADA, no las conexiones", async () => {
    montar();
    const banda = await screen.findByRole("banner", { name: "Estado de la mesa" });
    expect(within(banda).getByText(/2 en la mesa/)).toBeInTheDocument();
    expect(within(banda).getByText("El puerto en llamas")).toBeInTheDocument();
  });

  it("sin asistencia declarada lo DICE, en vez de inventarse un número", async () => {
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue({
      ...SESION,
      attendance: null,
    });

    montar();
    const banda = await screen.findByRole("banner", { name: "Estado de la mesa" });
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
    // **Sigue comprobando lo mismo: la clase se ve, y el texto de la anotación se ve.** Lo que
    // cambia es dónde: desde que el hilo pinta los cinco tipos de mensaje de la maqueta, la clase
    // va en la banda de cobre (la línea de arriba) y el texto va debajo, sin repetir la palabra.
    // Antes se pedía «Hallazgo: media carta con el sello», que era la frase entera de
    // `lineaDeLog` con la clase pegada delante — y esa frase se seguía leyendo dos veces.
    // `lineaDeLog` no ha cambiado; lo que cambió es qué parte de su salida pinta el hilo.
    expect(within(lista).getByText("media carta con el sello")).toBeInTheDocument();
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

describe("la consulta del mundo", () => {
  // **Un enlace crudo recargaba la aplicación entera en mitad de la partida.** El panel de
  // consulta usaba `<a href>`: pinchar un resultado tiraba la SPA abajo y se perdía todo el
  // estado de la mesa —lo escrito a medias en el registro, el «ver como», la caché—. Lo que se
  // mide aquí es que la navegación es de router: se monta la ruta de destino y se comprueba que
  // se pinta sin salir de la aplicación. Con `<a href>`, `jsdom` no navega y la mesa se queda
  // donde estaba, así que este caso se pone rojo.
  function montarConRutas() {
    useAuthStore.setState({ user: { id: "u-dm", email: "x@y.z", displayName: "Yo" } as never });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/campaigns/c1/sesion"]}>
          <Routes>
            <Route path="/campaigns/c1/sesion" element={<MesaDeSesion campaignId="c1" />} />
            <Route path="/campaigns/:id/entidades/:entityId" element={<p>La ficha del faro</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("un resultado navega por el router, sin recargar la aplicación", async () => {
    vi.spyOn(entitiesHooks, "useAllEntities").mockReturnValue({
      data: [{ id: "e-faro", name: "El faro de Puerto Negro", visibility: "PLAYERS" }],
    } as never);

    montarConRutas();

    // **La consulta del mundo dejó de ser una tercera columna fija y pasó a ser un panel
    // superpuesto** (B1.3): se llega por el rail, no está siempre puesta. El ancho vuelve al
    // hilo, que es donde pasa la partida; una búsqueda que se usa a ráfagas no se lleva un
    // cuarto de la pantalla las cuatro horas.
    fireEvent.click(await screen.findByRole("button", { name: /Mundo/ }));

    const enlace = await screen.findByRole("link", { name: "El faro de Puerto Negro" });
    expect(enlace).toHaveAttribute("href", "/campaigns/c1/entidades/e-faro");

    fireEvent.click(enlace);

    expect(await screen.findByText("La ficha del faro")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Consulta del mundo" })).not.toBeInTheDocument();
  });
});

describe("las peticiones de tirada se ven desde la mesa", () => {
  // **Nadie las veía.** `TiradasPendientes` solo se montaba dentro de la pestaña «Dados»:
  // sondeaba cada quince segundos y nadie estaba mirando esa pestaña durante la partida, así que
  // el DM pedía una tirada y el jugador no se enteraba. Es provisional hasta el rediseño, pero
  // mientras exista tiene que estar probado: sin este caso, quitarlo de la mesa vuelve a dejar la
  // función invisible sin que nada se ponga rojo.
  const PETICION = {
    id: "req-1",
    campaignId: "c1",
    characterId: "p-corvin",
    requestedById: "u-dm",
    key: "skill.perception",
    label: "Percepción: ¿oís al posadero?",
    dc: 15,
    mode: "NORMAL",
    audience: "PUBLIC",
    createdAt: "2026-09-02T21:00:00.000Z",
    resolvedAt: null,
    resolvedEventId: null,
  };

  it("la petición pendiente aparece en la mesa, con su botón de tirar", async () => {
    vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([PETICION] as never);

    montar("u-ana");

    const caja = await screen.findByRole("region", { name: "Tiradas que te han pedido" });
    expect(within(caja).getByText("Percepción: ¿oís al posadero?")).toBeInTheDocument();
    expect(
      within(caja).getByRole("button", { name: "Tirar: Percepción: ¿oís al posadero?" }),
    ).toBeInTheDocument();
  });

  it("sin peticiones no ocupa sitio: no se pinta ninguna caja vacía", async () => {
    montar();
    await screen.findByRole("region", { name: "Registro de la sesión" });
    expect(
      screen.queryByRole("region", { name: "Tiradas que te han pedido" }),
    ).not.toBeInTheDocument();
  });

  it("montarlo dos veces no crea dos sondeos: hay UNA consulta y las dos cajas la comparten", async () => {
    // Lo que importa no es el número de llamadas —una instancia que monta más tarde revalida, y
    // eso es lo que hace TanStack Query con `staleTime: 0`—, sino que **no haya dos consultas
    // sondeando en paralelo**: dos consultas serían dos intervalos de quince segundos y el doble
    // de carga sobre el servidor para siempre. Con una sola clave hay un solo intervalo.
    // En la aplicación real ni siquiera coinciden: las pestañas solo pintan la activa.
    vi.spyOn(rollRequestsApi, "fetchRollRequests").mockResolvedValue([PETICION] as never);

    useAuthStore.setState({ user: { id: "u-ana", email: "x@y.z", displayName: "Yo" } as never });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/campaigns/c1/sesion"]}>
          <MesaDeSesion campaignId="c1" />
          <TiradasPendientes campaignId="c1" />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.getAllByText("Percepción: ¿oís al posadero?")).toHaveLength(2),
    );
    const consultas = qc
      .getQueryCache()
      .getAll()
      .filter((q) => q.queryKey.includes("roll-requests"));
    expect(consultas).toHaveLength(1);
    expect(consultas[0].observers).toHaveLength(2);
  });
});

describe("la mesa en reposo: empezar a jugar se hace donde se juega", () => {
  const PLANIFICADA: sessionsApi.Session = {
    ...SESION,
    id: "s2",
    title: "La bajada a las cisternas",
    status: "PLANNED",
    startedAt: null,
    attendance: [],
  };

  beforeEach(() => {
    // `fetchCurrentSession` devuelve `null` cuando no hay ninguna en curso: eso es el reposo.
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(null as never);
  });

  it("el DM ve la siguiente planificada y la empieza sin salir de la mesa", async () => {
    // Dos planificadas y una cerrada, en el orden en que las devuelve la API —descendente por
    // fecha—: la que toca jugar es **la más antigua sin empezar**, no la primera de la lista.
    vi.spyOn(sessionsApi, "fetchSessions").mockResolvedValue([
      { ...PLANIFICADA, id: "s3", title: "El consejo de los gremios" },
      PLANIFICADA,
      { ...SESION, id: "s0", status: "CLOSED", title: "El puerto en llamas" },
    ]);
    const empezar = vi
      .spyOn(sessionsApi, "startSession")
      .mockResolvedValue({ ...PLANIFICADA, status: "IN_PROGRESS" });

    montar();

    expect(await screen.findByText(/La bajada a las cisternas/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Empezar la sesión" }));
    // El diálogo es el MISMO que usa el taller, con su declaración de asistencia. Su botón de
    // confirmar se llama igual que el que lo abrió, así que **se busca dentro del diálogo**: para
    // quien usa la pantalla no hay ambigüedad —es modal y atrapa el foco—, pero para una consulta
    // por nombre sí la hay, y es el mismo tropiezo de homónimos que ya costó un `spec` en B1.1.
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Empezar la sesión" }));

    await waitFor(() => expect(empezar).toHaveBeenCalled());
    expect(empezar.mock.calls[0][1]).toBe("s2");
  });

  it("sin ninguna planificada no se inventa una: enlaza al taller", async () => {
    vi.spyOn(sessionsApi, "fetchSessions").mockResolvedValue([]);

    montar();

    expect(
      await screen.findByRole("link", { name: "Planificar una en el taller" }),
    ).toHaveAttribute("href", "/campaigns/c1?seccion=sessions");
    expect(screen.queryByRole("button", { name: "Empezar la sesión" })).not.toBeInTheDocument();
  });

  it("el jugador no puede empezar la sesión desde la mesa", async () => {
    conMiembros("PLAYER");
    vi.spyOn(sessionsApi, "fetchSessions").mockResolvedValue([PLANIFICADA]);

    montar("u-ana");

    expect(await screen.findByText(/Cuando el DM empiece la sesión/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Empezar la sesión" })).not.toBeInTheDocument();
    // Y el título de lo que el DM tiene planificado tampoco se le enseña.
    expect(screen.queryByText(/La bajada a las cisternas/)).not.toBeInTheDocument();
  });
});
