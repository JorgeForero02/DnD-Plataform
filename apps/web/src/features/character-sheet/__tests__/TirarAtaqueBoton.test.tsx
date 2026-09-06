import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Encounter, RollResultRevealed } from "@dnd/shared";
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
  visibility: "PLAYERS",
  conditions: [],
};

const BANDIDO_ALIADO: Character = {
  id: "p-bandido",
  campaignId: "c1",
  ownerId: "u-otro",
  name: "Bandido arrepentido",
  race: null,
  class: null,
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

function encuentro(combatants: Encounter["combatants"]): Encounter {
  return {
    id: "enc-1",
    sessionId: "s1",
    status: "ACTIVE",
    round: 1,
    activePosition: 0,
    combatants,
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

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TirarAtaqueBoton campaignId="c1" characterId="p-hero" ataque={ESTOQUE} />
    </QueryClientProvider>,
  );
}

async function abrirPanelYAtacar() {
  fireEvent.click(screen.getByRole("button", { name: `Tirada de ${ESTOQUE.name}` }));
  const boton = await screen.findByRole("button", { name: /atacar/i });
  // El botón solo declara `aria-expanded` una vez que el encuentro (y los nombres que lo
  // acompañan) terminaron de cargar — antes vale `undefined` y no aparece en el DOM. Esperarlo
  // evita pulsar «Atacar» a medio cargar, que dispararía la tirada suelta en vez de abrir la
  // lista: el mismo defecto que cazó la primera versión de esta prueba.
  await waitFor(() => expect(boton).toHaveAttribute("aria-expanded"));
  fireEvent.click(boton);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("con combate en marcha", () => {
  beforeEach(() => {
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(SESION);
    vi.spyOn(encountersApi, "fetchCurrentEncounter").mockResolvedValue(
      encuentro([
        { id: "cb-goblin", characterId: "n-goblin", initiative: 15, position: 0, side: "ENEMY" },
        {
          id: "cb-bandido",
          characterId: "p-bandido",
          initiative: 10,
          position: 1,
          side: "ALLY",
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
    fireEvent.click(screen.getByRole("button", { name: `Tirada de ${ESTOQUE.name}` }));
    fireEvent.click(await screen.findByRole("button", { name: /atacar/i }));

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    await waitFor(() => expect(tirar).toHaveBeenCalled());
    expect(resolver).not.toHaveBeenCalled();
  });
});
