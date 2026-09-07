import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EconomiaDeAccion } from "../EconomiaDeAccion";

// Paso 2, tarea A3 — la mesa enseña lo que te queda del turno.
//
// **Corregido respecto al plan, y la corrección manda**: el plan pedía comprobar que «el botón
// de atacar sigue habilitado», y ese botón no es de este componente — pedirle que lo renderice
// sería una prueba que se demuestra a sí misma. Aquí se comprueba lo que SÍ es suyo: sus propios
// controles de gasto, que nunca se deshabilitan. La otra mitad —que el botón de atacar de verdad
// sigue vivo— se mide en el navegador, donde ese botón existe de verdad (`apps/web/e2e`).

const ECONOMIA_INICIAL = {
  actionUsed: false,
  bonusUsed: false,
  reactionUsed: false,
  movementUsed: 0,
};

describe("EconomiaDeAccion", () => {
  it("enseña acción, adicional, reacción y movimiento con su estado", () => {
    render(
      <EconomiaDeAccion
        economia={{ actionUsed: true, bonusUsed: false, reactionUsed: false, movementUsed: 10 }}
        velocidad={30}
      />,
    );

    expect(screen.getByText("Acción: usada")).toBeInTheDocument();
    expect(screen.getByText("Acción adicional: disponible")).toBeInTheDocument();
    expect(screen.getByText("Reacción: disponible")).toBeInTheDocument();
    // Lo que le queda, no lo que ha gastado: 30 de velocidad menos 10 gastados.
    expect(screen.getByText("20 pies")).toBeInTheDocument();
  });

  it("cuando te pasas, lo dice y no deshabilita ningún control suyo", () => {
    const gastada = { actionUsed: true, bonusUsed: true, reactionUsed: true, movementUsed: 30 };
    render(<EconomiaDeAccion economia={gastada} velocidad={30} excedido />);

    expect(screen.getByRole("alert")).toHaveTextContent(/ya has usado tu acción/i);
    // El servidor cuenta y avisa, nunca rechaza (tarea A2): esta pantalla no puede inventarse un
    // rechazo que el servidor no hace, así que ningún botón propio se deshabilita jamás — ni
    // siquiera con todo ya gastado.
    for (const boton of screen.getAllByRole("button")) {
      expect(boton).not.toBeDisabled();
    }
  });

  it("con todo disponible no hay ningún aviso de exceso", () => {
    render(<EconomiaDeAccion economia={ECONOMIA_INICIAL} velocidad={30} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("la velocidad desconocida no miente: ni pies ni aviso de exceso, sino la ausencia dicha con palabras", () => {
    render(
      <EconomiaDeAccion
        economia={{ ...ECONOMIA_INICIAL, movementUsed: 999 }}
        velocidad={undefined}
        excedido
      />,
    );

    expect(screen.queryByText(/pies/i)).not.toBeInTheDocument();
    expect(screen.getByText("velocidad desconocida")).toBeInTheDocument();
    // El aviso de exceso puede seguir sonando por otra cosa (aquí no hay nada más gastado), pero
    // nunca puede mencionar el movimiento cuando no sabe cuánto queda.
    expect(screen.queryByText(/tu movimiento/i)).not.toBeInTheDocument();
  });

  it("pulsar «Usar mi acción» avisa a quien monta el componente, con el coste ACTION", () => {
    const onGastar = vi.fn();
    render(<EconomiaDeAccion economia={ECONOMIA_INICIAL} velocidad={30} onGastar={onGastar} />);

    fireEvent.click(screen.getByRole("button", { name: "Usar mi acción" }));
    expect(onGastar).toHaveBeenCalledWith({ coste: "ACTION" });
  });

  it("sin onGastar, los controles existen igual y no rompen al pulsarlos", () => {
    render(<EconomiaDeAccion economia={ECONOMIA_INICIAL} velocidad={30} />);
    fireEvent.click(screen.getByRole("button", { name: "Usar mi reacción" }));
    expect(screen.getByText("Reacción: disponible")).toBeInTheDocument();
  });
});
