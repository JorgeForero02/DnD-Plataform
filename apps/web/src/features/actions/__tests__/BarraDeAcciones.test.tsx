import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccionesResponse, Encounter, SpellbookResponse } from "@dnd/shared";
import { BarraDeAcciones } from "../BarraDeAcciones";
import { useObjetivoStore } from "../../sessions/objetivo.store";
import * as actionsApi from "../api";
import * as spellbookApi from "../../spellbook/api";
import * as characterSheetApi from "../../character-sheet/api";
import * as sessionsApi from "../../sessions/api";
import * as encountersApi from "../../encounters/api";
import * as charactersApi from "../../characters/api";
import * as bestiarioApi from "../../bestiario/api";
import * as inventoryApi from "../../inventory/api";
import type { Character } from "../../characters/api";
import type { Session } from "../../sessions/api";

// Task 4 de 3A.3 (T22) — RTL de la barra de acciones. Mismo patrón de mocks que
// `spellbook/__tests__/LanzarConjuro.test.tsx`: sesión/encuentro/personajes/PNJ/inventario en
// blanco por defecto, para que un `it` que no los necesita no dispare peticiones reales.

const ECONOMIA = { actionUsed: false, bonusUsed: false, reactionUsed: false, movementUsed: 0 };

const YO: Character = {
  id: "p-maga",
  campaignId: "c1",
  ownerId: "u1",
  name: "Sylas",
  raceKey: null,
  subraceKey: null,
  classKey: "wizard",
  level: 3,
  bio: null,
  visibility: "PLAYERS",
  color: null,
  createdAt: "2026-09-18T00:00:00.000Z",
  archivedAt: null,
};

const ALIADO: Character = { ...YO, id: "p-aliado", name: "Klarg" };

const SESION: Session = {
  id: "s1",
  campaignId: "c1",
  title: "El asedio",
  scheduledAt: null,
  notes: null,
  visibility: "PLAYERS",
  createdAt: "2026-09-18T00:00:00.000Z",
  startedAt: "2026-09-18T00:00:00.000Z",
  endedAt: null,
  status: "IN_PROGRESS",
  attendance: null,
};

/** Un encuentro `ACTIVE` con la maga y Klarg combatiendo — lo que necesita `ControlDeAtaque`
 *  para abrir su lista de objetivos anidada (fix round 2, ver el `it` de más abajo). */
const ENCUENTRO: Encounter = {
  id: "enc-1",
  sessionId: "s1",
  status: "ACTIVE",
  round: 1,
  activePosition: 0,
  finalPropuesto: false,
  combatants: [
    {
      id: "cb-maga",
      characterId: "p-maga",
      side: "ALLY",
      position: 0,
      initiative: 15,
      actionUsed: false,
      bonusUsed: false,
      reactionUsed: false,
      movementUsed: 0,
      derrotado: false,
    },
    {
      id: "cb-aliado",
      characterId: "p-aliado",
      side: "ENEMY",
      position: 1,
      initiative: 10,
      actionUsed: false,
      bonusUsed: false,
      reactionUsed: false,
      movementUsed: 0,
      derrotado: false,
    },
  ],
};

function acciones(overrides: Partial<AccionesResponse["grupos"]> = {}): AccionesResponse {
  return {
    characterId: "p-maga",
    enCombate: true,
    esMiTurno: true,
    economia: ECONOMIA,
    velocidadPies: 30,
    grupos: {
      ATAQUES: [],
      CONJUROS: [
        {
          key: "spell:magic-missile",
          grupo: "CONJUROS",
          name: "Proyectil mágico",
          coste: "ACTION",
          spellLevel: 1,
          mecanica: { tipo: "dados" },
          objetivos: "uno",
          disponible: true,
          motivos: [],
        },
      ],
      APTITUDES: [
        {
          key: "feature:arcane-recovery",
          grupo: "APTITUDES",
          name: "Recuperación arcana",
          coste: "TIEMPO",
          mecanica: { tipo: "utilidad" },
          objetivos: "ninguno",
          disponible: false,
          motivos: ["SIN_USOS"],
        },
      ],
      OBJETOS: [],
      BASICAS: [
        {
          key: "basic:dodge",
          grupo: "BASICAS",
          name: "Esquivar",
          coste: "ACTION",
          mecanica: { tipo: "utilidad" },
          objetivos: "ninguno",
          disponible: true,
          motivos: [],
        },
        {
          key: "basic:dash",
          grupo: "BASICAS",
          name: "Correr",
          coste: "ACTION",
          mecanica: { tipo: "utilidad" },
          objetivos: "ninguno",
          disponible: false,
          motivos: ["ACCION_GASTADA"],
        },
      ],
      ...overrides,
    },
  };
}

