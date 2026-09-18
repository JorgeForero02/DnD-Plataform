import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Encounter, SpellbookEntry, SpellbookResponse } from "@dnd/shared";
import { LanzarConjuro } from "../LanzarConjuro";
import * as characterSheetApi from "../../character-sheet/api";
import * as sessionsApi from "../../sessions/api";
import type { Session } from "../../sessions/api";
import * as encountersApi from "../../encounters/api";
import * as charactersApi from "../../characters/api";
import * as bestiarioApi from "../../bestiario/api";
import type { NpcEnLaMesa } from "../../bestiario/api";

// Tarea 7 de 3A.2 («elegir, lanzar y usar») — el botón «Lanzar» de la pestaña Conjuros. Reusa el
// mismo patrón de mocks que `TirarAtaqueBoton.test.tsx`: la sesión y el encuentro deciden si hay
// combate, y `useCombatientesDelEncuentro` sale de ahí.

const TRUCO: SpellbookEntry = {
  key: "light",
  nameEs: "Luz",
  nameEn: "Light",
  level: 0,
  school: "evo",
  castingTime: { coste: "ACTION" },
  range: { unidad: "toque" },
  concentration: false,
  ritual: false,
  estado: "CONOCIDO",
  lanzable: true,
  mecanica: "utilidad",
  objetivos: "ninguno",
  escalaPorEspacio: false,
};

// «Escudo» — nivel 1, sin objetivo (se lanza sobre uno mismo), no escala. Sirve para probar el
// selector de espacio SIN la lista de objetivos de por medio.
const ESCUDO: SpellbookEntry = {
  key: "shield",
  nameEs: "Escudo",
  nameEn: "Shield",
  level: 1,
  school: "abj",
  castingTime: { coste: "REACTION" },
  range: { unidad: "personal" },
  concentration: false,
  ritual: false,
  estado: "PREPARADO",
  lanzable: true,
  mecanica: "utilidad",
  objetivos: "ninguno",
  escalaPorEspacio: false,
};

const PROYECTIL: SpellbookEntry = {
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
  objetivos: "varios",
  escalaPorEspacio: true,
};

const SIN_ESPACIOS: SpellbookResponse["espacios"] = [];

const SESION: Session = {
  id: "s1",
  campaignId: "c1",
  title: "La torre del libro",
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
  name: "Goblin",
  statblockRef: "srd-goblin",
  currentHp: 7,
  ownerId: "u-dm",
  visibility: "PLAYERS",
  conditions: [],
};

function encuentro(combatants: Encounter["combatants"]): Encounter {
  return {
    id: "enc-1",
    sessionId: "s1",
    status: "ACTIVE",
    round: 1,
    activePosition: 0,
    finalPropuesto: false,
    combatants,
  };
}

function montar(entrada: SpellbookEntry, espacios: SpellbookResponse["espacios"] = SIN_ESPACIOS) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LanzarConjuro campaignId="c1" characterId="p-maga" entrada={entrada} espacios={espacios} />
    </QueryClientProvider>,
  );
}

const ECONOMIA = {
  actionUsed: false,
  bonusUsed: false,
  reactionUsed: false,
  movementUsed: 0,
};

beforeEach(() => {
  vi.restoreAllMocks();
  // Sin combate por defecto: la mayoría de pruebas no lo necesita, y así no hay que repetir los
  // cuatro mocks en cada `it`.
  vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(null);
  vi.spyOn(encountersApi, "fetchCurrentEncounter").mockResolvedValue(null);
  vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);
  vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([]);
});

describe("LanzarConjuro — sin objetivo y sin espacio superior", () => {
  it("un truco sin objetivos lanza con {} al pulsar, sin abrir ningún panel", async () => {
    const usar = vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar(TRUCO);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Luz" }));

    await waitFor(() => expect(usar).toHaveBeenCalledWith("c1", "p-maga", "spell:light", {}));
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });
});

