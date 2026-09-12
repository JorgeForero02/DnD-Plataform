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
    expect(screen.getByRole("button", { name: /desplegar el registro/i })).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("button", { name: /desplegar el registro/i }));
    expect(screen.getByText("hilo")).toBeVisible();
  });
});