const ESPACIOS: SpellbookResponse["espacios"] = [
  { nivel: 1, actual: 3, max: 4 },
  { nivel: 2, actual: 1, max: 1 },
];

const LIBRO: SpellbookResponse = {
  modelo: "PREPARA_DE_LISTA",
  entradas: [
    {
      key: "magic-missile",
      nameEs: "Proyectil mágico",
      nameEn: "Magic Missile",
      level: 1,
      school: "evo",
      castingTime: { coste: "ACTION" },
      range: { unidad: "pies", distanciaFt: 120 },
      concentration: false,
      ritual: false,
      estado: "PREPARADO",
      lanzable: true,
      mecanica: "dados",
      objetivos: "uno",
      escalaPorEspacio: false,
      encanta: false,
    },
  ],
  topes: {},
  avisos: [],
  espacios: ESPACIOS,
};

function montar(respuesta: AccionesResponse = acciones()) {
  vi.spyOn(actionsApi, "fetchAcciones").mockResolvedValue(respuesta);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BarraDeAcciones campaignId="c1" characterId="p-maga" nombre="Sylas" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  useObjetivoStore.setState({ objetivo: null });
  vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(null);
  vi.spyOn(encountersApi, "fetchCurrentEncounter").mockResolvedValue(null);
  vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([YO, ALIADO]);
  vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([]);
  vi.spyOn(spellbookApi, "fetchSpellbook").mockResolvedValue(LIBRO);
  vi.spyOn(inventoryApi, "fetchInventory").mockResolvedValue({
    items: [],
    purse: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    totalWeightOz: 0,
    carryCapacityOz: null,
    encumbrance: null,
  });
});

describe("BarraDeAcciones — los cinco botones", () => {
  it("pinta los cinco grupos con su contador, desde AccionesResponse", async () => {
    montar();
    expect(await screen.findByRole("button", { name: /^Ataques: 0/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Conjuros: 1/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Aptitudes: 1/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Objetos: 0/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Esquivar, ayudar…: 2/ })).toBeInTheDocument();
  });

  it("le toca aparece solo cuando esMiTurno es true", async () => {
    montar();
    expect(await screen.findByText(/le toca/)).toBeInTheDocument();
  });

  it("ningún valor de enumeración llega al DOM: ni el coste, ni el motivo, ni la clave", async () => {
    montar();
    await screen.findByRole("button", { name: /^Aptitudes: 1/ });
    fireEvent.click(screen.getByRole("button", { name: /^Aptitudes: 1/ }));
    // El motivo se lee traducido («sin usos»), nunca la clave del servidor («SIN_USOS»).
    expect(await screen.findByText("sin usos")).toBeInTheDocument();
    expect(screen.queryByText("SIN_USOS")).not.toBeInTheDocument();
    expect(screen.queryByText("ACTION")).not.toBeInTheDocument();
    expect(screen.queryByText("feature:arcane-recovery")).not.toBeInTheDocument();
  });
});

describe("BarraDeAcciones — una fila apagada", () => {
  it("lleva aria-disabled con su motivo traducido, asociado por aria-describedby", async () => {
    montar();
    fireEvent.click(await screen.findByRole("button", { name: /^Esquivar, ayudar…: 2/ }));
    // Dos filas BASICAS, «Esquivar» (disponible) y «Correr» (apagada) — se toma la apagada por
    // su `aria-disabled`.
    const filas = await screen.findAllByRole("button", { name: "Usar" });
    const apagada = filas.find((b) => b.getAttribute("aria-disabled") === "true");
    expect(apagada).toBeDefined();
    expect(apagada).toHaveAttribute("aria-describedby");
    const idMotivo = apagada!.getAttribute("aria-describedby")!;
    expect(document.getElementById(idMotivo)?.textContent).toBe("ya gastaste tu acción");
  });
});

