import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AcercaDePage } from "../AcercaDePage";
import { LegalNotice } from "../../ui/LegalNotice";

// Deuda S1 — la atribución del SRD 5.1 en la aplicación.
//
// Estas pruebas no comprueban maquetación: comprueban que **el texto que la licencia exige está
// y dice lo que tiene que decir**. Es un requisito legal con una condición de disparo —«en
// cuanto una pantalla pinte datos del SRD»— y por eso conviene que se ponga rojo si alguien lo
// borra al rediseñar.

function pintarAcercaDe() {
  return render(
    <MemoryRouter initialEntries={["/acerca-de"]}>
      <Routes>
        <Route path="/acerca-de" element={<AcercaDePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("la pantalla Acerca de lleva la atribución completa", () => {
  // **El texto sale dos veces y está bien.** Esta pantalla vive dentro del armazón, que ya
  // lleva el pie con la atribución corta; repetirla en la página del texto completo no molesta
  // a nadie y evita una excepción («oculta el pie en esta ruta») que habría que recordar en
  // cada rediseño. Por eso se consulta con `getAllByText` y no con `getByText`.
  it("nombra el SRD 5.1 y a Wizards of the Coast", () => {
    pintarAcercaDe();
    expect(screen.getAllByText(/System Reference Document 5.1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Wizards of the Coast LLC/).length).toBeGreaterThan(0);
  });

  it("nombra la licencia CC BY 4.0", () => {
    pintarAcercaDe();
    expect(screen.getAllByText(/Creative Commons Attribution 4.0/).length).toBeGreaterThan(0);
  });

  it("**dice que hay modificaciones**, que es la mitad que se olvida", () => {
    // Traducir al español ES una modificación, y la licencia obliga a indicarlo. Omitir esta
    // frase incumple igual que omitir el nombre del autor.
    pintarAcercaDe();
    expect(screen.getByText(/Modificaciones:/)).toBeInTheDocument();
    expect(screen.getAllByText(/traducido al español/).length).toBeGreaterThan(0);
  });

  it("enlaza al SRD y al texto legal de la licencia, y los abre fuera", () => {
    pintarAcercaDe();
    const srd = screen.getAllByRole("link", { name: "System Reference Document 5.1" })[0];
    const licencia = screen.getByRole("link", {
      name: /Licencia Creative Commons Attribution 4.0/,
    });
    expect(srd).toHaveAttribute("href", expect.stringContaining("systems-reference-document"));
    expect(licencia).toHaveAttribute("href", expect.stringContaining("creativecommons.org"));
    // `rel="noreferrer"` con `target="_blank"`: sin él, la pestaña nueva puede tocar la nuestra.
    expect(srd).toHaveAttribute("rel", "noreferrer");
  });

  it("declara qué contenido trae de serie y qué no", () => {
    pintarAcercaDe();
    expect(screen.getByText(/no se copian ni se distribuyen/)).toBeInTheDocument();
  });
});

describe("el pie que acompaña a toda pantalla con sesión", () => {
  it("lleva la atribución corta y el camino al texto completo", () => {
    render(
      <MemoryRouter>
        <LegalNotice />
      </MemoryRouter>,
    );
    expect(screen.getByText(/System Reference Document 5.1/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CC BY 4.0" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Acerca de" })).toHaveAttribute("href", "/acerca-de");
  });

  it("dice que está traducido: la nota de modificación también va en el pie", () => {
    render(
      <MemoryRouter>
        <LegalNotice />
      </MemoryRouter>,
    );
    expect(screen.getByText(/traducido al español/)).toBeInTheDocument();
  });

  it("es un <footer>, para que un lector de pantalla sepa que es el pie", () => {
    const { container } = render(
      <MemoryRouter>
        <LegalNotice />
      </MemoryRouter>,
    );
    expect(container.querySelector("footer")).not.toBeNull();
  });
});
