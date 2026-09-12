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

  // Ronda de arreglo (revisión, 2026-09-12) — la traza abierta vivía como segundo hijo del `<div>`
  // de la cifra (`flex`, en fila por defecto): se salía a la DERECHA del botón, no crecía hacia
  // abajo. `desplegable` es una ranura propia, cuarta fila del `grid`, después de la nota.
  it("con desplegable, se pinta DESPUÉS de la nota y no dentro de la ranura de la cifra", () => {
    render(
      <Casilla rotulo="CA" nota="+5 temporales" desplegable={<ul>Sin armadura</ul>}>
        <button type="button">17</button>
      </Casilla>,
    );
    const nota = screen.getByTestId("casilla-nota");
    const desplegable = screen.getByTestId("casilla-desplegable");
    // Posición en el documento: el desplegable sigue a la nota, nunca al revés.
    expect(
      nota.compareDocumentPosition(desplegable) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Y la ranura de la cifra —el `flex` que envuelve `children`— solo lleva lo que se le pasó:
    // el defecto original era exactamente que el desplegable colaba ahí, como segundo hijo.
    const ranuraDeLaCifra = screen.getByRole("button", { name: "17" }).parentElement!;
    expect(ranuraDeLaCifra.contains(desplegable)).toBe(false);
    expect(ranuraDeLaCifra.children).toHaveLength(1);
  });

  it("sin desplegable, no reserva su fila: la caja en reposo no cambia de alto", () => {
    const { container } = render(<Casilla rotulo="CA">17</Casilla>);
    expect(screen.queryByTestId("casilla-desplegable")).not.toBeInTheDocument();
    expect(container.firstElementChild!.className).toContain("grid-rows-[auto_1fr_auto]");
  });
});
