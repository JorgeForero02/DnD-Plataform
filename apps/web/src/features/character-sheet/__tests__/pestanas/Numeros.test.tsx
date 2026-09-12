import { describe, expect, it, vi, beforeEach } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import { Numeros } from "../../pestanas/Numeros";
import { renderPestana } from "../fixtures/hoja.fixture";

// Tarea 4 (spec 2026-09-11, «la hoja a página completa») — `Numeros` es la pestaña de lectura
// que reúne características, salvaciones y habilidades: la misma tarjeta de siempre, movida.

describe("Numeros — características, salvaciones y habilidades", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("a página: características, salvaciones+pasivos y habilidades en tres columnas; en mesa, una", async () => {
    const { container } = renderPestana(Numeros, { disposicion: "pagina" });
    const raiz = container.querySelector('[data-pestana="numeros"]')!;
    expect(raiz.className).toContain("lg:grid-cols-3");
    expect(within(raiz as HTMLElement).getByText("Características")).toBeInTheDocument();
    expect(within(raiz as HTMLElement).getByText("Salvaciones")).toBeInTheDocument();
    expect(within(raiz as HTMLElement).getByText("Habilidades")).toBeInTheDocument();
    expect(within(raiz as HTMLElement).getByText(/percepción pasiva/i)).toBeInTheDocument();
    cleanup();
    const mesa = renderPestana(Numeros, { disposicion: "mesa" }).container.querySelector(
      '[data-pestana="numeros"]',
    )!;
    expect(mesa.className).not.toContain("lg:grid-cols");
  });

  // Movida de `HojaCalculada.test.tsx` (describe «H3 — la cabecera fija y las dos columnas»),
  // tal cual. Nota: la aserción original mira el orden DOM dentro de UNA columna; en
  // `disposicion: "pagina"` Números vive en tres columnas (características, salvaciones+pasivos
  // y habilidades ya no comparten una), así que se corre en "mesa" (una sola columna) para que
  // la aserción de contigüidad siga siendo literalmente cierta.
  it("características → salvaciones → habilidades bajan seguidas por la misma columna", async () => {
    renderPestana(Numeros, { disposicion: "mesa" });
    const caracteristicas = await screen.findByRole("region", { name: "características" });
    const salvaciones = screen.getByRole("region", { name: "salvaciones" });
    const habilidades = screen.getByRole("region", { name: "habilidades" });

    // Las tres en la MISMA columna (la raíz de la pestaña, en "mesa"). Si alguien parte la
    // cadena entre dos columnas, esto se rompe.
    const columna = salvaciones.closest('[data-pestana="numeros"]')!;
    expect(columna.contains(caracteristicas)).toBe(true);
    expect(columna.contains(habilidades)).toBe(true);

    // Y en ese orden: la contigüidad es la explicación, así que el orden es parte del contrato.
    const orden = (a: Element, b: Element) =>
      Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(orden(caracteristicas, salvaciones)).toBe(true);
    expect(orden(salvaciones, habilidades)).toBe(true);
  });
});
