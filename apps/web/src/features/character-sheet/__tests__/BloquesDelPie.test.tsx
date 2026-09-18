import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ResolvedFeatureDto } from "../api";
import { CompetenciasConArmas, RasgosYAptitudes } from "../BloquesDelPie";

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

// Tarea 7 de 3A.2 («elegir, lanzar y usar») — `RasgosYAptitudes` gana un `<details>` por rasgo
// cuando `ResolvedFeature.textEs` trae prosa del SRD (`resolve.ts`); un rasgo sin texto (la
// mayoría: solo nombre y nivel a mano) se queda como línea simple, sin un triángulo que no
// despliega nada.
const FURIA: ResolvedFeatureDto = {
  sourceKey: "barbarian",
  labelKey: "class.barbarian.rage",
  name: "Furia",
  textEs: "Cuando estás en medio de un combate, luchas con ferocidad primordial.",
};

const RASGO_SIN_TEXTO: ResolvedFeatureDto = {
  sourceKey: "wizard",
  labelKey: "class.wizard.spellcasting",
  name: "Lanzamiento de conjuros",
};

describe("RasgosYAptitudes — el texto del SRD, en un <details> por rasgo", () => {
  it("un rasgo con textEs se pinta como <details>, cerrado por defecto, con el nombre como resumen", () => {
    render(<RasgosYAptitudes features={[FURIA]} />);
    const resumen = screen.getByText("Furia");
    expect(resumen.closest("summary")).not.toBeNull();
    const detalle = resumen.closest("details");
    expect(detalle).not.toBeNull();
    expect(detalle).not.toHaveAttribute("open");
    expect(screen.getByText(/luchas con ferocidad primordial/)).toBeInTheDocument();
  });

  it("un rasgo sin textEs se pinta como línea simple, sin <details> ni triángulo que no despliega nada", () => {
    render(<RasgosYAptitudes features={[RASGO_SIN_TEXTO]} />);
    const nombre = screen.getByText("Lanzamiento de conjuros");
    expect(nombre.closest("details")).toBeNull();
  });

  it("textEs: null (se buscó y no hay traducción) también se queda como línea simple", () => {
    render(<RasgosYAptitudes features={[{ ...RASGO_SIN_TEXTO, textEs: null }]} />);
    const nombre = screen.getByText("Lanzamiento de conjuros");
    expect(nombre.closest("details")).toBeNull();
  });

  it("sin ningún rasgo, no se dibuja la tarjeta", () => {
    const { container } = render(<RasgosYAptitudes features={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
