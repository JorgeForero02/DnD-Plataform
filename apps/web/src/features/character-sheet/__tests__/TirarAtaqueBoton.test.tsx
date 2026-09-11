import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EconomiaDelTurno, Encounter, RollResultRevealed } from "@dnd/shared";
import { TirarAtaqueBoton } from "../TirarAtaqueBoton";
import type { AttackDto } from "../api";
import * as api from "../api";
import * as sessionsApi from "../../sessions/api";
import type { Session } from "../../sessions/api";
import * as encountersApi from "../../encounters/api";
import * as charactersApi from "../../characters/api";
import type { Character } from "../../characters/api";
import * as bestiarioApi from "../../bestiario/api";
import type { NpcEnLaMesa } from "../../bestiario/api";

// Tarea 13 (2026-09-05, iniciativa y bando) — **atacar sirve de algo.**
//
// El servidor ya sabe resolver un ataque contra un objetivo (`POST .../sheet/attacks/:key/resolve`,
// 2.5.3) y hasta esta tarea ninguna pantalla lo llamaba: el botón tiraba el dado y nada más. Lo
// que importa aquí:
//
//  · **con combate en marcha**, el botón abre la lista de combatientes y manda `targetCharacterId`
//    a `resolve` — nunca `rollAttack`, que es la tirada suelta sin objetivo;
//  · **sin combate**, el botón se queda como estaba: tira sin más, y no llama a `resolve`;
//  · **se propone primero el bando contrario, pero se deja atacar a cualquiera** — la lista no
//    quita ninguna opción, solo la ordena. El servidor decide si el ataque impacta, nunca a quién
//    se puede apuntar (mismo criterio que ya se aplicó al bando en sí).
//
// Los objetivos salen del encuentro (`Encounter.combatants`), **no de `useCharacters`**: esa
// lista es «quién se sienta a la mesa» y un PNJ —el objetivo más habitual de un ataque— no sale
// nunca en ella.

const SESION: Session = {
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

const GOBLIN: NpcEnLaMesa = {
  id: "n-goblin",
  name: "Goblin capataz",
  statblockRef: "srd-goblin",
  currentHp: 7,
  ownerId: "u-dm",
  visibility: "PLAYERS",
  conditions: [],
};

const BANDIDO_ALIADO: Character = {
  id: "p-bandido",
  campaignId: "c1",
  ownerId: "u-otro",
  name: "Bandido arrepentido",
  raceKey: null,
  subraceKey: null,
  classKey: null,
  level: 3,
  bio: null,
  visibility: "PLAYERS",
  color: null,
  createdAt: "2026-09-01T10:00:00.000Z",
  archivedAt: null,
};

/**
 * `combatants` acepta la economía del turno como opcional: la mayoría de estas pruebas prueba
 * el ataque, no quién ha gastado qué, y desde que `combatantSchema` la exige (ronda de arreglo 1
 * de A3/A11) escribirla a mano en cada fixture sería ruido sin nada que ver con lo que cada
 * prueba mide. Todo llega en reposo por defecto, que es el estado inicial real de un combatiente.
 */
function encuentro(
  combatants: (Omit<Encounter["combatants"][number], keyof EconomiaDelTurno> &
    Partial<EconomiaDelTurno>)[],
): Encounter {
  return {
    id: "enc-1",
    sessionId: "s1",
    status: "ACTIVE",
    round: 1,
    activePosition: 0,
    finalPropuesto: false,
    combatants: combatants.map((c) => ({
      actionUsed: false,
      bonusUsed: false,
      reactionUsed: false,
      movementUsed: 0,
      ...c,
    })),
  };
}

const ESTOQUE: AttackDto = {
  key: "SRD:rapier",
  name: "Estoque",
  ref: "SRD:rapier",
  ability: "dex",
  attackBonus: {
    key: "attack.SRD:rapier",
    total: 5,
    steps: [{ op: "base", amount: 3, sourceType: "ability", sourceKey: "dex", labelKey: "x" }],
  },
  damage: { expression: "1d8+3", dice: "1d8", modifier: 3, type: "PIERCING" },
  properties: ["FINESSE"],
  proficient: true,
};

function tirada(parcial: Partial<RollResultRevealed> = {}): RollResultRevealed {
  return {
    revealed: true,
    audience: "PUBLIC",
    eventId: "e1",
    expression: "1d20+5",
    rolls: [15],
    kept: [15],
    dropped: [],
    modifier: 5,
    total: 20,
    natural: "NONE",
    outcome: "NO_DC",
    ...parcial,
  };
}

// `PLAYERS` por defecto: es la visibilidad más habitual de un personaje de la mesa, y con ella
// `loVeLaMesa` da `true` — mismo valor inicial (`"PUBLIC"`) que ya esperaban las pruebas
// existentes antes de la ronda de arreglo 1.
function montar(visibilidadDelPersonaje = "PLAYERS") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TirarAtaqueBoton
        campaignId="c1"
        characterId="p-hero"
        ataque={ESTOQUE}
        visibilidadDelPersonaje={visibilidadDelPersonaje}
      />
    </QueryClientProvider>,
  );
}

