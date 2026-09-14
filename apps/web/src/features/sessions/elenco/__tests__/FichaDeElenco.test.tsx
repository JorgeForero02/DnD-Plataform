import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Encounter } from "@dnd/shared";
import { FichaDeElenco } from "../FichaDeElenco";
import * as sheetApi from "../../../character-sheet/api";
import * as encountersApi from "../../../encounters/api";
import type { Character } from "../../../characters/api";
import { BANDOS } from "../../../../dominio/combate";

// HP-1 — la hoja de verdad necesita router y media API; aquí solo se mide el **título del
// cajón**, así que se sustituye por una marca. Lo que pinta la hoja lo prueban sus suites.
vi.mock("../../../character-sheet/HojaCalculada", () => ({
  HojaCalculada: () => <p>hoja calculada (doble)</p>,
}));

// Tarea 10 (2026-09-05, iniciativa y bando) — **corregir el bando desde la ficha del elenco**,
// donde el prototipo ya lo resuelve al empezar el combate («un aliado te traiciona en el segundo
// asalto» es lo que le falta). Ver `.superpowers/sdd/2026-09-05-iniciativa-y-bando/task-10-report.md`.

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

// **Desde la tarea 8 del pulido (C2: #1), el bando ya no es un `group` de fila**: sus tres ítems
// viven en el menú «…» de `MandosDeCombatiente`, junto a «Condición», «Dar…» y «Su hoja». Estas
// pruebas se cambian de camino —abrir el menú, mirar sus `menuitem`— y **no se borran**: siguen
// demostrando lo mismo, que el DM corrige el bando y el servidor recibe el combatiente correcto.
describe("el DM corrige el bando desde la ficha del elenco (tarea 10)", () => {
  it("un aliado se marca enemigo, y el servidor recibe el combatiente correcto", async () => {
    const cambiarBando = vi
      .spyOn(encountersApi, "setSide")
      .mockResolvedValue(encuentroTrasCorreccion());

    montar();

    fireEvent.click(await screen.findByRole("button", { name: "Más acciones sobre Corvin Vhael" }));
    const menu = screen.getByRole("menu", { name: "Más acciones sobre Corvin Vhael" });
    // El bando actual se ve, no solo se infiere del color (regla vinculante de la interfaz).
    expect(
      within(menu).getByRole("menuitem", { name: /Aliado \(su bando actual\)/i }),
    ).toHaveAttribute("aria-disabled", "true");

    // **El rótulo accesible dice qué hace el ítem** (ronda de arreglo 1, I-menor): «Marcar como
    // Enemigo», no «Enemigo».
    fireEvent.click(within(menu).getByRole("menuitem", { name: /Marcar como Enemigo/i }));

    await waitFor(() =>
      expect(cambiarBando).toHaveBeenCalledWith("c1", "s1", "enc-1", "cb-corvin", {
        side: "ENEMY",
      }),
    );
  });

  // Fix round 3 — **el rechazo del servidor se ve.** La fila vieja pintaba el mensaje con
  // `role="alert"`; el primer `useAccionesDeBando` lo perdía y el DM se quedaba mirando un menú
  // cerrado sin saber que nada había cambiado.
  it("si el servidor rechaza el cambio de bando, su mensaje se ve como alerta bajo la fila", async () => {
    vi.spyOn(encountersApi, "setSide").mockRejectedValue(
      new Error("Solo el DM puede cambiar el bando"),
    );

    montar();

    fireEvent.click(await screen.findByRole("button", { name: "Más acciones sobre Corvin Vhael" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Marcar como Enemigo/i }));

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Solo el DM puede cambiar el bando");
  });

  // Fix round 3 — **«Neutral» conserva su frase** al pasar de la fila al menú: es el único
  // bando que no se explica solo, y la fila la enganchaba por `aria-describedby`.
  it("«Marcar como Neutral» lleva su explicación en la descripción accesible", async () => {
    montar();
    fireEvent.click(await screen.findByRole("button", { name: "Más acciones sobre Corvin Vhael" }));
    const neutral = screen.getByRole("menuitem", { name: "Marcar como Neutral" });
    expect(neutral).toHaveAccessibleDescription(
      BANDOS.find((b) => b.valor === "NEUTRAL")!.explicacion,
    );
  });

  it("el jugador no ve el mando de bando: la puerta está en el servidor, no en el botón", () => {
    montar({ conMandos: false });

    expect(
      screen.queryByRole("button", { name: /Más acciones sobre Corvin Vhael/i }),
    ).not.toBeInTheDocument();
  });

  it("fuera de combate no hay bando que corregir: el ítem del menú no aparece", async () => {
    montar({ enCombate: false, bando: undefined, encounterId: undefined, combatanteId: undefined });

    fireEvent.click(await screen.findByRole("button", { name: "Más acciones sobre Corvin Vhael" }));
    expect(screen.queryByRole("menuitem", { name: /enemigo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /su bando actual/i })).not.toBeInTheDocument();
  });
});

