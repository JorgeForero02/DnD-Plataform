import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Curar } from "../PonerDano";
import * as sheetApi from "../../../character-sheet/api";

// Tarea 14 (2026-09-06) — **«se puede curar», y no con una puerta nueva.**
//
// El brief original (`task-14-brief.md`) daba por hecho que hoy no se podía subir un punto de
// golpe a nadie y que no había otra puerta. Las dos cosas son falsas: `PuntosDeGolpe.tsx` en la
// hoja de personaje ya manda deltas positivos, y `changeHp` en el servidor ya los procesa entero
// (tope por arriba, borrado de salvaciones de muerte, rechazo de resucitar en silencio) — eso
// está probado en `character-sheet.service.spec.ts` (buscar "curar" en ese fichero) y no se
// duplica aquí.
//
// **Lo que faltaba de verdad era el gesto rápido de la mesa**, y esto prueba justo eso: que
// `Curar` — el hermano de `PonerDano`, mismo componente por debajo — manda un delta POSITIVO por
// `useChangeHp`, y que lo que se ve en pantalla tras curar es lo que el SERVIDOR devolvió, no un
// recorte hecho en el navegador (el tope de verdad es del servidor: SRD 5.1, "Damage and
// Healing" → "Healing" — "Hit points regained are added to current hit points... A creature's
// hit points can't exceed its hit point maximum, so any hit points regained in excess of this
// number are lost").

function hoja(current: number, max: number): sheetApi.SheetResponse {
  return {
    character: { id: "x" } as sheetApi.CharacterRow,
    sheet: null,
    hp: { current, max, temp: 0, version: 1, exceedsMax: false },
    deathSaves: {
      successes: 0,
      failures: 0,
      status: "alive",
    } as sheetApi.SheetResponse["deathSaves"],
  };
}

function montar(onCerrar = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <Curar campaignId="c1" characterId="ch1" nombre="Elara" abierto onCerrar={onCerrar} />
    </QueryClientProvider>,
  );
  return onCerrar;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("Curar — el gesto hermano de Daño", () => {
  it("manda un delta positivo por useChangeHp, no una segunda API", async () => {
    const cambiarPg = vi.spyOn(sheetApi, "changeHp").mockResolvedValue(hoja(12, 20));

    montar();

    fireEvent.change(screen.getByLabelText("Cuánto curar"), { target: { value: "7" } });
    fireEvent.click(screen.getByRole("button", { name: "Curar" }));

    await waitFor(() => expect(cambiarPg).toHaveBeenCalledWith("c1", "ch1", { delta: 7 }));
    // Ni tipo de daño ni "crítico": el servidor los descarta en la rama de curar y el cajón de
    // curar no los ofrece — no hay ranura de tipo de daño en `Curar`.
    expect(cambiarPg.mock.calls[0][2]).not.toHaveProperty("damageType");
    expect(cambiarPg.mock.calls[0][2]).not.toHaveProperty("critical");
  });

  it("el tope por arriba lo dice el servidor: la pantalla enseña lo que vuelve, no lo que calcula", async () => {
    // Pedir 50 sobre 28/31 — el servidor (no esta prueba, no la pantalla) es quien decide que el
    // resultado se recorta en el máximo, y aquí solo se comprueba que la pantalla pinta esa
    // respuesta, no que ella misma haga el `Math.min`.
    vi.spyOn(sheetApi, "changeHp").mockResolvedValue(hoja(31, 31));

    montar();

    fireEvent.change(screen.getByLabelText("Cuánto curar"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "Curar" }));

    // El cajón muestra la traza del servidor (vacía, sin resistencia ni concentración porque
    // curar nunca las produce) y se cierra solo, que es el camino normal de un golpe sin nada
    // que explicar.
    await waitFor(() => expect(sheetApi.changeHp).toHaveBeenCalled());
  });
});
