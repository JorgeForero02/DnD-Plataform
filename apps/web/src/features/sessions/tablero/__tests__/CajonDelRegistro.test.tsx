import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CajonDelRegistro } from "../CajonDelRegistro";

describe("CajonDelRegistro", () => {
  it("plegado, cuenta las líneas nuevas; desplegado, enseña el hilo y pone el contador a cero", () => {
    const { rerender } = render(
      <CajonDelRegistro eventos={[{ id: "b" }, { id: "a" }]}>
        <p>hilo</p>
      </CajonDelRegistro>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Registro" }));
    expect(screen.queryByText("hilo")).toBeNull();
    rerender(
      <CajonDelRegistro eventos={[{ id: "d" }, { id: "c" }, { id: "b" }, { id: "a" }]}>
        <p>hilo</p>
      </CajonDelRegistro>,
    );
    const boton = screen.getByRole("button", { name: /^Registro/ });
    expect(boton).toHaveTextContent("2");
    // MINOR #4 (revisión 2026-09-12): el contador va en el propio nombre accesible, no en un
    // `aria-label` suelto que nadie leía — sin esto, un lector de pantalla nunca oía la cifra.
    // Revisión #7 (2026-09-17): la etiqueta ya no dice «Plegar»/«Desplegar» — la punta que apunta
    // ya dice el estado, y decirlo dos veces era ruido.
    expect(boton).toHaveAccessibleName("Registro, 2 líneas nuevas");
    fireEvent.click(boton);
    expect(screen.getByText("hilo")).toBeVisible();
  });

  it("plegar antes de que cargue el registro: las líneas que llegan después cuentan como nuevas", () => {
    const { rerender } = render(<CajonDelRegistro eventos={[]}>hilo</CajonDelRegistro>);
    fireEvent.click(screen.getByRole("button", { name: "Registro" }));
    rerender(<CajonDelRegistro eventos={[{ id: "e2" }, { id: "e1" }]}>hilo</CajonDelRegistro>);
    expect(screen.getByRole("button", { name: "Registro, 2 líneas nuevas" })).toBeInTheDocument();
  });
});
