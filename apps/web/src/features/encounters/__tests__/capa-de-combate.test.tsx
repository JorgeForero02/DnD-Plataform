import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Encounter } from "@dnd/shared";
import { TiraDeIniciativa } from "../TiraDeIniciativa";
import { CapaDeCombate } from "../CapaDeCombate";
import * as encountersApi from "../api";
import * as characterSheetApi from "../../character-sheet/api";
import * as charactersApi from "../../characters/api";
import * as bestiarioApi from "../../bestiario/api";
import type { Character } from "../../characters/api";
import type { NpcEnLaMesa } from "../../bestiario/api";
import { useAuthStore } from "../../../store/auth.store";

// Tarea 2.5.6 — la capa de combate. Lo que se prueba aquí es lo que la capa **hace**: qué se puede
// tocar, qué se manda al servidor y qué NO se enseña. Lo que solo se ve maquetado (que la tira no
// arrastre la página a lo ancho, que el turno actual se distinga) se mide en el navegador.

const THORA: Character = {
  id: "p-thora",
  campaignId: "c1",
  ownerId: "u-ana",
  name: "Thora Piedrahonda",
  raceKey: "dwarf",
  subraceKey: null,
  classKey: "fighter",
  level: 3,
  bio: null,
  visibility: "PLAYERS",
  createdAt: "2026-09-01T10:00:00.000Z",
} as Character;

const GOBLIN_A = { ...THORA, id: "g1", name: "Goblin", ownerId: "u-dm" };
const GOBLIN_B = { ...GOBLIN_A, id: "g2" };

/**
 * En reposo: nada gastado. Es el estado real de un combatiente al empezar su turno, y estas
 * pruebas miden el orden y quién puede tocar el combate, no la economía (eso lo prueba
 * `EconomiaDeAccion.test.tsx`) — spread para no repetir los cuatro campos en cada fila.
 */
const SIN_GASTAR = { actionUsed: false, bonusUsed: false, reactionUsed: false, movementUsed: 0 };

/** En pie. `derrotado` llegó con la ficha del final propuesto (2026-09-07). */
const EN_PIE = { ...SIN_GASTAR, derrotado: false };

/** Un personaje en la posición 0 y dos goblins compartiendo la 1: dos turnos, tres filas. */
const ENCUENTRO: Encounter = {
  id: "e1",
  sessionId: "s1",
  status: "ACTIVE",
  round: 2,
  activePosition: 0,
  finalPropuesto: false,
  combatants: [
    // `side` desde el plan 02: el bando lo dice el DM al empezar el encuentro. Esta pantalla
    // todavía no lo pinta —el dato llega y no se usa—, así que aquí solo hace falta para que el
    // fixture tenga la forma que el servidor devuelve de verdad.
    {
      id: "cb1",
      characterId: "p-thora",
      initiative: 18,
      position: 0,
      side: "ALLY" as const,
      ...EN_PIE,
    },
    {
      id: "cb2",
      characterId: "g1",
      initiative: 11,
      position: 1,
      side: "ENEMY" as const,
      ...EN_PIE,
    },
    {
      id: "cb3",
      characterId: "g2",
      initiative: 11,
      position: 1,
      side: "ENEMY" as const,
      ...EN_PIE,
    },
  ],
};

/**
 * **Un PNJ en la mesa, que NO sale en `GET /characters`.** Esa lista es «quién se sienta a la
 * mesa» y excluye los PNJ instanciados a propósito (2D.6), así que el orden de turnos solo sabe
 * su nombre si se le pasa esta segunda lista. Sin ella los llamaba «Alguien», también al DM.
 */
const KLARG: NpcEnLaMesa = {
  id: "npc-klarg",
  name: "Klarg",
  statblockRef: "CAMPAIGN:cap",
  currentHp: 27,
  ownerId: "u-dm",
  visibility: "DM_ONLY",
};

