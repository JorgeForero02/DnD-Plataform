import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompetenciasConArmas } from "../BloquesDelPie";

// **Competencias con armas.** Hasta el 2026-09-06 este bloque no se dibujaba porque un comentario
// afirmaba que `CharacterSheet` no devolvía `weaponProficiencies` — era falso, y el defecto real
// era que el DTO del navegador no la declaraba. Lo que importa aquí: ninguna clave cruda del
// catálogo (`"simple"`, `"battleaxe"`…) llega al DOM, y el bloque no se dibuja sin nada que decir.

describe("CompetenciasConArmas", () => {
  it("traduce cada competencia, categoría o arma concreta", () => {
    render(<CompetenciasConArmas weaponProficiencies={["simple", "battleaxe"]} />);
    const region = screen.getByRole("region", { name: "competencias con armas" });
    expect(within(region).getByText("Armas sencillas")).toBeInTheDocument();
    expect(within(region).getByText("Hacha de batalla")).toBeInTheDocument();

    for (const cruda of ["simple", "battleaxe"]) {
      expect(within(region).queryByText(cruda, { exact: true })).not.toBeInTheDocument();
    }
  });

  it("sin ninguna competencia (un PNJ), el bloque no se dibuja", () => {
    render(<CompetenciasConArmas weaponProficiencies={[]} />);
    expect(
      screen.queryByRole("region", { name: "competencias con armas" }),
    ).not.toBeInTheDocument();
  });
});
