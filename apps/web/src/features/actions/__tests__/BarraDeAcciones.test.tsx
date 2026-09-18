import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AccionesResponse, SpellbookResponse } from "@dnd/shared";
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
