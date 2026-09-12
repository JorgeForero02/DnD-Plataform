import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import { Ataques } from "../../pestanas/Ataques";
import { renderPestana, valor } from "../fixtures/hoja.fixture";

// Tarea 4 (spec 2026-09-11, «la hoja a página completa») — `Ataques` reúne «Ataques y
// lanzamiento» y «Competencias con armas»: lo que se dispara en un turno.

describe("Ataques — la tabla de ataques y las competencias con armas", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // La mitad de «el pie trae competencias con armas, rasgos y personalidad…»
  // (`HojaCalculada.test.tsx`, describe «La hoja de la maqueta…») que le toca a esta pestaña: el
  // brief la lista junto con rasgos+personalidad en `Rasgos.test.tsx`, pero `CompetenciasConArmas`
  // vive en `Ataques.tsx` (Step 3 del brief), así que su aserción («Armas sencillas») viene aquí
  // en vez de perderse — nada se elimina, se reparte por la tarjeta que de verdad la pinta.
  it("trae la tabla de ataques y las competencias con armas, y no las habilidades", async () => {
    renderPestana(Ataques, { disposicion: "pagina" });
    expect(
      await screen.findByRole("region", { name: "ataques y lanzamiento" }),
    ).toBeInTheDocument();
    const competencias = screen.getByRole("region", { name: "competencias con armas" });
    expect(within(competencias).getByText("Armas sencillas")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "habilidades" })).not.toBeInTheDocument();
  });

  // Movida de `HojaCalculada.test.tsx` (describe «La hoja de la maqueta…»), tal cual.
  it("«Ataques y lanzamiento» es una tabla con sus columnas y una fila por arma equipada", async () => {
    // Carril B3 — el cuadro real sale de `attacks`, no de los tres bonificadores genéricos del
    // motor: esos ya no se pintan como filas.
    renderPestana(
      Ataques,
      { disposicion: "pagina" },
      {
        attacks: [
          {
            key: "SRD:rapier",
            name: "Estoque",
            ref: "SRD:rapier",
            ability: "dex",
            attackBonus: valor(5, "abilityMod.dex"),
            damage: { expression: "1d8+3", dice: "1d8", modifier: 3, type: "PIERCING" },
            properties: ["FINESSE"],
            proficient: true,
          },
        ],
      },
    );
    const seccion = await screen.findByRole("region", { name: "ataques y lanzamiento" });
    const tabla = within(seccion).getByRole("table");

    for (const columna of ["Nombre", "Bonif.", "Daño / tipo", "Notas"]) {
      expect(within(tabla).getByRole("columnheader", { name: columna })).toBeInTheDocument();
    }
    expect(within(tabla).getByRole("rowheader", { name: "Estoque" })).toBeInTheDocument();
    expect(within(tabla).getByText("+5")).toBeInTheDocument();
    expect(within(tabla).getByText(/1d8\+3/)).toBeInTheDocument();
    expect(within(tabla).getByText("perforante")).toBeInTheDocument();
    // Y cada una se puede tirar desde su fila: es la tabla de la maqueta, con nuestro dado.
    expect(within(tabla).getByRole("button", { name: "Tirada de Estoque" })).toBeInTheDocument();
    // La CD de conjuro sigue acompañando a la tabla en vez de ser una casilla suelta más.
    expect(within(seccion).getByText(/CD de salvación de conjuro 13/)).toBeInTheDocument();
  });

  it("«Ataques y lanzamiento» sin arma equipada dice qué hacer, no deja un hueco", async () => {
    renderPestana(Ataques, { disposicion: "pagina" }); // sheetResponse trae attacks: []
    const seccion = await screen.findByRole("region", { name: "ataques y lanzamiento" });
    expect(within(seccion).queryByRole("table")).not.toBeInTheDocument();
    expect(within(seccion).getByText(/no llevas ningún arma equipada/i)).toBeInTheDocument();
    expect(within(seccion).getByRole("link", { name: /bolsa/i })).toBeInTheDocument();
  });
});
