import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DerivedValue } from "@dnd/shared";
import { CAJA_DE_VITELA, HojaDeVitela, RotuloDeSeccion } from "../Vitela";
import { ValorDerivado } from "../Traza";

// Tarea H4 — la piel de vitela.
//
// **Qué puede y qué no puede probar este fichero.** `jsdom` no maqueta: no hay color efectivo,
// ni contraste, ni tamaño, ni recorte. Así que aquí se comprueba lo único que jsdom sí ve —qué
// clases y qué elementos se pintan— y **todo lo que depende de píxeles se mide en el navegador**
// (`e2e/hoja.spec.ts`: contraste de la vitela en los dos temas, la costura entre las dos pieles,
// y que la afordancia de edición sigue distinguiendo lo editable de lo derivado).
//
// Es el mismo reparto que ya usa `ui/__tests__/Panel.test.tsx` para la vitela del panel, y por la
// misma razón.

describe("HojaDeVitela — la superficie de papel", () => {
  it("pinta la vitela y NO deja el relleno de cromado", () => {
    const { container } = render(
      <HojaDeVitela>
        <p>contenido</p>
      </HojaDeVitela>,
    );
    const hoja = container.querySelector('[data-piel="vitela"]')!;
    expect(hoja).not.toBeNull();
    expect(hoja.className).toContain("bg-vellum");
    // La superficie del instrumento no puede reaparecer aquí: si vuelve, la costura de H4
    // desaparece y la hoja vuelve a ser una tarjeta más.
    expect(hoja.className).not.toContain("bg-surface");
    expect(screen.getByText("contenido")).toBeInTheDocument();
  });

  it("no lleva filete arriba, porque arriba está el desgarro", () => {
    const { container } = render(
      <HojaDeVitela>
        <p>contenido</p>
      </HojaDeVitela>,
    );
    const hoja = container.querySelector('[data-piel="vitela"]')!;
    // Tres lados, no cuatro: `border-x` y `border-b`, nunca un `border` a secas ni un `border-t`.
    expect(hoja.className).toContain("border-x");
    expect(hoja.className).toContain("border-b");
    expect(hoja.className).not.toContain("border-t");
  });

  it("el borde rasgado se DIBUJA y se esconde de los lectores de pantalla", () => {
    const { container } = render(
      <HojaDeVitela>
        <p>contenido</p>
      </HojaDeVitela>,
    );
    // La regla de iconos del proyecto: nada de glifos de fuente ni emoji. El desgarro es un
    // trazado SVG, y es decorativo, así que no se anuncia.
    const borde = container.querySelector('svg[data-borde="rasgado"]')!;
    expect(borde).not.toBeNull();
    expect(borde.getAttribute("aria-hidden")).toBe("true");
    const silueta = borde.querySelector("path")!.getAttribute("d")!;
    // Y es una silueta de ARCOS, no de cuerdas: lo que separaba esta versión de la anterior era
    // exactamente eso. Un polígono no tiene ni una `C`.
    expect(silueta).toContain("C");
    expect(silueta.split("C").length - 1).toBeGreaterThan(20);
  });
});

describe("RotuloDeSeccion — el filete de metal del manual", () => {
  it("lleva la voz de los títulos y su filete de cobre debajo", () => {
    render(<RotuloDeSeccion>Salvaciones</RotuloDeSeccion>);
    const rotulo = screen.getByText("Salvaciones");
    expect(rotulo.className).toContain("font-title");
    expect(rotulo.className).toContain("border-b");
    expect(rotulo.className).toContain("border-copper");
  });
});

describe("ValorDerivado — la costura entre las dos pieles, hecha propiedad", () => {
  const ca: DerivedValue = {
    key: "ac",
    total: 15,
    steps: [
      {
        op: "base",
        amount: 13,
        sourceType: "item",
        sourceKey: "leather",
        labelKey: "armor.leather",
      },
      { op: "add", amount: 2, sourceType: "ability", sourceKey: "dex", labelKey: "abilityMod.dex" },
    ],
  };

  it("por defecto es CROMADO: la cabecera fija no se convierte en papel sin pedirlo", () => {
    const { container } = render(<ValorDerivado etiqueta="CA" valor={ca} />);
    const casilla = container.firstElementChild!;
    expect(casilla.className).toContain("bg-surface");
  });

  it('con piel="vitela" pierde el relleno de cromado y se queda con el filete de cobre', () => {
    const { container } = render(<ValorDerivado etiqueta="CA" valor={ca} piel="vitela" />);
    const casilla = container.firstElementChild!;
    // Sin fondo propio: en la hoja impresa el papel es continuo por debajo de las casillas y lo
    // que las separa es la línea.
    expect(casilla.className).not.toContain("bg-surface");
    expect(casilla.className).toContain(CAJA_DE_VITELA);
  });

  it("en vitela, el texto que se LEE cambia de voz y el número NO", () => {
    render(<ValorDerivado etiqueta="CA" valor={ca} piel="vitela" />);
    // La fórmula de una línea es prosa: serif del mundo.
    const formula = screen.getByText(/13 cuero/);
    expect(formula.className).toContain("font-world");
    // El total sigue en la voz de las cifras. Una serif proporcional desalinea una columna de
    // modificadores, que es justo lo que la hoja impresa evita.
    const total = screen.getByRole("button", { name: "15" });
    expect(total.className).toContain("font-data");
  });
});
