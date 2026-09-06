import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Encounter } from "@dnd/shared";
import { TiraDeIniciativa } from "../TiraDeIniciativa";
import * as encountersApi from "../api";
import * as membersApi from "../../campaigns/members";
import * as rollRequestsApi from "../../roll-requests/api";
import type { RollRequestRow } from "../../roll-requests/api";
import type { Character } from "../../characters/api";
import { useAuthStore } from "../../../store/auth.store";

// Tarea 8 (2026-09-05, iniciativa y bando) — **la sala de espera**: lo que sustituye al orden de
// turnos mientras el encuentro está `PREPARING`. Lo que se prueba aquí es lo que la pantalla
// ENSEÑA y lo que MANDA al servidor; lo que solo se ve maquetado se mide en el navegador
// (docs/04-convenciones.md).
//
// **Ronda de arreglo 2 (2026-09-06)** añadió tres casos que la primera ronda no cubría: la
// pantalla no puede afirmar nada mientras `useRollRequests` está cargando o falló (antes
// `.data ?? []` los confundía con «nadie pendiente»), y quien no combate no puede leer «ya has
// tirado».

const MARTA: Character = {
  id: "p-marta",
  campaignId: "c1",
  ownerId: "u-marta",
  name: "Fenwick",
  race: null,
  class: null,
  raceKey: null,
  subraceKey: null,
  classKey: null,
  level: 3,
  bio: null,
  visibility: "PLAYERS",
  createdAt: "2026-09-01T10:00:00.000Z",
} as Character;

const KEVIN: Character = { ...MARTA, id: "p-kevin", ownerId: "u-kevin", name: "Borin" };
const GOBLIN_A = { ...MARTA, id: "g1", ownerId: "u-dm", name: "Goblin" };
const GOBLIN_B = { ...GOBLIN_A, id: "g2" };
/** Un personaje de campaña que NO combate en `PREPARANDO`, para el caso «no participo». */
const AJENO: Character = { ...MARTA, id: "p-ajeno", ownerId: "u-ajeno", name: "Sinvela" };

/** Cuatro combatientes: dos del DM ya tirados, dos jugadores todavía sin responder. */
const PREPARANDO: Encounter = {
  id: "e1",
  sessionId: "s1",
  status: "PREPARING",
  round: 1,
  activePosition: 0,
  combatants: [
    { id: "cb1", characterId: "p-marta", initiative: 0, position: 0, side: "ALLY" as const },
    { id: "cb2", characterId: "p-kevin", initiative: 0, position: 0, side: "ALLY" as const },
    { id: "cb3", characterId: "g1", initiative: 14, position: 0, side: "ENEMY" as const },
    { id: "cb4", characterId: "g2", initiative: 9, position: 0, side: "ENEMY" as const },
  ],
};

const PETICION_MARTA: RollRequestRow = {
  id: "rr1",
  campaignId: "c1",
  characterId: "p-marta",
  requestedById: "u-dm",
  key: "initiative",
  label: "Iniciativa",
  dc: null,
  mode: "NORMAL",
  audience: "PUBLIC",
  createdAt: "2026-09-05T10:00:00.000Z",
  resolvedAt: null,
  resolvedEventId: null,
  encounterId: "e1",
};

const PETICION_KEVIN: RollRequestRow = { ...PETICION_MARTA, id: "rr2", characterId: "p-kevin" };

function montarMiembros() {
  vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
    { userId: "u-marta", displayName: "Marta", role: "PLAYER" },
    { userId: "u-kevin", displayName: "Kevin", role: "PLAYER" },
    { userId: "u-dm", displayName: "El DM", role: "DM" },
  ]);
}

function montarSala({
  encuentro = PREPARANDO,
  esDm = true,
  quienSoy = "u-dm",
  peticiones = [PETICION_MARTA, PETICION_KEVIN] as
    RollRequestRow[] | (() => Promise<RollRequestRow[]>),
  personajes = [MARTA, KEVIN, GOBLIN_A, GOBLIN_B],
}: {
  encuentro?: Encounter;
  esDm?: boolean;
  quienSoy?: string;
  peticiones?: RollRequestRow[] | (() => Promise<RollRequestRow[]>);
  personajes?: Character[];
} = {}) {
  montarMiembros();
  useAuthStore.setState({ user: { id: quienSoy, email: "x@y.z", displayName: "Yo" } as never });
  const espiaPeticiones = vi.spyOn(rollRequestsApi, "fetchRollRequests");
  if (typeof peticiones === "function") {
    espiaPeticiones.mockImplementation(peticiones);
  } else {
    espiaPeticiones.mockResolvedValue(peticiones);
  }

  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TiraDeIniciativa
          campaignId="c1"
          sessionId="s1"
          encuentro={encuentro}
          personajes={personajes}
          pnjs={[]}
          esDm={esDm}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  useAuthStore.setState({ user: null });
});