// PNJ del mundo y la mesa (spec §3.3) — **«Sacar del combate»**, ofrecido a CUALQUIER
// combatiente (E-PM-11), no solo a PNJ: un personaje de jugador puede huir de la pelea igual.
describe("con encuentro y combatiente, el menú del DM ofrece «Sacar del combate»", () => {
  it("aparece en el menú y llama a DELETE con el combatante", async () => {
    const sacar = vi
      .spyOn(encountersApi, "removeCombatant")
      .mockResolvedValue(encuentroTrasCorreccion());

    montar();

    fireEvent.click(await screen.findByRole("button", { name: "Más acciones sobre Corvin Vhael" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Sacar del combate" }));

    await waitFor(() => expect(sacar).toHaveBeenCalledWith("c1", "s1", "enc-1", "cb-corvin"));
  });
});

// Arreglo de vuelta 1 sobre B4 (I2, I4) — **`DarObjeto` montado de verdad, no solo probado
// aislado.** Devolver `MandosDeCombatiente` a no llevar «Dar», o fijar su `soyDm` a `true` sin
// mirar el rol real, dejaba esta suite (y la de `DarObjeto.test.tsx`) en verde por separado.
//
// **Desde la tarea 8 del pulido, «Dar…» es un ítem del menú «…»**, no un botón de la fila: se
// cambia el camino (abrir el menú primero) y se sigue demostrando lo mismo.
describe("el mando «Dar» aparece con los mandos del DM (B4)", () => {
  it("con mandos, el DM ve «Dar…» en el menú", async () => {
    montar({ conMandos: true });
    fireEvent.click(await screen.findByRole("button", { name: "Más acciones sobre Corvin Vhael" }));
    expect(screen.getByRole("menuitem", { name: /dar/i })).toBeInTheDocument();
  });

  it("sin mandos, un jugador no ve el menú de acciones", () => {
    montar({ conMandos: false });
    expect(screen.queryByRole("button", { name: /Más acciones sobre/i })).not.toBeInTheDocument();
  });
});

// HP-1 (2026-09-12, opción A del autor) — **el cajón del DM se llama «Su hoja»**, simétrico
// con el «Tu hoja» del jugador (`MesaDeSesion.tsx`). El nombre lo pintaba dos veces: el título
// del diálogo y la `Cabecera` de la hoja en disposición «mesa». Se queda la `Cabecera`, que es
// la que lleva el descriptor; el título dice para qué es el cajón.
describe("el cajón de la hoja del DM (HP-1)", () => {
  // **Desde la tarea 8 del pulido, el ojo dejó de ser un botón de la fila**: «Su hoja» es un
  // ítem del menú «…», junto a «Condición» y «Dar…».
  it("se abre desde el menú y se llama «Su hoja», no el nombre del personaje", async () => {
    montar();
    fireEvent.click(await screen.findByRole("button", { name: "Más acciones sobre Corvin Vhael" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Su hoja" }));
    const cajon = await screen.findByRole("dialog", { name: "Su hoja" });
    expect(cajon).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Corvin Vhael" })).not.toBeInTheDocument();
    expect(cajon).toHaveTextContent("Sin salir de la mesa.");
    expect(cajon).toHaveTextContent("hoja calculada (doble)");
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

  // **Estabilizarse no es levantarse.** Con tres éxitos el estado pasa a `stable` y el personaje
  // **sigue en el suelo**: si la tarjeta escondiera las casillas justo ahí, el DM vería
  // desaparecer la línea que estaba mirando un segundo antes y no podría distinguir «estable» de
  // «de vuelta en pie» sin abrir la hoja — que es exactamente el problema que esto vino a
  // arreglar. Lo cazó la revisión del 2026-09-07.
  it("un estabilizado sigue enseñándolas, y dice que está estable", async () => {
    vi.spyOn(sheetApi, "fetchSheet").mockResolvedValue(aCero({ successes: 3, status: "stable" }));
    montar();
    const salvaciones = await screen.findByLabelText("Salvaciones contra muerte");
    expect(salvaciones).toHaveTextContent("3");
    // **La palabra, no el valor del enum**: `stable` no llega nunca a la pantalla.
    expect(salvaciones).toHaveTextContent(/Estable/i);
    // Con límite de palabra: «Estable» contiene «stable» como subcadena, así que un
    // `not.toHaveTextContent("stable")` a secas suspende la traducción correcta.
    expect(salvaciones.textContent).not.toMatch(/\bstable\b/);
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
