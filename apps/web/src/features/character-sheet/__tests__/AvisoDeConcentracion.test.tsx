import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AvisoDeConcentracion } from "../AplicarDano";
import type { SheetResponse } from "../api";

// **El campo que el servidor mandaba y nadie leía.** `changeHp` devuelve `concentrationSave`
// desde 2C —el golpe crea la petición de salvación y responde con su CD—, y hasta el 2026-09-04
// ninguna pantalla lo pintaba: la tirada aparecía en la bandeja del jugador y quien había
// aplicado el daño no sabía que la había provocado. Es la ficha del §8 de la auditoría de la
// mesa, y esto es lo que la cierra.

/** Lo mínimo que la respuesta necesita para esta pantalla; el resto no lo mira. */
function respuesta(extra: Partial<SheetResponse> = {}): SheetResponse {
  return extra as SheetResponse;
}

describe("AvisoDeConcentracion", () => {
  it("dice la CD cuando el golpe ha pedido la salvación", () => {
    render(
      <AvisoDeConcentracion
        respuesta={respuesta({ concentrationSave: { requestId: "r1", dc: 13 } })}
      />,
    );
    expect(screen.getByTestId("aviso-de-concentracion")).toBeInTheDocument();
    expect(screen.getByText(/CD 13/)).toBeInTheDocument();
  });

  // **No promete lo que no ha pasado.** El servidor pide la tirada; no la resuelve. Decir aquí
  // «pierde la concentración» sería la pantalla contando el final de algo que aún no ha ocurrido.
  it("no afirma el resultado: solo que la tirada está pendiente", () => {
    render(
      <AvisoDeConcentracion
        respuesta={respuesta({ concentrationSave: { requestId: "r1", dc: 10 } })}
      />,
    );
    expect(screen.getByText(/bandeja de tiradas pendientes/i)).toBeInTheDocument();
    expect(screen.queryByText(/pierde la concentración/i)).not.toBeInTheDocument();
  });

  // El servidor omite el campo cuando no toca —daño cero, daño masivo, el personaje ya en el
  // suelo, o sencillamente no estaba concentrado—. Sin campo no hay cartel.
  it("no pinta nada cuando el servidor no pidió ninguna salvación", () => {
    const { container } = render(<AvisoDeConcentracion respuesta={respuesta()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("no pinta nada mientras no hay respuesta", () => {
    const { container } = render(<AvisoDeConcentracion respuesta={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
