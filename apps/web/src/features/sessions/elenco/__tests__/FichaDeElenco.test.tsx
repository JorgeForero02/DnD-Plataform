import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Encounter } from "@dnd/shared";
import { FichaDeElenco } from "../FichaDeElenco";
import * as sheetApi from "../../../character-sheet/api";
import * as encountersApi from "../../../encounters/api";
import type { Character } from "../../../characters/api";

// Tarea 10 (2026-09-05, iniciativa y bando) — **corregir el bando desde la ficha del elenco**,
// donde el prototipo ya lo resuelve al empezar el combate («un aliado te traiciona en el segundo
// asalto» es lo que le falta). Ver `.superpowers/sdd/2026-09-05-iniciativa-y-bando/task-10-report.md`.

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
  color: null,
  createdAt: "2026-09-01T10:00:00.000Z",
  archivedAt: null,
} as Character;

function hoja(): sheetApi.SheetResponse {
  return {
    character: { id: "p-corvin" } as sheetApi.CharacterRow,
    sheet: null,
    hp: { current: 42, max: 58, temp: 0, version: 1, exceedsMax: false },
    deathSaves: {
      successes: 0,
      failures: 0,
      status: "alive",
    } as sheetApi.SheetResponse["deathSaves"],
  };
}

function encuentroTrasCorreccion(): Encounter {
  return {
    id: "enc-1",
    sessionId: "s1",
    status: "ACTIVE",
    round: 2,
    activePosition: 0,
    combatants: [
      {
        id: "cb-corvin",
        characterId: "p-corvin",
        initiative: 18,
        position: 0,
        side: "ENEMY",
        actionUsed: false,
        bonusUsed: false,
        reactionUsed: false,
        movementUsed: 0,
        derrotado: false,
      },
    ],
    finalPropuesto: false,
  };
}

function montar(props: Partial<Parameters<typeof FichaDeElenco>[0]> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <FichaDeElenco
        campaignId="c1"
        personaje={CORVIN}
        puedeCambiarPg={false}
        conMandos
        enCombate
        bando="ALLY"
        sessionId="s1"
        encounterId="enc-1"
        combatanteId="cb-corvin"
        {...props}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(sheetApi, "fetchSheet").mockResolvedValue(hoja());
  vi.spyOn(sheetApi, "fetchConditions").mockResolvedValue([]);
});

describe("el DM corrige el bando desde la ficha del elenco (tarea 10)", () => {
  it("un aliado se marca enemigo, y el servidor recibe el combatiente correcto", async () => {
    const cambiarBando = vi
      .spyOn(encountersApi, "setSide")
      .mockResolvedValue(encuentroTrasCorreccion());

    montar();

    expect(await screen.findByRole("group", { name: "Bando de Corvin Vhael" })).toBeInTheDocument();
    // El bando actual se ve, no solo se infiere del color (regla vinculante de la interfaz).
    expect(screen.getByRole("button", { name: /Aliado \(su bando actual\)/i })).toBeDisabled();

    // **El rótulo accesible dice qué hace el botón** (ronda de arreglo 1, I-menor): «Marcar a
    // Corvin Vhael como Enemigo», no «Enemigo a Corvin Vhael».
    fireEvent.click(screen.getByRole("button", { name: /Marcar a Corvin Vhael como Enemigo/i }));

    await waitFor(() =>
      expect(cambiarBando).toHaveBeenCalledWith("c1", "s1", "enc-1", "cb-corvin", {
        side: "ENEMY",
      }),
    );
  });

  it("el jugador no ve el mando de bando: la puerta está en el servidor, no en el botón", () => {
    montar({ conMandos: false });

    expect(screen.queryByRole("group", { name: "Bando de Corvin Vhael" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enemigo/i })).not.toBeInTheDocument();
  });

  it("fuera de combate no hay bando que corregir: el mando no se pinta", () => {
    montar({ enCombate: false, bando: undefined, encounterId: undefined, combatanteId: undefined });

    expect(screen.queryByRole("group", { name: /Bando de/i })).not.toBeInTheDocument();
  });
});