function montarTira(encuentro: Encounter = ENCUENTRO, esDm = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <TiraDeIniciativa
          campaignId="c1"
          sessionId="s1"
          encuentro={encuentro}
          personajes={[THORA, GOBLIN_A, GOBLIN_B]}
          pnjs={[KLARG]}
          esDm={esDm}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("la tira de iniciativa: el orden, y quién está actuando", () => {
  it("los que comparten posición son UN turno, no dos filas", async () => {
    montarTira();

    const tira = screen.getByRole("region", { name: "Orden de turnos" });
    const turnos = within(tira).getAllByRole("listitem");
    // Tres combatientes, **dos** turnos: los dos goblins actúan a la vez, que es lo que dice el
    // SRD de un grupo de criaturas idénticas. Contar filas daría tres y sería el error.
    expect(turnos).toHaveLength(2);
    expect(turnos[1]).toHaveTextContent("Goblin · Goblin");
  });

  it("el turno actual se marca con un rótulo, no solo con un color", () => {
    montarTira();

    const turnos = within(screen.getByRole("region", { name: "Orden de turnos" })).getAllByRole(
      "listitem",
    );
    expect(turnos[0]).toHaveAttribute("aria-current", "step");
    // **El color no es portador único de significado**: la palabra tiene que estar ahí.
    expect(turnos[0]).toHaveTextContent("Le toca");
    expect(turnos[1]).not.toHaveAttribute("aria-current");
    expect(turnos[1]).not.toHaveTextContent("Le toca");
  });

  it("el asalto se dice, porque es lo que la mesa apunta en un papel", () => {
    montarTira();
    expect(screen.getByRole("region", { name: "Orden de turnos" })).toHaveTextContent("Asalto 2");
  });

  it("cuando el turno es de alguien que no ves, se dice en vez de dejar la tira sin marcar", () => {
    // El servidor manda `activePosition: null` cuando el turno toca a un PNJ escondido.
    montarTira({ ...ENCUENTRO, activePosition: null }, false);

    expect(screen.getByText("Le toca a alguien que no ves.")).toBeInTheDocument();
    const turnos = within(screen.getByRole("region", { name: "Orden de turnos" })).getAllByRole(
      "listitem",
    );
    expect(turnos.some((t) => t.getAttribute("aria-current") === "step")).toBe(false);
  });
});

describe("quién puede tocar el combate", () => {
  it("el jugador no ve pasar turno, ni terminar, ni corregir", () => {
    montarTira(ENCUENTRO, false);

    expect(screen.queryByRole("button", { name: "Siguiente turno" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Terminar el combate" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Corregir la iniciativa/ }),
    ).not.toBeInTheDocument();
    // Pero sí ve el orden: saber cuándo te toca es justo para lo que sirve.
    expect(screen.getByRole("region", { name: "Orden de turnos" })).toHaveTextContent(
      "Thora Piedrahonda",
    );
  });

  it("el DM pasa turno contra la API de verdad", async () => {
    // `advanceTurn` devuelve el encuentro **más `roundAdvanced`** desde la ficha P3 (2026-09-08):
    // el campo no es parte del `Encounter` y el tipo del cliente lo dice, así que el simulacro
    // tiene que darlo. Ninguna pantalla lo lee todavía; esta prueba solo comprueba que se llama.
    const espia = vi
      .spyOn(encountersApi, "advanceTurn")
      .mockResolvedValue({ ...ENCUENTRO, roundAdvanced: false });
    montarTira();

    fireEvent.click(screen.getByRole("button", { name: "Siguiente turno" }));

    await waitFor(() => expect(espia).toHaveBeenCalledWith("c1", "s1", "e1"));
  });

  it("terminar el combate pide confirmación antes, porque quita la tira de la mesa", async () => {
    const espia = vi.spyOn(encountersApi, "endEncounter").mockResolvedValue({
      id: "e1",
      status: "ENDED",
    });
    montarTira();

    fireEvent.click(screen.getByRole("button", { name: "Terminar el combate" }));
    expect(espia).not.toHaveBeenCalled();

    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Terminar el combate" }));
    await waitFor(() => expect(espia).toHaveBeenCalledWith("c1", "s1", "e1"));
  });

  it("corregir una iniciativa manda el número al combatiente que se pulsó, no al primero", async () => {
    const espia = vi.spyOn(encountersApi, "setInitiative").mockResolvedValue(ENCUENTRO);
    montarTira();

    // Se corrige el turno de los goblins: su combatiente es `cb2`, no `cb1`.
    fireEvent.click(
      screen.getByRole("button", { name: "Corregir la iniciativa de Goblin · Goblin" }),
    );
    const dialogo = await screen.findByRole("dialog");
    const campo = within(dialogo).getByLabelText("Iniciativa");
    // El valor precargado es el suyo (11), no el de Thora (18): si no lo fuera, no distinguiría.
    expect(campo).toHaveValue(11);

    fireEvent.change(campo, { target: { value: "19" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(espia).toHaveBeenCalledWith("c1", "s1", "e1", "cb2", { initiative: 19 }),
    );
  });
});

// El bloque «entrar en combate» (el diálogo `EmpezarCombate`) se mudó entero a
// `EmpezarCombate.test.tsx` en la tarea 7 (2026-09-05, iniciativa y bando): esa tarea le cambia
// el botón, el texto de cabecera y la forma del `POST` (ahora manda `sides`), así que sus pruebas
// viven junto al componente que describen en vez de aquí, que es sobre la tira de turnos.

describe("el nombre de un PNJ en el orden de turnos", () => {
  it("se lee, en vez de «Alguien»", () => {
    const conPnj: Encounter = {
      ...ENCUENTRO,
      combatants: [
        {
          id: "cb1",
          characterId: "p-thora",
          initiative: 18,
          position: 0,
          side: "ALLY" as const,
          ...EN_PIE,
        },
        {
          id: "cb9",
          characterId: "npc-klarg",
          initiative: 9,
          position: 1,
          side: "ENEMY" as const,
          ...EN_PIE,
        },
      ],
    };
    montarTira(conPnj);
    const tira = screen.getByRole("region", { name: "Orden de turnos" });
    expect(within(tira).getByText("Klarg")).toBeInTheDocument();
    expect(within(tira).queryByText("Alguien")).not.toBeInTheDocument();
  });

  it("y un PNJ que el jugador NO puede ver sigue siendo «Alguien» para él", () => {
    // La lista de PNJ llega ya filtrada por el servidor: lo que no se puede ver, no viaja. Aquí
    // se simula pasándola vacía, que es exactamente lo que recibe ese jugador.
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <TiraDeIniciativa
            campaignId="c1"
            sessionId="s1"
            encuentro={{
              ...ENCUENTRO,
              combatants: [
                {
                  id: "cb9",
                  characterId: "npc-klarg",
                  initiative: 9,
                  position: 0,
                  side: "ENEMY" as const,
                  ...EN_PIE,
                },
              ],
            }}
            personajes={[THORA]}
            pnjs={[]}
            esDm={false}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const tira = screen.getByRole("region", { name: "Orden de turnos" });
    expect(within(tira).getByText("Alguien")).toBeInTheDocument();
  });
});

// PNJ del mundo y la mesa (spec §3.2, E-PM-11) — «oculto · Revelar» en cada turno cuyo grupo
// lleve algún PNJ que `sePuedeRevelar`. Klarg (`DM_ONLY`) y un segundo PNJ ya visible en
// `PLAYERS`, en turnos distintos, para que la prueba distinga «uno sí, el otro no».
describe("«oculto · Revelar» en el orden de turnos (spec §3.2)", () => {
  const GOBLIN_VISIBLE: NpcEnLaMesa = {
    id: "npc-goblin-visible",
    name: "Goblin",
    statblockRef: "SRD:goblin",
    currentHp: 7,
    ownerId: "u-dm",
    visibility: "PLAYERS",
  };

  function encuentroConDosPnj(): Encounter {
    return {
      ...ENCUENTRO,
      combatants: [
        { id: "cb1", characterId: "p-thora", initiative: 18, position: 0, side: "ALLY", ...EN_PIE },
        {
          id: "cb9",
          characterId: "npc-klarg",
          initiative: 9,
          position: 1,
          side: "ENEMY",
          ...EN_PIE,
        },
        {
          id: "cb10",
          characterId: "npc-goblin-visible",
          initiative: 6,
          position: 2,
          side: "ENEMY",
          ...EN_PIE,
        },
      ],
    };
  }

  function montarConDosPnj(esDm = true) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <TiraDeIniciativa
            campaignId="c1"
            sessionId="s1"
            encuentro={encuentroConDosPnj()}
            personajes={[THORA]}
            pnjs={[KLARG, GOBLIN_VISIBLE]}
            esDm={esDm}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("el DM ve «oculto · Revelar» junto a Klarg (DM_ONLY) y no junto al goblin ya visible", () => {
    montarConDosPnj();

    const tira = screen.getByRole("region", { name: "Orden de turnos" });
    const turnos = within(tira).getAllByRole("listitem");
    // Klarg es el segundo turno (posición 1); el goblin visible, el tercero (posición 2).
    expect(within(turnos[1]).getByRole("button", { name: "Revelar a Klarg" })).toBeInTheDocument();
    expect(within(turnos[1]).getByText("oculto ·")).toBeInTheDocument();
    expect(
      within(turnos[2]).queryByRole("button", { name: /Revelar a Goblin/ }),
    ).not.toBeInTheDocument();
  });

  it("un jugador no lo ve", () => {
    montarConDosPnj(false);

    const tira = screen.getByRole("region", { name: "Orden de turnos" });
    expect(within(tira).queryByRole("button", { name: /Revelar a/ })).not.toBeInTheDocument();
    expect(within(tira).queryByText("oculto ·")).not.toBeInTheDocument();
  });

  // T3 (cierre, 2026-09-14, decisión del autor): un clic revela el GRUPO entero de la casilla,
  // no un PNJ suelto — `revealNpcs`, con los ids de todos los ocultos de ese turno.
  it("revelar llama al servidor con TODOS los PNJ ocultos del grupo de ese turno", async () => {
    const espia = vi.spyOn(bestiarioApi, "revealNpcs").mockResolvedValue({
      revealed: ["npc-klarg"],
    });
    montarConDosPnj();

    fireEvent.click(screen.getByRole("button", { name: "Revelar a Klarg" }));

    await waitFor(() => expect(espia).toHaveBeenCalledWith("c1", ["npc-klarg"]));
  });
});

// Ronda de arreglo 1 — crítico 1 e importante I1. `EconomiaDeAccion.test.tsx` prueba el
// componente en aislamiento; eso nunca demuestra que llegue a la tira montada de verdad, ni que
// lea la economía del ENCUENTRO en vez de un estado inventado en el cliente. Medido: desmontar
// `<MiEconomia ... />` de `TiraDeIniciativa.tsx` deja pasar toda la suite del feature.
describe("la economía del turno propio llega a la tira, leída del encuentro (crítico 1 / I1)", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: { id: "u-ana", email: "a@b.c", displayName: "Ana" } as never });
    vi.spyOn(characterSheetApi, "fetchSheet").mockResolvedValue({
      character: THORA as never,
      sheet: null,
      hp: { current: null, max: null, temp: 0, version: 0, exceedsMax: false },
      deathSaves: { successes: 0, failures: 0, status: "alive" },
      effectiveSpeeds: { walk: { total: 30, steps: [] } },
    });
  });

  it("con mi combatiente en su turno y todo en reposo, la tira dice «disponible» en los tres costes", async () => {
    montarTira();

    const economia = await screen.findByRole("status", { name: "Economía del turno" });
    expect(within(economia).getByTitle("acción: disponible")).toBeInTheDocument();
    expect(within(economia).getByTitle("acción adicional: disponible")).toBeInTheDocument();
    // La velocidad tarda un sondeo aparte (`useCharacterSheet`): se espera su texto, no se lee
    // en el primer render.
    await waitFor(() => expect(within(economia).getByText("30/30 pies")).toBeInTheDocument());
  });

  it("**la fuente es el combatiente, no un estado del cliente**: si `get()` dice gastado, la tira dice «gastada»", async () => {
    const conAccionGastada: Encounter = {
      ...ENCUENTRO,
      combatants: ENCUENTRO.combatants.map((c) =>
        c.characterId === "p-thora" ? { ...c, actionUsed: true, bonusUsed: true } : c,
      ),
    };
    montarTira(conAccionGastada);

    const economia = await screen.findByRole("status", { name: "Economía del turno" });
    expect(within(economia).getByTitle("acción: gastada")).toBeInTheDocument();
    expect(within(economia).getByTitle("acción adicional: gastada")).toBeInTheDocument();
  });

  // D-CF-149 (Task 5b de 3A.3): la franja del prototipo enseña al DM la economía de QUIEN ACTÚA
  // («Sylas · acción · adicional · reacción»), que es a quien le corrige a mano. Sin personaje
  // propio, el DM veía antes una franja sin economía; un jugador sin combatiente sigue sin verla.
  it("el DM sin personaje propio ve la economía de quien tiene el turno, con su nombre; un jugador ajeno no ve ninguna", async () => {
    useAuthStore.setState({
      user: { id: "u-dm-sin-ficha", email: "d@b.c", displayName: "DM" } as never,
    });
    const { unmount } = montarTira();

    const economia = await screen.findByRole("status", { name: "Economía del turno" });
    expect(economia).toHaveTextContent("Thora Piedrahonda");
    expect(within(economia).getByTitle("acción: disponible")).toBeInTheDocument();
    unmount();

    useAuthStore.setState({ user: { id: "u-otra", email: "o@b.c", displayName: "Otra" } as never });
    montarTira(ENCUENTRO, false);
    expect(screen.queryByRole("status", { name: "Economía del turno" })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------------------------
// **El combate propone terminarse, y los caídos se ven caídos.** Ficha P2, 2026-09-07.
//
// La doctrina impresa de las Herramientas del DM manda aquí: *«El sistema propone; tú decides.
// Nada llega a la mesa hasta que lo confirmas.»* Y el SRD 5.1 la respalda incluso para el
// monstruo: «Monsters and Death» dice que *«Most DMs have a monster die the instant it drops to 0
// hit points»* — **costumbre del DM**, con villanos como excepción explícita. Así que la pantalla
// **avisa** y el DM pulsa; no se cierra sola.
describe("la propuesta de terminar y los caídos", () => {
  function conCaidos(finalPropuesto: boolean) {
    return {
      ...ENCUENTRO,
      finalPropuesto,
      combatants: ENCUENTRO.combatants.map((c) =>
        c.side === "ENEMY" ? { ...c, derrotado: true } : c,
      ),
    };
  }

  it("**no propone nada mientras el servidor no lo diga**", () => {
    montarTira(conCaidos(false));
    expect(screen.queryByRole("status", { name: /Sin enemigos en pie/i })).not.toBeInTheDocument();
  });

  it("cuando el servidor lo propone, lo dice — y el gesto de terminar sigue siendo del DM", () => {
    montarTira(conCaidos(true));
    expect(screen.getByRole("status", { name: /Sin enemigos en pie/i })).toBeInTheDocument();
    // El botón que ya existía es la confirmación: no se añade un segundo camino para lo mismo.
    expect(screen.getByRole("button", { name: "Terminar el combate" })).toBeInTheDocument();
  });

  // **Y el jugador no la ve**, porque el servidor no se la manda: `finalPropuesto` llega en
  // `false` a quien no es DM. Esta prueba fija que la pantalla no se lo inventa por su cuenta
  // mirando los `derrotado` que sí puede ver.
  it("un jugador no ve la propuesta aunque vea caídos", () => {
    montarTira({ ...conCaidos(false) }, false);
    expect(screen.queryByRole("status", { name: /Sin enemigos en pie/i })).not.toBeInTheDocument();
  });

  // **El gris no puede ser el único portador del significado** — misma regla que obliga a «Le
  // toca» a llevar rótulo y a la barra de PG a llevar su cifra al lado. Así que se comprueba el
  // rótulo, que además es lo único que `jsdom` puede medir honestamente.
  it("un caído lo DICE, no solo se pone gris", () => {
    montarTira(conCaidos(true));
    expect(screen.getByText("Cayó")).toBeInTheDocument();
  });

  it("y quien sigue en pie no lo dice", () => {
    montarTira(ENCUENTRO);
    expect(screen.queryByText("Cayó")).not.toBeInTheDocument();
  });
});

// Puerta de efectos §5 bis (E-PE-9) — al terminar, si la respuesta trae `xpPropuesto` aparece
// «Repartir los PX» con `DarXp` prellenado; sin él, no aparece nada nuevo.
//
// **Se monta `CapaDeCombate`, no la tira sola** (ola de arreglos 1, Critical C1). La versión
// anterior de estas pruebas montaba `TiraDeIniciativa` con un `encuentro` estático y nunca
// refetcheaba, así que no podía ver el fallo real: `useEndEncounter` invalida `current`, el
// servidor devuelve `null` para un encuentro `ENDED`, la capa desmontaba la tira y la propuesta
// —que vivía en el `useState` de la tira— se iba con ella antes de que el DM la leyera. Aquí
// `fetchCurrentEncounter` devuelve el encuentro y luego `null`, como en la aplicación real.
describe("la propuesta de experiencia al terminar el combate", () => {
  const XP_PROPUESTO = {
    total: 100,
    porCabeza: 100,
    destinatarios: [{ characterId: "p-thora", name: "Thora Piedrahonda" }],
    desglose: [
      { characterId: "g1", name: "Goblin", cr: 0.25, xp: 50 },
      { characterId: "g2", name: "Goblin", cr: 0.25, xp: 50 },
    ],
  };

  function montarCapa() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <CapaDeCombate
            campaignId="c1"
            sessionId="s1"
            personajes={[THORA, GOBLIN_A, GOBLIN_B]}
            pnjs={[KLARG]}
            esDm
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  /** Termina el combate desde la tira montada dentro de la capa, pasando por la confirmación. */
  async function terminarElCombate() {
    fireEvent.click(await screen.findByRole("button", { name: "Terminar el combate" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Terminar el combate" }));
  }

  beforeEach(() => {
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([THORA]);
    vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([]);
    // El encuentro existe… hasta que se termina: la segunda lectura de `current` es `null`.
    vi.spyOn(encountersApi, "fetchCurrentEncounter")
      .mockResolvedValueOnce(ENCUENTRO)
      .mockResolvedValue(null);
  });

  it("con xpPropuesto, «Repartir los PX» SIGUE en la mesa cuando `current` ya devuelve null y la tira se ha ido", async () => {
    vi.spyOn(encountersApi, "endEncounter").mockResolvedValue({
      id: "e1",
      status: "ENDED",
      xpPropuesto: XP_PROPUESTO,
    });
    montarCapa();
    await terminarElCombate();

    // La tira se desmonta con el `null` del refetch — eso es lo que pasa de verdad…
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Orden de turnos" })).not.toBeInTheDocument(),
    );
    // …y la propuesta se queda, con `DarXp` prellenado.
    expect(screen.getByText("Repartir los PX")).toBeInTheDocument();
    expect(
      screen.getByText("Propuesto por el combate: 100 PX (2 Goblin · VD 1/4)"),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText("Thora Piedrahonda")).toBeChecked();
    // Y debajo, la mesa en reposo del DM: la capa sigue siendo la misma capa.
    expect(screen.getByText("La mesa no está en combate.")).toBeInTheDocument();
  });

  it("al dar la experiencia el bloque se va y queda la frase de lo que se dio", async () => {
    vi.spyOn(encountersApi, "endEncounter").mockResolvedValue({
      id: "e1",
      status: "ENDED",
      xpPropuesto: XP_PROPUESTO,
    });
    const dar = vi.spyOn(charactersApi, "awardXp").mockResolvedValue({ awarded: [] });
    montarCapa();
    await terminarElCombate();

    expect(await screen.findByLabelText("Thora Piedrahonda")).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Dar experiencia" }));

    await waitFor(() =>
      expect(dar).toHaveBeenCalledWith("c1", { characterIds: ["p-thora"], amount: 100 }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Dados 100 PX a Thora Piedrahonda");
    expect(screen.queryByText("Repartir los PX")).not.toBeInTheDocument();
  });

  it("«Ahora no» retira el bloque sin dar nada", async () => {
    vi.spyOn(encountersApi, "endEncounter").mockResolvedValue({
      id: "e1",
      status: "ENDED",
      xpPropuesto: XP_PROPUESTO,
    });
    const dar = vi.spyOn(charactersApi, "awardXp").mockResolvedValue({ awarded: [] });
    montarCapa();
    await terminarElCombate();

    fireEvent.click(await screen.findByRole("button", { name: "Ahora no" }));
    expect(screen.queryByText("Repartir los PX")).not.toBeInTheDocument();
    expect(dar).not.toHaveBeenCalled();
  });

  it("sin xpPropuesto en la respuesta, no aparece", async () => {
    vi.spyOn(encountersApi, "endEncounter").mockResolvedValue({ id: "e1", status: "ENDED" });
    montarCapa();
    await terminarElCombate();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Orden de turnos" })).not.toBeInTheDocument(),
    );
    expect(screen.queryByText("Repartir los PX")).not.toBeInTheDocument();
  });
});
