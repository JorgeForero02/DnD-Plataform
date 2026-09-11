import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoQueSabeLaMesa } from "../LoQueSabeLaMesa";
import * as entitiesApi from "../../../entities/api";
import * as worldStateApi from "../../../world-state/api";

// Fix round 1 (Task 12, Important): las notas bajo cada columna nombraban los niveles a mano
// («público», «jugadores», «Jugadores concretos») en vez de leerlos de `ETIQUETA_DE_NIVEL`. El
// mock de abajo cambia esas tres etiquetas por unas que no coinciden con ningún texto literal
// del componente: si `LoQueSabeLaMesa.tsx` todavía las tuviera escritas a mano, esta prueba no
// vería el texto mockeado y fallaría — así se demuestra que de verdad viene de la tabla y no es
// una coincidencia de dos textos iguales escritos por separado (el mismo defecto que ya mordió
// una vez, ver SessionEditor.test.tsx).
vi.mock("../../../entities/visibilidad", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../entities/visibilidad")>();
  return {
    ...actual,
    ETIQUETA_DE_NIVEL: {
      ...actual.ETIQUETA_DE_NIVEL,
      PUBLIC: "PúblicoDePrueba",
      PLAYERS: "JugadoresDePrueba",
      SPECIFIC_PLAYERS: "ConcretosDePrueba",
    },
  };
});

function renderTaller() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LoQueSabeLaMesa campaignId="c1" />
    </QueryClientProvider>,
  );
}

describe("LoQueSabeLaMesa", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
    vi.spyOn(worldStateApi, "fetchFlags").mockResolvedValue([]);
    vi.spyOn(worldStateApi, "fetchSets").mockResolvedValue([]);
  });

  it("la nota de «La mesa lo sabe» nombra PUBLIC y PLAYERS leyendo ETIQUETA_DE_NIVEL", async () => {
    renderTaller();
    const columna = await screen.findByLabelText("La mesa lo sabe");
    // El componente pasa PUBLIC/PLAYERS por `.toLowerCase()` porque van dentro de la frase.
    expect(columna.textContent?.toLowerCase()).toContain("públicodeprueba");
    expect(columna.textContent?.toLowerCase()).toContain("jugadoresdeprueba");
  });

  it("la nota de «Sigue oculto» nombra SPECIFIC_PLAYERS leyendo ETIQUETA_DE_NIVEL", async () => {
    renderTaller();
    const columna = await screen.findByLabelText("Sigue oculto");
    expect(columna.textContent).toContain("ConcretosDePrueba");
  });
});