// Arreglo de vuelta 1 sobre B4 (I2, I4) — **`DarObjeto` montado de verdad, no solo probado
// aislado.** Devolver `MandosDeCombatiente` a no llevar «Dar», o fijar su `soyDm` a `true` sin
// mirar el rol real, dejaba esta suite (y la de `DarObjeto.test.tsx`) en verde por separado.
describe("el mando «Dar» aparece con los mandos del DM (B4)", () => {
  it("con mandos, el DM ve «Dar»", async () => {
    montar({ conMandos: true });
    expect(await screen.findByRole("button", { name: /dar/i })).toBeInTheDocument();
  });

  it("sin mandos, un jugador no ve «Dar»", () => {
    montar({ conMandos: false });
    expect(screen.queryByRole("button", { name: /dar/i })).not.toBeInTheDocument();
  });
});

// -------------------------------------------------------------------------------------------
// **Un personaje jugador a 0 PG sigue en la mesa, con sus salvaciones a la vista.** Ficha P2.
//
// **La ficha suponía que desaparecía, y era falso**: nada en `apps/api/src/encounters/` mira
// `currentHp`, así que nadie retiraba a nadie. Lo que de verdad faltaba era que la mesa **dijera
// en qué estado está**: hasta hoy sus salvaciones solo se leían abriendo su hoja, que es
// justamente lo que no se hace mientras se juega.
//
// La asimetría con un monstruo es del SRD 5.1, verificada en inglés antes de implementarla —
// «Falling Unconscious»: el personaje cae inconsciente y **empieza a tirar salvaciones contra
// muerte**; «Monsters and Death»: al monstruo *«most DMs have it die the instant it drops to 0»*.
describe("un personaje a 0 PG", () => {
  function aCero(over: Partial<sheetApi.SheetResponse["deathSaves"]> = {}) {
    return {
      ...hoja(),
      hp: { current: 0, max: 58, temp: 0, version: 1, exceedsMax: false },
      deathSaves: {
        successes: 1,
        failures: 2,
        status: "dying",
        ...over,
      } as sheetApi.SheetResponse["deathSaves"],
    };
  }

  it("**sigue en la mesa** y enseña sus salvaciones contra muerte", async () => {
    vi.spyOn(sheetApi, "fetchSheet").mockResolvedValue(aCero());
    montar();

    // Sigue ahí: la ficha no se retira ni se vacía. `findAllByText` porque el nombre aparece
    // más de una vez en la tarjeta —título y descriptor—, y `findByText` reventaría por eso y no
    // por lo que se mide.
    expect((await screen.findAllByText(/Corvin/)).length).toBeGreaterThan(0);
    // Y se lee en qué estado está, sin abrir su hoja.
    const salvaciones = await screen.findByLabelText("Salvaciones contra muerte");
    expect(salvaciones).toHaveTextContent("1");
    expect(salvaciones).toHaveTextContent("2");
  });

  // **Y no se enseñan cuando no vienen a cuento**: un personaje en pie con las casillas a cero
  // llenaría la mesa de información muerta.
  //
  // **Esta prueba se escribió mal la primera vez y la mutación lo cazó**, que es para lo que
  // sirve: anclaba en `findAllByText(/Corvin/)`, y el nombre sale de la **prop**, no de la hoja.
  // Resolvía al instante, el `queryByLabelText` corría antes de que la hoja llegara, y la prueba
  // pasaba **aunque el componente pintara las salvaciones siempre**. Ahora espera a la barra de
  // PG, que solo existe cuando la hoja ha cargado: sin ese anclaje esto no mide nada.
  it("no las enseña si está en pie", async () => {
    vi.spyOn(sheetApi, "fetchSheet").mockResolvedValue(hoja());
    montar();
    await screen.findByRole("img", { name: /42 de 58 puntos de golpe/ });
    expect(screen.queryByLabelText("Salvaciones contra muerte")).not.toBeInTheDocument();
  });
});
