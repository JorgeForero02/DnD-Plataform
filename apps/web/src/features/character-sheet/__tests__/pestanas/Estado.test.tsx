import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import { Estado } from "../../pestanas/Estado";
import * as members from "../../../campaigns/members";
import { renderPestana } from "../fixtures/hoja.fixture";

// Tarea 5 (spec 2026-09-11, «la hoja a página completa») — `Estado` es la pestaña de lo que
// cambia entre turnos: modificadores temporales, condiciones (con su gestión), CA con fórmula,
// velocidad y sentidos, y anulaciones. Las tarjetas vivían en `HojaCalculada.tsx`; se mueven tal
// cual.

describe("Estado — modificadores, condiciones, CA, velocidad y anulaciones", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // El nombre del botón lo pinta `Condiciones.tsx` de verdad: `aria-label="Aplicar condición"`
  // (no «añadir condición», que era el nombre supuesto del brief). Solo sale con `puedeEditar`.
  it("trae modificadores, condiciones con gestión, CA con fórmula, velocidad y anulaciones", async () => {
    // Las anulaciones solo se montan para el DM (`Anulaciones.tsx`, `role !== "DM"` → `null`).
    vi.spyOn(members, "useMyRole").mockReturnValue({
      role: "DM",
      isLoading: false,
      isError: false,
      retry: () => {},
    });
    const { container } = renderPestana(Estado, { disposicion: "pagina", puedeEditar: true });
    const raiz = container.querySelector('[data-pestana="estado"]') as HTMLElement;
    expect(raiz.className).toContain("lg:grid-cols-2");
    for (const t of ["Modificadores temporales", "Condiciones activas", "Velocidad y sentidos"]) {
      expect(await within(raiz).findByText(t)).toBeInTheDocument();
    }
    // «Clase de armadura» sale dos veces dentro de su propia tarjeta (el título de la sección y
    // el rótulo del valor derivado): `getAllByText` es lo correcto, no `findByText`.
    expect(within(raiz).getAllByText("Clase de armadura").length).toBeGreaterThan(0);
    expect(within(raiz).getByRole("button", { name: "Aplicar condición" })).toBeInTheDocument();
    const anulaciones = await within(raiz).findByRole("region", { name: "anulaciones del DM" });
    expect(within(anulaciones).getByRole("button", { name: "Anular" })).toBeInTheDocument();
  });

  // Mitad de «la Clase de Armadura tiene su tarjeta con la fórmula en línea, y la tira solo la
  // cifra» (`HojaCalculada.test.tsx`, describe «La hoja de la maqueta…») que le toca a esta
  // pestaña: la tarjeta con la fórmula. La otra mitad —que la casilla de la cabecera NO la
  // repite— es sobre `Cabecera`/la tira, no sobre esta pestaña, y se queda donde estaba.
  it("la Clase de Armadura tiene su tarjeta con la fórmula en línea", async () => {
    renderPestana(Estado, { disposicion: "pagina" });
    const tarjeta = await screen.findByRole("region", { name: "clase de armadura" });

    // La fórmula de una línea —lo que la maqueta pone bajo el número— vive aquí, no en la tira.
    // Pone los nombres en minúscula («10 sin armadura +2 modificador de destreza»): es una
    // frase, no una lista de rótulos.
    expect(tarjeta.textContent).toMatch(/sin armadura/i);
    expect(tarjeta.textContent).toMatch(/modificador de destreza/i);
    expect(tarjeta.textContent).toContain("12");
  });
});
