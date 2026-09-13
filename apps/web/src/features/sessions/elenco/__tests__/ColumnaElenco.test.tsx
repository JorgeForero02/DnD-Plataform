import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Encounter } from "@dnd/shared";
import { ColumnaElenco } from "../ColumnaElenco";
import * as sessionsApi from "../../api";
import * as encountersApi from "../../../encounters/api";
import * as charactersApi from "../../../characters/api";
import * as membersApi from "../../../campaigns/members";
import * as sheetApi from "../../../character-sheet/api";
import type { NpcEnLaMesa } from "../../../bestiario/api";
import { useAuthStore } from "../../../../store/auth.store";

// Tarea 9b (2026-09-06) — **la queja original era literal: «no veo cómo quitarles vida».**
//
// `useCharacters` es «quién se sienta a la mesa» a propósito (`characters.service.ts`,
// `statblockRef: null`), así que un PNJ nunca ha pisado esta columna. El dato ya lo trae
// `MesaDeSesion.tsx` (`useNpcs`) para el orden de turnos y el diálogo de combate; esto prueba que
// también llega al elenco, y que sus mandos escriben contra EL PNJ, no contra un personaje.

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
  attendance: null,
};

const CORVIN = {
  id: "p-corvin",
  campaignId: "c1",
  ownerId: "u-ana",
  name: "Corvin Vhael",
  raceKey: "human",
  subraceKey: null,
  classKey: "rogue",
  level: 5,
  bio: null,
  visibility: "PLAYERS",
  color: null,
  createdAt: "2026-09-01T10:00:00.000Z",
  archivedAt: null,
} as charactersApi.Character;

const GOBLIN: NpcEnLaMesa = {
  id: "n-goblin",
  name: "Goblin capataz",
  statblockRef: "srd-goblin",
  currentHp: 7,
  ownerId: "u-dm",
  visibility: "PLAYERS",
  conditions: [],
};

// **I-1, ronda de arreglo 1** — un PNJ instanciado que NO combate en este encuentro. La mutación
// barata (vaciar el cruce) enrojece con solo `GOBLIN`; la que de verdad prueba el cruce es esta:
// si la columna pintara el catálogo entero de PNJ en vez de cruzarlo con `encuentro.combatants`,
// este apareceria también, y ninguna prueba de este fichero lo cazaría sin él.
const OGRO_FUERA_DE_COMBATE: NpcEnLaMesa = {
  id: "n-ogro",
  name: "Ogro del sótano",
  statblockRef: "srd-ogre",
  currentHp: 59,
  ownerId: "u-dm",
  visibility: "PLAYERS",
  conditions: [],
};

const SIN_GASTAR = { actionUsed: false, bonusUsed: false, reactionUsed: false, movementUsed: 0 };

function encuentroActivo(): Encounter {
  return {
    id: "enc-1",
    sessionId: "s1",
    status: "ACTIVE",
    round: 1,
    activePosition: 0,
    finalPropuesto: false,
    combatants: [
      {
        id: "cb-corvin",
        characterId: "p-corvin",
        initiative: 18,
        position: 0,
        side: "ALLY",
        derrotado: false,
        ...SIN_GASTAR,
      },
      {
        id: "cb-goblin",
        characterId: "n-goblin",
        initiative: 9,
        position: 1,
        side: "ENEMY",
        derrotado: false,
        ...SIN_GASTAR,
      },
    ],
  };
}

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

/** Como `montar`, pero diciendo QUIÉN mira: es lo que decide si un PNJ cedido es suyo. */
function montarComo(quienSoy: string, pnj: NpcEnLaMesa) {
  useAuthStore.setState({ user: { id: quienSoy, email: "x@y.z", displayName: "Yo" } as never });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ColumnaElenco campaignId="c1" asistencia={null} esDm={false} pnjs={[pnj]} />
    </QueryClientProvider>,
  );
}

function montar(pnjs: NpcEnLaMesa[] | undefined, esDm = true) {
  useAuthStore.setState({ user: { id: "u-dm", email: "x@y.z", displayName: "Yo" } as never });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ColumnaElenco campaignId="c1" asistencia={null} esDm={esDm} pnjs={pnjs} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(SESION);
  vi.spyOn(encountersApi, "fetchCurrentEncounter").mockResolvedValue(encuentroActivo());
  vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([CORVIN]);
  vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
    { userId: "u-dm", displayName: "Ada", role: "DM" },
    { userId: "u-ana", displayName: "Ana", role: "PLAYER" },
  ]);
  vi.spyOn(sheetApi, "fetchSheet").mockImplementation(async (_c, characterId) =>
    characterId === "n-goblin" ? hoja(7, 12) : hoja(42, 58),
  );
  vi.spyOn(sheetApi, "fetchConditions").mockResolvedValue([]);
});

