import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FiltrosDeObjetos } from "../FiltrosDeObjetos";
import { SIN_FILTRO, type FiltroDeObjetos } from "../filtrarObjetos";

// Tarea 13, ítem 9.3 (2026-09-19) — el chip «Todo» y los dos grupos con rótulo `sr-only`.

/** Envoltorio controlado: `FiltrosDeObjetos` no lleva estado propio, así que la única forma
 *  honesta de comprobar que pulsar un chip cambia lo que el SIGUIENTE render enseña es
 *  aplicar de verdad el `onCambiar` que manda, como hace su único consumidor real
 *  (`PaginaDeInventario.tsx`). */
function Envoltorio({ inicial = SIN_FILTRO }: { inicial?: FiltroDeObjetos }) {
  const [filtro, setFiltro] = useState(inicial);
  return <FiltrosDeObjetos filtro={filtro} onCambiar={setFiltro} />;
}

describe("FiltrosDeObjetos — el chip «Todo» y los dos grupos", () => {
  it("«Todo» está activo por defecto y es el primer chip", () => {
    render(<Envoltorio />);
    const chips = screen.getAllByRole("button");
    expect(chips[0]).toHaveTextContent("Todo");
    expect(chips[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("elegir una zona apaga «Todo», y volver a pulsarlo limpia zona y tipo", () => {
    render(<Envoltorio />);
    fireEvent.click(screen.getByRole("button", { name: "Equipado" }));
    const todo = screen.getByRole("button", { name: "Todo" });
    expect(todo).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Equipado" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(todo);
    expect(todo).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Equipado" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("«Todo» no toca «Sintonizados»: es un filtro aparte, no un tercer grupo", () => {
    render(<Envoltorio inicial={{ ...SIN_FILTRO, sintonizados: true }} />);
    fireEvent.click(screen.getByRole("button", { name: "Todo" }));
    expect(screen.getByRole("button", { name: "Sintonizados" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("las zonas y los tipos van agrupados con un rótulo sr-only, «Estado» y «Tipo»", () => {
    render(<Envoltorio />);
    expect(screen.getByText("Estado")).toHaveClass("sr-only");
    expect(screen.getByText("Tipo")).toHaveClass("sr-only");
  });
});