/**
 * `Button` (`ui/Button.tsx`, ficha U9) desactiva con `aria-disabled`, no con el atributo nativo
 * `disabled` — a propósito, para que el botón se quede en el recorrido de teclado y su motivo se
 * pueda leer. `toBeDisabled()`/`toBeEnabled()` de jest-dom miran el atributo nativo, así que no
 * sirven aquí: esto mira lo mismo que mira el propio componente antes de decidir si ignora el
 * click.
 */
function estaDesactivado(el: HTMLElement) {
  return el.getAttribute("aria-disabled") === "true";
}

/**
 * Abre el panel y espera a que el botón «Atacar» deje de estar desactivado antes de pulsarlo.
 *
 * **No es un rodeo de la prueba: es el propio arreglo de la carrera de carga (I-2, ronda de
 * arreglo 1).** Mientras la sesión, el encuentro o los nombres siguen en vuelo, el botón está
 * desactivado (por `cargando`) precisamente para que no se pueda pulsar y caer en la tirada suelta
 * sin objetivo. Esta espera reproduce lo que ve quien juega: pulsar un botón apagado no hace nada
 * (el propio `Button` ignora el click), así que no hace falta que la prueba lo compruebe pulsando.
 */
async function abrirPanelYEsperarAtacar() {
  fireEvent.click(screen.getByRole("button", { name: `Tirada de ${ESTOQUE.name}` }));
  const boton = await screen.findByRole("button", { name: /atacar/i });
  await waitFor(() => expect(estaDesactivado(boton)).toBe(false));
  return boton;
}

