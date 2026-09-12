import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import { Rasgos } from "../../pestanas/Rasgos";
import { renderPestana } from "../fixtures/hoja.fixture";

// Tarea 4 (spec 2026-09-11, «la hoja a página completa») — `Rasgos` reúne «Rasgos y aptitudes»,
// la ficha editable y la personalidad: lo que se lee una vez por sesión.

describe("Rasgos — rasgos y aptitudes, ficha y personalidad", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("trae rasgos y aptitudes, ficha y personalidad, y no las salvaciones", async () => {
    renderPestana(Rasgos, { disposicion: "pagina" });
    expect(await screen.findByRole("region", { name: "rasgos y aptitudes" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "ficha del personaje" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "personalidad" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "salvaciones" })).not.toBeInTheDocument();
  });

  // Movida de `HojaCalculada.test.tsx` (describe «La hoja de la maqueta…»). Su tercio de
  // «competencias con armas» vive en `Ataques.test.tsx` — `CompetenciasConArmas` la monta
  // `Ataques.tsx` (Step 3 del brief), no esta pestaña — así que esa aserción viaja allí y aquí se
  // quedan las dos que sí son de `Rasgos`.
  it("el pie trae competencias con armas, rasgos y personalidad, y la personalidad dice qué le falta en vez de inventarlo", async () => {
    renderPestana(Rasgos, { disposicion: "pagina" });
    const rasgos = await screen.findByRole("region", { name: "rasgos y aptitudes" });
    expect(within(rasgos).getByText("Lanzamiento de conjuros")).toBeInTheDocument();

    const personalidad = screen.getByRole("region", { name: "personalidad" });
    expect(personalidad.textContent).toMatch(/Rasgo · Ideal · Vínculo · Defecto/);
    // Sin biografía guardada NO se finge un rasgo: se dice dónde se escribe.
    expect(personalidad.textContent).toMatch(/Sin nota de personalidad/);
  });
});