describe("la sala de espera: quién ha tirado y a quién se espera", () => {
  it("cuenta quién ha tirado y nombra AL JUGADOR, no al personaje", async () => {
    montarSala();

    expect(await screen.findByText("2 de 4")).toBeInTheDocument();
    // «Marta», no «Fenwick»: quien tarda es una persona, y al DM le hace falta saber a quién
    // mirar, no qué ficha rellenar.
    expect(screen.getByText(/esperando a marta/i)).toBeInTheDocument();
    expect(screen.queryByText(/fenwick/i)).not.toBeInTheDocument();
  });

  it("el estado se lee con la palabra del vocabulario compartido, no escrita a mano", async () => {
    montarSala();
    // `NOMBRE_ESTADO_DE_COMBATE.PREPARING` (dominio/combate.ts): si el vocabulario cambia de
    // frase, esta pantalla la sigue sin que nadie la toque a mano aquí.
    expect(await screen.findByRole("region", { name: "Preparando combate" })).toBeInTheDocument();
  });

  it("un jugador no ve la cuenta exacta ni los nombres de los demás: solo su propio estado", async () => {
    // El servidor solo le manda SUS peticiones (RollRequestsService.list): a Kevin no le llega
    // la de Marta.
    montarSala({ esDm: false, quienSoy: "u-kevin", peticiones: [PETICION_KEVIN] });

    await screen.findByText(/todavía te falta tirar tu iniciativa/i);
    expect(screen.queryByText("2 de 4")).not.toBeInTheDocument();
    expect(screen.queryByText(/esperando a/i)).not.toBeInTheDocument();
  });

  it("el jugador no ve los botones del DM", async () => {
    montarSala({ esDm: false, quienSoy: "u-kevin" });

    await screen.findByText(/todavía te falta tirar tu iniciativa/i);
    expect(screen.queryByRole("button", { name: /empezar igualmente/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });

  it("quien no combate no lee «ya has tirado»: no participa, y se le dice así", async () => {
    // C-2/I-4 de la revisión: Sinvela no tiene ningún personaje entre los combatientes de
    // `PREPARANDO`. Antes de este arreglo, cero pendientes propias era indistinguible de «ya
    // resolví las mías», así que un espectador ajeno leía el dato más personal de todos, falso.
    montarSala({
      esDm: false,
      quienSoy: "u-ajeno",
      peticiones: [],
      personajes: [MARTA, KEVIN, GOBLIN_A, GOBLIN_B, AJENO],
    });

    expect(await screen.findByText(/no participas en él/i)).toBeInTheDocument();
    expect(screen.queryByText(/ya has tirado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/todavía te falta/i)).not.toBeInTheDocument();
  });

  it("mientras se comprueba quién ha tirado, no afirma que todos lo hicieron ni pinta una cifra", async () => {
    // C-2 de la revisión: `.data ?? []` colapsaba *cargando* con *nadie pendiente*, así que el
    // primer render leía «Todos han tirado. Puedes empezar cuando quieras» antes de que la
    // respuesta llegara. Esta prueba NO espera a que la promesa resuelva — es justo el instante
    // que se rompía.
    montarSala({ peticiones: () => new Promise(() => {}) });

    expect(await screen.findByText(/comprobando quién ha tirado/i)).toBeInTheDocument();
    expect(screen.queryByText("2 de 4")).not.toBeInTheDocument();
    expect(screen.queryByText(/todos han tirado/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /empezar igualmente/i })).toBeInTheDocument();
  });

  it("si falla comprobar quién ha tirado, lo dice y no se queda en «todos han tirado» para siempre", async () => {
    montarSala({ peticiones: () => Promise.reject(new Error("cortina de humo")) });

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent(/no se ha podido comprobar quién ha tirado/i);
    expect(aviso).toHaveTextContent("cortina de humo");
    expect(screen.queryByText("2 de 4")).not.toBeInTheDocument();
    expect(screen.queryByText(/todos han tirado/i)).not.toBeInTheDocument();
  });

  it("el DM empieza igualmente contra la API de verdad", async () => {
    const espia = vi
      .spyOn(encountersApi, "forceStartEncounter")
      .mockResolvedValue({ ...PREPARANDO, status: "ACTIVE" });
    montarSala();

    await screen.findByText("2 de 4");
    fireEvent.click(screen.getByRole("button", { name: /empezar igualmente/i }));

    await waitFor(() => expect(espia).toHaveBeenCalledWith("c1", "s1", "e1"));
  });

  it("cancelar dice la consecuencia REAL: lo tirado no se borra del registro", async () => {
    const espia = vi.spyOn(encountersApi, "cancelEncounter").mockResolvedValue(undefined);
    montarSala();

    await screen.findByText("2 de 4");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(espia).not.toHaveBeenCalled();

    const dialogo = await screen.findByRole("dialog");
    expect(dialogo).toHaveTextContent(/se borra el combate entero/i);
    // C-1 de la revisión: la primera versión decía «tampoco queda rastro en el registro», y es
    // falso — `cancel()` no toca ningún suceso, solo `RollRequest` y `Encounter`.
    expect(dialogo).toHaveTextContent(/las iniciativas que ya se tiraron siguen en el registro/i);
    expect(dialogo).not.toHaveTextContent(/no queda rastro en el registro/i);

    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar el combate" }));
    await waitFor(() => expect(espia).toHaveBeenCalledWith("c1", "s1", "e1"));
  });

  it("si cancelar falla, el aviso se ve DENTRO del diálogo, no detrás de él", async () => {
    // I-5 de la revisión: el diálogo es `fixed inset-0` con velo — un aviso pintado fuera de él
    // queda tapado, y es exactamente el momento en que el DM más lo necesita (el último jugador
    // tira mientras el diálogo está abierto y `cancel` responde 409).
    const espia = vi
      .spyOn(encountersApi, "cancelEncounter")
      .mockRejectedValue(new Error("Ese combate ya empezó: no se puede cancelar, se termina."));
    montarSala();

    await screen.findByText("2 de 4");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cancelar el combate" }));

    await waitFor(() => expect(espia).toHaveBeenCalled());
    const aviso = await within(dialogo).findByRole("alert");
    expect(aviso).toHaveTextContent(/no se ha podido cancelar el combate/i);
  });
});
