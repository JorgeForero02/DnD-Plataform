import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EconomiaDeAccion } from "../EconomiaDeAccion";

// Paso 2, tarea A3 — la mesa enseña lo que te queda del turno.
//
// **Corregido respecto al plan, y la corrección manda**: el plan pedía comprobar que «el botón
// de atacar sigue habilitado», y ese botón no es de este componente — pedirle que lo renderice
// sería una prueba que se demuestra a sí misma. Aquí se comprueba lo que SÍ es suyo: sus propios
// controles de gasto, que nunca se deshabilitan. La otra mitad —que el botón de atacar de verdad
// sigue vivo— se mide en el navegador, donde ese botón existe de verdad (`apps/web/e2e`).
//
// **3A.3 (D-CF-145):** la economía deja de tener botones «Usar mi…» para el jugador; el jugador
// solo VE tres marcas y sus pies. Solo el DM (`esDm`) ve «Corregir», que abre las tres casillas
// como conmutadores hacia adelante (marcar gastado a mano; el servidor no ofrece deshacerlo).

const ECONOMIA_INICIAL = {
  actionUsed: false,
  bonusUsed: false,
  reactionUsed: false,
  movementUsed: 0,
};

describe("EconomiaDeAccion", () => {
  it("enseña acción, adicional, reacción y movimiento con su estado, sin ningún «Usar mi…»", () => {
    render(
      <EconomiaDeAccion
        economia={{ actionUsed: true, bonusUsed: false, reactionUsed: false, movementUsed: 10 }}
        velocidad={30}
      />,
    );

    expect(screen.getByRole("status", { name: "Economía del turno" })).toBeInTheDocument();
    expect(screen.getByTitle("acción: gastada")).toBeInTheDocument();
    expect(screen.getByTitle("acción adicional: disponible")).toBeInTheDocument();
    expect(screen.getByTitle("reacción: disponible")).toBeInTheDocument();
    // Lo que le queda sobre el total, no solo lo que ha gastado: 30 de velocidad, 10 gastados.
    expect(screen.getByText("20/30 pies")).toBeInTheDocument();

    // El jugador ya no tiene botones de gasto propios: eso es del servidor, por las puertas de
    // ataques/actividades/conjuros (tarea A2/A11), nunca de un botón «Usar mi…» a mano.
    expect(screen.queryByRole("button", { name: /Usar mi/i })).not.toBeInTheDocument();
    // El campo de pies + «Mover» sigue siendo mando de cualquiera: el movimiento no tiene puerta
    // propia que lo gaste.
    expect(screen.getByRole("button", { name: "Mover" })).toBeInTheDocument();
    expect(
      screen.getByRole("spinbutton", { name: "Pies de movimiento a gastar" }),
    ).toBeInTheDocument();
  });

  it("cuando te pasas, pinta la marca en aviso con «de más» y no deshabilita ningún control suyo", () => {
    const gastada = { actionUsed: true, bonusUsed: true, reactionUsed: true, movementUsed: 30 };
    render(<EconomiaDeAccion economia={gastada} velocidad={30} excedido />);

    expect(screen.getByRole("alert")).toHaveTextContent(/ya has usado tu acción/i);
    expect(screen.getByTitle("acción: gastada de más")).toBeInTheDocument();
    // El servidor cuenta y avisa, nunca rechaza (tarea A2): esta pantalla no puede inventarse un
    // rechazo que el servidor no hace, así que ningún botón propio se deshabilita jamás — ni
    // siquiera con todo ya gastado.
    for (const boton of screen.getAllByRole("button")) {
      expect(boton).not.toBeDisabled();
    }
  });

  it("con todo disponible no hay ningún aviso de exceso ni marca en «de más»", () => {
    render(<EconomiaDeAccion economia={ECONOMIA_INICIAL} velocidad={30} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText(/de más/)).not.toBeInTheDocument();
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

  it("ningún valor de enumeración llega a la pantalla", () => {
    render(<EconomiaDeAccion economia={ECONOMIA_INICIAL} velocidad={30} />);
    for (const enumValue of ["ACTION", "BONUS", "REACTION", "MOVEMENT", "FREE"]) {
      expect(screen.queryByText(enumValue)).not.toBeInTheDocument();
    }
  });

  it("sin esDm, no hay «Corregir»", () => {
    render(<EconomiaDeAccion economia={ECONOMIA_INICIAL} velocidad={30} />);
    expect(screen.queryByRole("button", { name: "Corregir" })).not.toBeInTheDocument();
  });

  it("con esDm, «Corregir» abre tres casillas que llaman a onGastar", () => {
    const onGastar = vi.fn();
    render(
      <EconomiaDeAccion economia={ECONOMIA_INICIAL} velocidad={30} onGastar={onGastar} esDm />,
    );

    expect(
      screen.queryByRole("group", { name: "Corregir la economía a mano" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Corregir" }));

    const grupo = screen.getByRole("group", { name: "Corregir la economía a mano" });
    fireEvent.click(within(grupo).getByRole("checkbox", { name: "acción" }));
    expect(onGastar).toHaveBeenCalledWith({ coste: "ACTION", cantidad: undefined });
  });

  it("con esDm y algo ya gastado, su casilla de «Corregir» está marcada y deshabilitada", () => {
    render(
      <EconomiaDeAccion economia={{ ...ECONOMIA_INICIAL, actionUsed: true }} velocidad={30} esDm />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Corregir" }));

    const casilla = screen.getByRole("checkbox", { name: "acción" });
    expect(casilla).toBeChecked();
    // Ola post-revisión de 3A.3 (I4): `aria-disabled` con motivo, no `disabled` — sigue en el
    // recorrido de teclado, dice por qué no se toca, y pulsarla no dispara ningún gasto.
    expect(casilla).not.toBeDisabled();
    expect(casilla).toHaveAttribute("aria-disabled", "true");
    expect(casilla).toHaveAccessibleDescription("Ya gastada; no se deshace");
  });

  it("pulsar una casilla ya gastada no manda ningún gasto", () => {
    const onGastar = vi.fn();
    render(
      <EconomiaDeAccion
        economia={{ ...ECONOMIA_INICIAL, actionUsed: true }}
        velocidad={30}
        esDm
        onGastar={onGastar}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Corregir" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "acción" }));
    expect(onGastar).not.toHaveBeenCalled();
  });

  it("sin onGastar, los controles existen igual y no rompen al pulsarlos", () => {
    render(<EconomiaDeAccion economia={ECONOMIA_INICIAL} velocidad={30} />);
    fireEvent.click(screen.getByRole("button", { name: "Mover" }));
    expect(screen.getByText("30/30 pies")).toBeInTheDocument();
  });
});