describe("BarraDeAcciones — Conjuros abre LanzarConjuro con el objetivo del chip", () => {
  it("con un objetivo apuntado, la fila de Proyectil mágico ofrece «Lanzar sobre Klarg»", async () => {
    useObjetivoStore.setState({ objetivo: { id: "p-aliado", nombre: "Klarg" } });
    montar();
    fireEvent.click(await screen.findByRole("button", { name: /^Conjuros: 1/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Lanzar Proyectil mágico" }));
    expect(await screen.findByRole("button", { name: "Lanzar sobre Klarg" })).toBeInTheDocument();
  });

  // Fix round 2 — el hallazgo del orquestador con un navegador real: dos `PanelFlotante`
  // anidados (el `MenuQueSube` de «Conjuros» por fuera, el propio panel de `LanzarConjuro» por
  // dentro), cada uno con su portal aparte a `document.body`. El «clic fuera» de CADA panel se
  // detecta en `mousedown` (`ui/PanelFlotante.tsx`); sin la guarda de `data-panel-flotante`, el
  // `mousedown` de «Lanzar sobre Klarg» —dentro del panel INTERNO— hacía que el panel EXTERNO se
  // creyera clicado por fuera y cerrara (desmontando el árbol entero, botón incluido) ANTES de
  // que su propio `click` llegara a disparar `mutate`. `fireEvent.click` por sí solo no lo
  // reproduce —no dispara `mousedown`—, así que aquí se dispara la secuencia real: `mouseDown`
  // y LUEGO `click`, sobre el mismo nodo.
  it("pulsar «Lanzar sobre Klarg» llama a usarActividad — un panel anidado no cierra al padre", async () => {
    useObjetivoStore.setState({ objetivo: { id: "p-aliado", nombre: "Klarg" } });
    const usar = vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar();
    fireEvent.click(await screen.findByRole("button", { name: /^Conjuros: 1/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Lanzar Proyectil mágico" }));
    const lanzarSobre = await screen.findByRole("button", { name: "Lanzar sobre Klarg" });

    fireEvent.mouseDown(lanzarSobre);
    fireEvent.click(lanzarSobre);

    await waitFor(() =>
      expect(usar).toHaveBeenCalledWith(
        "c1",
        "p-maga",
        "spell:magic-missile",
        expect.objectContaining({ objetivos: ["p-aliado"] }),
      ),
    );
  });
});

describe("BarraDeAcciones — Ataques: la lista de objetivos anidada tampoco se cierra sola", () => {
  // Mismo defecto de fondo que CONJUROS (fix round 2): `ControlDeAtaque` abre su propia lista
  // de combatientes en OTRO `PanelFlotante`, anidado dentro del `MenuQueSube` de «Ataques». Sin
  // chip puesto, es el único camino de la barra que nunca pasó por la corrección de arriba en
  // ningún otro `it` — se comprueba aparte.
  it("sin chip, pulsar un combatiente de la lista llama a resolveAttack", async () => {
    useObjetivoStore.setState({ objetivo: null });
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(SESION);
    vi.spyOn(encountersApi, "fetchCurrentEncounter").mockResolvedValue(ENCUENTRO);
    const resolver = vi.spyOn(characterSheetApi, "resolveAttack").mockResolvedValue({
      roll: {
        revealed: true,
        audience: "PUBLIC",
        eventId: "e1",
        expression: "1d20+5",
        rolls: [13],
        kept: [13],
        dropped: [],
        modifier: 5,
        total: 18,
        natural: "NONE",
        outcome: "NO_DC",
      },
      verdict: "HIT",
    });

    montar(
      acciones({
        ATAQUES: [
          {
            key: "attack:dagger",
            grupo: "ATAQUES",
            name: "Daga",
            coste: "ACTION",
            mecanica: { tipo: "ataque" },
            objetivos: "uno",
            disponible: true,
            motivos: [],
          },
        ],
      }),
    );

    fireEvent.click(await screen.findByRole("button", { name: /^Ataques: 1/ }));
    // `combate.cargando` (`useCombatientesDelEncuentro`) apaga el botón mientras la sesión/el
    // encuentro simulados siguen en vuelo — se espera a que se active de verdad, el mismo
    // patrón que ya usa `TirarAtaqueBoton.test.tsx` (`abrirPanelYEsperarAtacar`), o el clic cae
    // en una carrera y dispara `tirar.mutate` (sin objetivo) en vez de abrir la lista.
    const botonAtacar = await screen.findByRole("button", { name: "Atacar con Daga" });
    await waitFor(() => expect(botonAtacar).not.toHaveAttribute("aria-disabled", "true"));
    fireEvent.click(botonAtacar);
    const opcionKlarg = await screen.findByRole("option", { name: "Klarg" });

    fireEvent.mouseDown(opcionKlarg);
    fireEvent.click(opcionKlarg);

    await waitFor(() =>
      expect(resolver).toHaveBeenCalledWith(
        "c1",
        "p-maga",
        "dagger",
        expect.objectContaining({ targetCharacterId: "p-aliado" }),
      ),
    );
  });
});

describe("BarraDeAcciones — Básicas usa la misma puerta que la hoja", () => {
  it('pulsar «Usar» sobre Esquivar llama a usarActividad con "basic:dodge"', async () => {
    const usar = vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar();
    fireEvent.click(await screen.findByRole("button", { name: /^Esquivar, ayudar…: 2/ }));
    const filas = await screen.findAllByRole("button", { name: "Usar" });
    const disponible = filas.find((b) => b.getAttribute("aria-disabled") !== "true")!;
    fireEvent.click(disponible);
    await waitFor(() =>
      expect(usar).toHaveBeenCalledWith("c1", "p-maga", "basic:dodge", undefined),
    );
  });
});

// Ola post-revisión de 3A.3 (C1) — la fila de APTITUDES viaja con el prefijo `feature:` que el
// catálogo del servidor no entiende (`actividadCatalogada` busca `f.key === "feature:rage"` y no
// lo encuentra → 404). La barra tiene que mandar la clave DESNUDA, como ya hace la hoja
// (`Actividades.tsx` manda `actividad.key`) y como esta misma barra hace con `attack:`.
describe("BarraDeAcciones — Aptitudes usa la misma puerta que la hoja", () => {
  it('pulsar «Usar» sobre Furia llama a usarActividad con "rage", sin el prefijo feature:', async () => {
    const usar = vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar(
      acciones({
        APTITUDES: [
          {
            key: "feature:rage",
            grupo: "APTITUDES",
            name: "Furia",
            coste: "BONUS",
            mecanica: { tipo: "utilidad" },
            objetivos: "ninguno",
            disponible: true,
            motivos: [],
          },
        ],
      }),
    );
    fireEvent.click(await screen.findByRole("button", { name: /^Aptitudes: 1/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Usar" }));
    await waitFor(() => expect(usar).toHaveBeenCalledWith("c1", "p-maga", "rage", undefined));
  });
});

// Ola post-revisión de 3A.3 (I1) — la barra no pintaba ningún `isError`: un 400/404 del servidor
// («No se puede atacar al propio personaje», actividad inexistente, objetivo que salió del
// combate) se veía como «pulso y no pasa nada». Mismo patrón que `BandejaDeDano`: un
// `role="alert"` en la fila con el mensaje del servidor.
describe("BarraDeAcciones — un error del servidor se lee en la fila", () => {
  it("si usarActividad falla, la fila enseña el mensaje como alerta", async () => {
    vi.spyOn(characterSheetApi, "usarActividad").mockRejectedValue(
      new Error("Ya has gastado la acción de este turno"),
    );
    montar();
    fireEvent.click(await screen.findByRole("button", { name: /^Esquivar, ayudar…: 2/ }));
    const filas = await screen.findAllByRole("button", { name: "Usar" });
    fireEvent.click(filas.find((b) => b.getAttribute("aria-disabled") !== "true")!);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya has gastado la acción de este turno",
    );
  });
});