async function abrirPanelYAtacar() {
  fireEvent.click(await abrirPanelYEsperarAtacar());
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("con combate en marcha", () => {
  beforeEach(() => {
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(SESION);
    vi.spyOn(encountersApi, "fetchCurrentEncounter").mockResolvedValue(
      encuentro([
        // "p-hero" — el propio atacante — es ALLY en este encuentro: es el caso normal (un
        // jugador que combate). Su bando propio hace que el contrario (ENEMY, el Goblin) se
        // proponga primero — I-4, ronda de arreglo 1: no es una tabla fija, es relativo a quien
        // ataca.
        {
          id: "cb-hero",
          characterId: "p-hero",
          initiative: 20,
          position: 0,
          side: "ALLY",
          derrotado: false,
        },
        {
          id: "cb-goblin",
          characterId: "n-goblin",
          initiative: 15,
          position: 1,
          side: "ENEMY",
          derrotado: false,
        },
        {
          id: "cb-bandido",
          characterId: "p-bandido",
          initiative: 10,
          position: 2,
          side: "ALLY",
          derrotado: false,
        },
      ]),
    );
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([BANDIDO_ALIADO]);
    vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([GOBLIN]);
  });

  it("elige objetivo y manda targetCharacterId a resolve, no a rollAttack", async () => {
    const resolver = vi.spyOn(api, "resolveAttack").mockResolvedValue({ roll: tirada() });
    const tirar = vi.spyOn(api, "rollAttack");

    montar();
    await abrirPanelYAtacar();

    fireEvent.click(await screen.findByRole("option", { name: /goblin/i }));

    await waitFor(() =>
      expect(resolver).toHaveBeenCalledWith(
        "c1",
        "p-hero",
        "SRD:rapier",
        expect.objectContaining({ targetCharacterId: "n-goblin" }),
      ),
    );
    expect(tirar).not.toHaveBeenCalled();
  });

  it("propone primero el bando contrario, pero deja atacar a cualquiera", async () => {
    vi.spyOn(api, "resolveAttack").mockResolvedValue({ roll: tirada() });

    montar();
    await abrirPanelYAtacar();

    const opciones = await screen.findAllByRole("option");
    expect(opciones).toHaveLength(2);
    // El enemigo (Goblin) se propone antes que el aliado (Bandido) — solo orden, no permiso.
    expect(opciones[0]).toHaveTextContent("Goblin capataz");
    expect(opciones[1]).toHaveTextContent("Bandido arrepentido");
  });

  // I-5, ronda de arreglo 1: **esta sí pulsa la opción** — a diferencia de la de arriba, que solo
  // mira el orden— y comprueba lo que de verdad se pinta del resultado: el veredicto traducido, y
  // que el valor crudo del servidor («CRITICAL») nunca llega a pantalla.
  it("pulsa un objetivo, y el veredicto llega traducido — nunca el valor crudo del servidor", async () => {
    vi.spyOn(api, "resolveAttack").mockResolvedValue({
      roll: tirada({ natural: "TWENTY", total: 25 }),
      verdict: "CRITICAL",
    });

    montar();
    await abrirPanelYAtacar();
    fireEvent.click(await screen.findByRole("option", { name: /goblin/i }));

    expect(await screen.findByText("¡Crítico!")).toBeInTheDocument();
    expect(screen.queryByText("CRITICAL", { exact: false })).not.toBeInTheDocument();
    // Y el panel de daño lo dice con el mismo veredicto, no con su propia cuenta del `natural`
    // (I-3): si algún día discreparan, esta es la frase que tiene que ganar.
    expect(screen.getByText(/el servidor dice que fue crítico/i)).toBeInTheDocument();
  });
});

// I-4, ronda de arreglo 1 — el orden es relativo a QUIEN ATACA, no una tabla fija. Aquí quien
// ataca (`p-hero`) es él mismo un combatiente `ENEMY` (un PNJ del DM): con la tabla fija de la
// primera versión, vería primero a los suyos (otros `ENEMY`); con el arreglo, ve primero al
// bando contrario, que es `ALLY`.
describe("con el atacante como combatiente ENEMY", () => {
  beforeEach(() => {
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(SESION);
    vi.spyOn(encountersApi, "fetchCurrentEncounter").mockResolvedValue(
      encuentro([
        {
          id: "cb-hero",
          characterId: "p-hero",
          initiative: 20,
          position: 0,
          side: "ENEMY",
          derrotado: false,
        },
        {
          id: "cb-goblin",
          characterId: "n-goblin",
          initiative: 15,
          position: 1,
          side: "ENEMY",
          derrotado: false,
        },
        {
          id: "cb-bandido",
          characterId: "p-bandido",
          initiative: 10,
          position: 2,
          side: "ALLY",
          derrotado: false,
        },
      ]),
    );
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([BANDIDO_ALIADO]);
    vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([GOBLIN]);
  });

  it("propone al bando ALLY primero, porque el propio atacante es ENEMY", async () => {
    vi.spyOn(api, "resolveAttack").mockResolvedValue({ roll: tirada() });

    montar();
    await abrirPanelYAtacar();

    const opciones = await screen.findAllByRole("option");
    expect(opciones).toHaveLength(2);
    expect(opciones[0]).toHaveTextContent("Bandido arrepentido");
    expect(opciones[1]).toHaveTextContent("Goblin capataz");
  });
});

// I-2, ronda de arreglo 1 — la carrera de carga. Mientras la sesión/el encuentro/los nombres
// siguen en vuelo, el botón tiene que quedarse desactivado: si no lo estuviera, pulsarlo caería
// en la tirada suelta sin objetivo, en silencio, aunque SÍ hubiera combate en marcha.
describe("mientras se comprueba si hay combate (I-2)", () => {
  it("el botón «Atacar» está desactivado, con su motivo, hasta saber si hay encuentro", async () => {
    let resolverSesion!: (v: Session | null) => void;
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockReturnValue(
      new Promise((resolve) => {
        resolverSesion = resolve;
      }),
    );
    vi.spyOn(encountersApi, "fetchCurrentEncounter").mockResolvedValue(null);
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);
    vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([]);
    const tirar = vi.spyOn(api, "rollAttack").mockResolvedValue(tirada());

    montar();
    fireEvent.click(screen.getByRole("button", { name: `Tirada de ${ESTOQUE.name}` }));
    const boton = await screen.findByRole("button", { name: /atacar/i });

    expect(estaDesactivado(boton)).toBe(true);
    fireEvent.click(boton);
    expect(tirar).not.toHaveBeenCalled();

    resolverSesion(null);
    await waitFor(() => expect(estaDesactivado(boton)).toBe(false));
  });
});

