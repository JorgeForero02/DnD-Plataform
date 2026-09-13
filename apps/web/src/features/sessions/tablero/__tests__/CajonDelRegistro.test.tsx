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
    fireEvent.click(screen.getByRole("button", { name: /plegar el registro/i }));
    expect(screen.queryByText("hilo")).toBeNull();
    rerender(
      <CajonDelRegistro eventos={[{ id: "d" }, { id: "c" }, { id: "b" }, { id: "a" }]}>
        <p>hilo</p>
      </CajonDelRegistro>,
    );
    const boton = screen.getByRole("button", { name: /desplegar el registro/i });
    expect(boton).toHaveTextContent("2");
    // MINOR #4 (revisión 2026-09-12): el contador va en el propio nombre accesible, no en un
    // `aria-label` suelto que nadie leía — sin esto, un lector de pantalla nunca oía la cifra.
    expect(boton).toHaveAccessibleName("Desplegar el registro, 2 líneas nuevas");
    fireEvent.click(boton);
    expect(screen.getByText("hilo")).toBeVisible();
  });
});
