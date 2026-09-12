import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Casilla } from "../Casilla";

// Anexo #4: las cinco casillas de la tira no eran simétricas porque la de PG crecía con la línea
// «+5 temporales». La casilla reserva la tercera línea SIEMPRE, con o sin nota.
describe("Casilla", () => {
  it("pinta rótulo, cifra y una tercera línea reservada aunque no haya nota", () => {
    render(<Casilla rotulo="CA">17</Casilla>);
    expect(screen.getByText("CA")).toBeInTheDocument();
    expect(screen.getByText("17")).toBeInTheDocument();
    const nota = screen.getByTestId("casilla-nota");
    expect(nota).toBeEmptyDOMElement();
    expect(nota.className).toMatch(/min-h-/);
  });

  it("con nota, la pinta en la tercera línea", () => {
    render(
      <Casilla rotulo="PG" nota="+5 temporales">
        12 / 20
      </Casilla>,
    );
    expect(screen.getByTestId("casilla-nota")).toHaveTextContent("+5 temporales");
  });

  it("anuncia el rótulo largo y esconde el corto de la accesibilidad", () => {
    render(
      <Casilla rotulo="Inic." rotuloLargo="Iniciativa">
        +2
      </Casilla>,
    );
    expect(screen.getByText("Iniciativa")).toHaveClass("sr-only");
    expect(screen.getByText("Inic.")).toHaveAttribute("aria-hidden", "true");
  });
});