describe("el elenco enseña a los PNJ combatientes (tarea 9b)", () => {
  it("con un encuentro en marcha, la columna enseña al PNJ combatiente y sus mandos responden", async () => {
    const cambiarPg = vi.spyOn(sheetApi, "changeHp").mockResolvedValue(hoja(2, 12));

    montar([GOBLIN]);

    const elenco = await screen.findByText("PNJ en combate");
    expect(elenco).toBeInTheDocument();
    expect(await screen.findByText("Goblin capataz")).toBeInTheDocument();
    // El bando se dice con palabra, no con color (regla vinculante de la interfaz).
    expect(screen.getByText(/PNJ · Enemigo/)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Daño a Goblin capataz" }));
    fireEvent.change(await screen.findByLabelText("Cuánto daño"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar daño" }));

    await waitFor(() => expect(cambiarPg).toHaveBeenCalledWith("c1", "n-goblin", { delta: -5 }));
  });

  it("un jugador ve al PNJ pero no lleva mandos sobre él", async () => {
    // **Un jugador que NO es su dueño**, y desde el paso 1 (tarea 15) ese matiz decide. Esta
    // prueba montaba el goblin del DM con la sesión iniciada como `u-dm`, así que el espectador
    // era su dueño: pasaba por la razón equivocada. Lo que defiende —que un PNJ ajeno no trae
    // mandos— no ha cambiado.
    montarComo("u-otro", GOBLIN);

    expect(await screen.findByText("Goblin capataz")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Daño a Goblin capataz" })).not.toBeInTheDocument();
  });

  it("**mutación**: sin la lista de PNJ, el combatiente desaparece de la columna", async () => {
    montar(undefined);

    await screen.findByText("Corvin Vhael");
    expect(screen.queryByText("PNJ en combate")).not.toBeInTheDocument();
    expect(screen.queryByText("Goblin capataz")).not.toBeInTheDocument();
  });

  // I-1 (ronda de arreglo 1) — **la dirección cara de la mutación**: ensanchar el cruce (pintar
  // el catálogo entero de PNJ en vez de solo quien combate) no enrojecía ninguna prueba anterior,
  // porque el único PNJ del fichero SÍ estaba en `encuentro.combatants`. Esta prueba mete uno que
  // no lo está.
  it("un PNJ instanciado que no combate en ESTE encuentro no aparece en la columna", async () => {
    montar([GOBLIN, OGRO_FUERA_DE_COMBATE]);

    expect(await screen.findByText("Goblin capataz")).toBeInTheDocument();
    expect(screen.queryByText("Ogro del sótano")).not.toBeInTheDocument();
  });

  // I-1 — **sin encuentro, la sección entera falta**, no solo sus PNJ: `combatientesPnj` sale de
  // `encuentro.combatants`, y sin encuentro no hay combatientes que cruzar. Un personaje de
  // jugador (`Corvin Vhael`) se sigue viendo — la mesa no depende del combate.
  it("sin encuentro no hay sección de PNJ, aunque la lista de PNJ no esté vacía", async () => {
    vi.spyOn(encountersApi, "fetchCurrentEncounter").mockResolvedValue(null);

    montar([GOBLIN]);

    await screen.findByText("Corvin Vhael");
    expect(screen.queryByText("PNJ en combate")).not.toBeInTheDocument();
    expect(screen.queryByText("Goblin capataz")).not.toBeInTheDocument();
  });
});

// C-1 / I-5 (ronda de arreglo 1) — **el mando de bando, cableado de verdad desde la columna.**
// Las pruebas de `FichaDeElenco.test.tsx` montan esa ficha sola, con props a mano — no afirman
// que `ColumnaElenco` de verdad le pase `sessionId`/`encounterId`/`combatanteId`, y ese hueco es
// literalmente por qué el crítico (el PNJ sin mando de bando) pasó desapercibido. Esto prueba el
// cableado real, para el personaje de jugador Y para el PNJ.
// **Desde la tarea 8 del pulido, el bando ya no es un `group` de fila** — sus ítems viven en el
// menú «…» de `MandosDeCombatiente`. Se cambia el camino (abrir el menú de cada uno) y se sigue
// demostrando lo mismo: el cableado real desde la columna, para el jugador Y para el PNJ.
describe("el DM corrige el bando desde la columna de verdad (C-1, I-5)", () => {
  it("el menú de acciones trae los tres ítems de bando para el personaje de jugador y para el PNJ combatiente", async () => {
    montar([GOBLIN]);

    fireEvent.click(await screen.findByRole("button", { name: "Más acciones sobre Corvin Vhael" }));
    const menuCorvin = screen.getByRole("menu", { name: "Más acciones sobre Corvin Vhael" });
    // `await`: los ítems de bando llegan por `useAccionesDeBando`, que depende del encuentro en
    // marcha (`useCurrentEncounter`) — una consulta más, así que el menú puede abrirse un
    // instante antes de que esos tres ítems se añadan a la lista. Corvin es `ALLY`: el ítem que
    // no es «su bando actual» es único, «Marcar como Enemigo».
    expect(
      await within(menuCorvin).findByRole("menuitem", { name: "Marcar como Enemigo" }),
    ).toBeInTheDocument();
    // El motivo del bando actual («Ya es su bando») viaja dentro del propio botón —para que
    // `aria-describedby` lo enlace—, así que su nombre accesible completo lo incluye: se
    // comprueba con un patrón, no con el texto exacto.
    expect(
      within(menuCorvin).getByRole("menuitem", { name: /^Aliado \(su bando actual\)/ }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Más acciones sobre Corvin Vhael" }));

    fireEvent.click(
      await screen.findByRole("button", { name: "Más acciones sobre Goblin capataz" }),
    );
    const menuGoblin = screen.getByRole("menu", { name: "Más acciones sobre Goblin capataz" });
    // El Goblin es `ENEMY`: su bando actual se dice «Enemigo (su bando actual)».
    expect(
      await within(menuGoblin).findByRole("menuitem", { name: /^Enemigo \(su bando actual\)/ }),
    ).toBeInTheDocument();
  });
});

describe("un PNJ cedido a un jugador es suyo en la pantalla (paso 1, tarea 15)", () => {
  // **El servidor ya lo trataba así**: `encounters.service` separa las peticiones de iniciativa
  // por `ownerId` sin mirar `statblockRef`, y `requireEditable` le deja cambiarle los PG y
  // ponerle condiciones. La pantalla era más restrictiva **solo porque `ownerId` no viajaba**: no
  // había de dónde leer «es tuyo», y un jugador con un PNJ cedido no podía anotarle el golpe que
  // acababa de recibir sin pedírselo al DM.
  //
  // **Esconder el botón no es control de acceso**: la puerta real es `requireEditable`. Esto es
  // cortesía en las dos direcciones — no enseñar un mando que va a dar 403, y no esconder uno que
  // sí se puede usar.

  it("el dueño de un PNJ cedido ve sus mandos", async () => {
    montarComo("u-pl", { ...GOBLIN, ownerId: "u-pl" });
    expect(await screen.findByRole("button", { name: /daño/i })).toBeInTheDocument();
  });

  it("y otro jugador que no es su dueño, no", async () => {
    montarComo("u-pl", { ...GOBLIN, ownerId: "u-otro" });
    await screen.findByText(/Goblin/);
    expect(screen.queryByRole("button", { name: /daño/i })).not.toBeInTheDocument();
  });

  // Arreglo de vuelta 1 (I4) — **el dueño de un PNJ cedido no es el DM.** `MandosDeCombatiente`
  // llevaba `soyDm` fijo en `true` sin mirar quién mira de verdad: este jugador podía abrir «Dar»
  // y ver a Corvin Vhael —el resto del elenco, ajeno a él— como destinatario, un gesto que el
  // servidor le iba a rechazar con 403. No es un agujero de autorización (`requireOwnerOrDM`
  // sigue entero), pero el proyecto no ofrece un botón que el servidor va a rechazar.
  it("el dueño de un PNJ cedido no ve al resto del elenco como destinatario al dar (no es DM)", async () => {
    montarComo("u-pl", { ...GOBLIN, ownerId: "u-pl" });

    // **Desde la tarea 8 del pulido, «Dar…» es un ítem del menú «…»**: se abre el menú de
    // Goblin capataz y se elige «Dar…» en vez de pulsar un botón «Dar» de la fila.
    fireEvent.click(
      await screen.findByRole("button", { name: "Más acciones sobre Goblin capataz" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: /dar/i }));
    // Corvin Vhael es un personaje de jugador ajeno a "u-pl": si `soyDm` volviera a fijarse en
    // `true`, aparecería aquí como una opción más.
    expect(screen.queryByRole("radio", { name: /Corvin Vhael/i })).not.toBeInTheDocument();
  });
});