describe("LanzarConjuro — el selector de espacio, sin lista de objetivos de por medio", () => {
  it("con espacios de nivel 2 disponibles aparece el grupo de radios, y elegir «Nivel 2» manda nivelDeEspacio: 2", async () => {
    const usar = vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar(ESCUDO, [
      { nivel: 1, actual: 3, max: 4 },
      { nivel: 2, actual: 1, max: 2 },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Escudo" }));
    expect(await screen.findByText("¿Con qué espacio?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /^Nivel 2/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lanzar" }));

    await waitFor(() =>
      expect(usar).toHaveBeenCalledWith("c1", "p-maga", "spell:shield", { nivelDeEspacio: 2 }),
    );
  });

  it("sin ningún espacio por encima del propio, no aparece el grupo de radios", async () => {
    vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar(ESCUDO, [{ nivel: 1, actual: 3, max: 4 }]);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Escudo" }));
    expect(screen.queryByText("¿Con qué espacio?")).not.toBeInTheDocument();
  });
});

describe("LanzarConjuro — objetivos «varios», en combate", () => {
  beforeEach(() => {
    vi.spyOn(sessionsApi, "fetchCurrentSession").mockResolvedValue(SESION);
    vi.spyOn(encountersApi, "fetchCurrentEncounter").mockResolvedValue(
      encuentro([
        {
          id: "cb-maga",
          characterId: "p-maga",
          initiative: 20,
          position: 0,
          side: "ALLY",
          derrotado: false,
          ...ECONOMIA,
        },
        {
          id: "cb-goblin",
          characterId: "n-goblin",
          initiative: 15,
          position: 1,
          side: "ENEMY",
          derrotado: false,
          ...ECONOMIA,
        },
      ]),
    );
    vi.spyOn(charactersApi, "fetchCharacters").mockResolvedValue([]);
    vi.spyOn(bestiarioApi, "fetchNpcs").mockResolvedValue([GOBLIN]);
  });

  it("abre la lista de combatientes; marcar «Goblin» y pulsar «Lanzar sobre 1» manda objetivos: [id]", async () => {
    const usar = vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar(PROYECTIL, [{ nivel: 1, actual: 3, max: 4 }]);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Proyectil mágico" }));
    const casilla = await screen.findByRole("checkbox", { name: "Goblin" });
    fireEvent.click(casilla);

    const enviar = screen.getByRole("button", { name: "Lanzar sobre 1" });
    fireEvent.click(enviar);

    // Con un solo espacio disponible (el propio de nivel 1, en la lista) no hay elección que
    // hacer, así que el selector no aparece y `nivelDeEspacio` no viaja — el mismo criterio que
    // ya prueba el bloque de «Escudo» de arriba.
    await waitFor(() =>
      expect(usar).toHaveBeenCalledWith("c1", "p-maga", "spell:magic-missile", {
        objetivos: ["n-goblin"],
      }),
    );
  });

  it("«Lanzar sobre N» está apagado sin ningún objetivo marcado", async () => {
    vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({});
    montar(PROYECTIL, [{ nivel: 1, actual: 3, max: 4 }]);

    fireEvent.click(screen.getByRole("button", { name: "Lanzar Proyectil mágico" }));
    const enviar = await screen.findByRole("button", { name: "Lanzar sobre 0" });
    expect(enviar).toHaveAttribute("aria-disabled", "true");
  });
});

describe("LanzarConjuro — el servidor avisa sin bloquear", () => {
  it("SIN_ESPACIO: «Sin espacios de nivel 1 — no se lanzó», con role=alert", async () => {
    vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({
      fueraDeRegla: ["SIN_ESPACIO"],
    });
    montar(TRUCO);
    // Reusa el truco (sin objetivo, sin espacio) solo para disparar sin ningún panel de por
    // medio: lo que se prueba es la lectura de la respuesta, no la composición de la petición.
    fireEvent.click(screen.getByRole("button", { name: "Lanzar Luz" }));

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent("Sin espacios de nivel 0 — no se lanzó.");
  });

  it("un aviso del servidor se enseña en línea, sin bloquear el botón", async () => {
    vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({
      aviso: "Por encima del tope: el DM decide.",
    });
    montar(TRUCO);
    fireEvent.click(screen.getByRole("button", { name: "Lanzar Luz" }));

    expect(await screen.findByText("Por encima del tope: el DM decide.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lanzar Luz" })).not.toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("un verdict HIT se enseña con el mismo vocabulario que el cuadro de ataques", async () => {
    vi.spyOn(characterSheetApi, "usarActividad").mockResolvedValue({ verdict: "HIT" });
    montar(TRUCO);
    fireEvent.click(screen.getByRole("button", { name: "Lanzar Luz" }));

    expect(await screen.findByText("Impacta")).toBeInTheDocument();
  });
});
