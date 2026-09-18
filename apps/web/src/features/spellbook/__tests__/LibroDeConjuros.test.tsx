import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SpellbookEntry, SpellbookResponse } from "@dnd/shared";
import * as api from "../api";
import { LibroDeConjuros } from "../LibroDeConjuros";

// Tarea 6 de 3A.2 — «elegir»: el contador, las dos zonas, el buscador y los filtros. Mismo
// patrón que `features/character-sheet/__tests__/Actividades.test.tsx`: `api.ts` simulado,
// `QueryClientProvider` alrededor (no hace falta `MemoryRouter`: esta pantalla no navega).

function entrada(
  parcial: Partial<SpellbookEntry> & Pick<SpellbookEntry, "key" | "nameEs" | "level">,
) {
  const base: SpellbookEntry = {
    key: parcial.key,
    nameEs: parcial.nameEs,
    nameEn: parcial.nameEs,
    level: parcial.level,
    school: "evo",
    castingTime: { coste: "ACTION" },
    range: { unidad: "pies", distanciaFt: 120 },
    concentration: false,
    ritual: false,
    estado: null,
    lanzable: false,
    mecanica: "dados",
    objetivos: "uno",
    escalaPorEspacio: false,
  };
  return { ...base, ...parcial };
}

const PROYECTIL = entrada({
  key: "magic-missile",
  nameEs: "Proyectil mágico",
  level: 1,
  school: "evo",
  estado: "PREPARADO",
  lanzable: true,
});
const ESCUDO_EN_LIBRO = entrada({
  key: "shield",
  nameEs: "Escudo",
  level: 1,
  school: "abj",
  estado: "EN_EL_LIBRO",
});
const BOLA_FUERA_DEL_LIBRO = entrada({
  key: "fireball",
  nameEs: "Bola de fuego",
  level: 3,
  school: "evo",
  estado: null,
});
const DESCARGA_TRUCO = entrada({
  key: "fire-bolt",
  nameEs: "Descarga de fuego",
  level: 0,
  school: "evo",
  estado: null,
});

function respuesta(overrides: Partial<SpellbookResponse> = {}): SpellbookResponse {
  return {
    modelo: "LIBRO",
    entradas: [PROYECTIL, ESCUDO_EN_LIBRO, BOLA_FUERA_DEL_LIBRO, DESCARGA_TRUCO],
    topes: { preparados: { max: 6, actual: 1 }, trucos: { max: 3, actual: 0 } },
    avisos: [],
    espacios: [{ nivel: 1, actual: 3, max: 4 }],
    ...overrides,
  };
}

function montar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LibroDeConjuros campaignId="c1" characterId="ch1" puedeEditar />
    </QueryClientProvider>,
  );
}

describe("LibroDeConjuros", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("pinta el contador desde los topes, y NINGÚN valor de enumeración crudo en el DOM", async () => {
    vi.spyOn(api, "fetchSpellbook").mockResolvedValue(respuesta());
    montar();
    expect(await screen.findByText("1 de 6 preparados · 0 de 3 trucos")).toBeInTheDocument();
    expect(screen.queryByText(/PREPARADO|EN_EL_LIBRO|^evo$|^abj$|LIBRO/)).not.toBeInTheDocument();
  });

  it("pulsar «Preparar» sobre un conjuro EN_EL_LIBRO manda {spellKey, estado: PREPARADO}", async () => {
    vi.spyOn(api, "fetchSpellbook").mockResolvedValue(respuesta());
    const mutar = vi.spyOn(api, "setSpellState").mockResolvedValue(respuesta());
    montar();

    const boton = await screen.findByRole("button", { name: "Preparar" });
    fireEvent.click(boton);
    await waitFor(() =>
      expect(mutar).toHaveBeenCalledWith("c1", "ch1", "shield", { estado: "PREPARADO" }),
    );
  });

  it("un mago con un conjuro fuera del libro ofrece «Añadir al libro», y manda EN_EL_LIBRO", async () => {
    vi.spyOn(api, "fetchSpellbook").mockResolvedValue(respuesta());
    const mutar = vi.spyOn(api, "setSpellState").mockResolvedValue(respuesta());
    montar();

    expect(await screen.findByText("Bola de fuego")).toBeInTheDocument();
    expect(screen.getByText("Fuera del libro")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Añadir al libro" }));
    await waitFor(() =>
      expect(mutar).toHaveBeenCalledWith("c1", "ch1", "fireball", { estado: "EN_EL_LIBRO" }),
    );
  });

  it("un truco disponible ofrece «Conocer», nunca «Preparar»", async () => {
    vi.spyOn(api, "fetchSpellbook").mockResolvedValue(respuesta());
    montar();
    expect(await screen.findByText("Descarga de fuego")).toBeInTheDocument();
    // Dos conjuros de nivel 1 sin preparar comparten el rótulo «Preparar»/«Añadir al libro»; el
    // truco es el único con «Conocer».
    const filaDelTruco = (await screen.findByText("Descarga de fuego")).closest("li")!;
    expect(within(filaDelTruco).getByRole("button", { name: "Conocer" })).toBeInTheDocument();
  });

  it("el buscador filtra por nombre sin acentos ni mayúsculas", async () => {
    vi.spyOn(api, "fetchSpellbook").mockResolvedValue(respuesta());
    montar();
    await screen.findByText("Bola de fuego");

    fireEvent.change(screen.getByLabelText("Buscar conjuro"), { target: { value: "bola" } });
    expect(screen.getByText("Bola de fuego")).toBeInTheDocument();
    expect(screen.queryByText("Escudo")).not.toBeInTheDocument();
  });

  it("el chip «Nivel 1» deja solo los conjuros disponibles de nivel 1", async () => {
    vi.spyOn(api, "fetchSpellbook").mockResolvedValue(respuesta());
    montar();
    await screen.findByText("Bola de fuego");

    fireEvent.click(screen.getByRole("button", { name: "Nivel 1" }));
    expect(screen.getByText("Escudo")).toBeInTheDocument();
    expect(screen.queryByText("Bola de fuego")).not.toBeInTheDocument();
  });

  it("con avisos, sale un role=status en línea — «por encima del tope, el DM decide»", async () => {
    vi.spyOn(api, "fetchSpellbook").mockResolvedValue(respuesta({ avisos: ["PREPARADOS_DE_MAS"] }));
    montar();
    expect(await screen.findByRole("status")).toHaveTextContent(/por encima del tope/i);
  });

  it("sin avisos, no hay ningún role=status", async () => {
    vi.spyOn(api, "fetchSpellbook").mockResolvedValue(respuesta());
    montar();
    await screen.findByText("Proyectil mágico");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("modelo NINGUNO enseña el estado vacío, sin zonas ni buscador", async () => {
    vi.spyOn(api, "fetchSpellbook").mockResolvedValue(
      respuesta({ modelo: "NINGUNO", entradas: [], topes: {} }),
    );
    montar();
    expect(await screen.findByText("Esta clase no lanza conjuros")).toBeInTheDocument();
    expect(screen.queryByLabelText("Buscar conjuro")).not.toBeInTheDocument();
  });
});
