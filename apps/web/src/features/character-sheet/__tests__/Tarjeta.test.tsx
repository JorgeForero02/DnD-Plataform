import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TarjetaDeHoja } from "../Tarjeta";

// Pulido 2026-09-12 — `TarjetaDeHoja` gana un `pie` opcional: cabecera · cuerpo · pie, con un
// solo filete entre cada dos. `footer` dentro de `section` no tiene rol implícito, así que se
// afirma por `getByText` y no por `getByRole("contentinfo")`.
describe("TarjetaDeHoja", () => {
  it("sin pie, no pinta ningún footer", () => {
    render(<TarjetaDeHoja titulo="Salvaciones">contenido</TarjetaDeHoja>);
    expect(screen.queryByText("pie de prueba")).not.toBeInTheDocument();
  });

  it("con pie, lo pinta separado del cuerpo por su propio filete", () => {
    render(
      <TarjetaDeHoja titulo="Salvaciones" pie={<span>pie de prueba</span>}>
        contenido
      </TarjetaDeHoja>,
    );
    expect(screen.getByText("pie de prueba")).toBeInTheDocument();
  });
});