// Task 26 (I10) — **la tirada de ataque elige audiencia, como el panel de dados general.**
//
// El botón mandaba `audience: "PUBLIC"` fijo en las tres tiradas (ataque, resolver contra
// objetivo, y daño). El agujero de fondo —un PNJ `DM_ONLY` que atacara delatando su propia
// existencia a la mesa entera— ya lo cierra el SERVIDOR, no este botón: `rollAttack`/
// `resolveAttack` (`character-sheet.service.ts`) derivan su propia audiencia por defecto de la
// visibilidad del personaje cuando no se manda ninguna. Lo que faltaba aquí era la otra mitad —
// un DM que SÍ quiere ocultar un ataque puntual (un PNJ que por lo demás es público) no tenía
// cómo pedirlo— y, con ella, que el valor inicial del selector fuera esa MISMA regla del
// servidor y no un `"PUBLIC"` fijo que la contradijera en pantalla antes de que nadie tocara
// nada. Reusa `SelectorDeAudiencia`, el mismo componente del panel de dados general
// (`PanelDeDados.tsx`): tres radios con su frase, nunca un desplegable.
describe("audiencia de la tirada (Task 26)", () => {
  beforeEach(() => {
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(null);
    vi.spyOn(encountersApi, "fetchCurrentEncounter").mockResolvedValue(null);
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);
    vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([]);
  });

  it("ofrece las tres audiencias como radios con su frase, nunca un desplegable", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: `Tirada de ${ESTOQUE.name}` }));

    expect(await screen.findByRole("radio", { name: "Pública" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Privada del DM" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "A ciegas" })).toBeVisible();
    expect(screen.getByText("La mesa entera ve el resultado.")).toBeVisible();
    expect(screen.getByText("Solo el DM ve el resultado; tú no.")).toBeVisible();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("con un personaje PLAYERS, por defecto manda audience PUBLIC, y con «A ciegas» manda BLIND", async () => {
    const tirar = vi.spyOn(api, "rollAttack").mockResolvedValue(tirada());

    montar("PLAYERS");
    await abrirPanelYAtacar();

    await waitFor(() =>
      expect(tirar).toHaveBeenCalledWith(
        "c1",
        "p-hero",
        "SRD:rapier",
        expect.objectContaining({ audience: "PUBLIC" }),
      ),
    );

    tirar.mockClear();
    fireEvent.click(screen.getByRole("radio", { name: "A ciegas" }));
    fireEvent.click(screen.getByRole("button", { name: /atacar/i }));

    await waitFor(() =>
      expect(tirar).toHaveBeenCalledWith(
        "c1",
        "p-hero",
        "SRD:rapier",
        expect.objectContaining({ audience: "BLIND" }),
      ),
    );
  });

  // Ronda de arreglo 1 — **el valor inicial sigue la misma regla que el servidor**
  // (`character-sheet.service.ts`, `audienciaPorDefecto`: `loVeLaMesa(character.visibility) ?
  // "PUBLIC" : "DM_PRIVATE"`), no un `"PUBLIC"` fijo. Un PNJ `DM_ONLY` que no ve la mesa nace con
  // «Privada del DM» ya marcada — la pantalla no puede prometer «Pública» mientras el servidor,
  // sin que nadie toque nada, va a tirar en privado.
  it("con un PNJ DM_ONLY, el selector nace en «Privada del DM», no en «Pública»", async () => {
    const tirar = vi.spyOn(api, "rollAttack").mockResolvedValue(tirada());

    montar("DM_ONLY");
    const boton = await abrirPanelYEsperarAtacar();

    expect(screen.getByRole("radio", { name: "Privada del DM" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Pública" })).not.toBeChecked();

    fireEvent.click(boton);
    await waitFor(() =>
      expect(tirar).toHaveBeenCalledWith(
        "c1",
        "p-hero",
        "SRD:rapier",
        expect.objectContaining({ audience: "DM_PRIVATE" }),
      ),
    );
  });

  it("con un personaje PUBLIC, el selector también nace en «Pública»", async () => {
    montar("PUBLIC");
    await abrirPanelYEsperarAtacar();

    expect(screen.getByRole("radio", { name: "Pública" })).toBeChecked();
  });
});

describe("sin combate", () => {
  beforeEach(() => {
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(null);
    vi.spyOn(encountersApi, "fetchCurrentEncounter").mockResolvedValue(null);
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);
    vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([]);
  });

  it("no pide objetivo: solo tira, y no llama a resolve", async () => {
    const tirar = vi.spyOn(api, "rollAttack").mockResolvedValue(tirada());
    const resolver = vi.spyOn(api, "resolveAttack");

    montar();
    await abrirPanelYAtacar();

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    await waitFor(() => expect(tirar).toHaveBeenCalled());
    expect(resolver).not.toHaveBeenCalled();
  });
});
