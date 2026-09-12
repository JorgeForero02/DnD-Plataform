import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Field } from "../Field";

describe("Field", () => {
  it("associates the label with the control via a matching id", () => {
    render(
      <Field label="Nombre">
        <input />
      </Field>,
    );
    const input = screen.getByLabelText("Nombre");
    expect(input).toBeInTheDocument();
  });

  // Task 1.19 — this is the assertion that fails if the cloneElement wiring in Field.tsx is
  // reverted: aria-invalid and aria-describedby have to point at the real error id.
  it("wires aria-invalid and aria-describedby to the error message when there is one", () => {
    render(
      <Field label="Correo" error="El correo no es válido.">
        <input id="email" />
      </Field>,
    );
    const input = screen.getByLabelText("Correo");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBe("email-error");
    const error = screen.getByRole("alert");
    expect(error).toHaveAttribute("id", describedBy!);
    expect(error).toHaveTextContent("El correo no es válido.");
  });

  it("does not mark the control invalid when there is no error", () => {
    render(
      <Field label="Nombre">
        <input id="name" />
      </Field>,
    );
    const input = screen.getByLabelText("Nombre");
    expect(input).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("wires aria-describedby to a hint when there is no error", () => {
    render(
      <Field label="Nivel" hint="Entre 1 y 20.">
        <input id="level" />
      </Field>,
    );
    const input = screen.getByLabelText("Nivel");
    expect(input).toHaveAttribute("aria-describedby", "level-hint");
    expect(screen.getByText("Entre 1 y 20.")).toHaveAttribute("id", "level-hint");
  });

  it("con reservaEspacio, la línea de pista existe aunque no haya pista ni error (anexo #8)", () => {
    render(
      <Field label="Qué se tira" reservaEspacio>
        <input />
      </Field>,
    );
    const linea = screen.getByTestId("field-linea");
    expect(linea).toBeEmptyDOMElement();
    expect(linea.className).toMatch(/min-h-/);
  });

  it("sin reservaEspacio, no pinta la línea vacía", () => {
    render(
      <Field label="Motivo">
        <input />
      </Field>,
    );
    expect(screen.queryByTestId("field-linea")).toBeNull();
  });
});
