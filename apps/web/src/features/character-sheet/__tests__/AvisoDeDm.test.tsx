import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AvisoDeDm } from "../AvisoDeDm";
import * as members from "../../campaigns/members";

// Task 5 (2026-09-19) — el párrafo «Vista de DM: puedes anular a mano N valores…» se sustituye
// por un botón que lleva hasta la tarjeta «Anulaciones del DM» (`Anulaciones.tsx`): el texto
// explicativo se queda, pero como `aria-describedby`, no como el único contenido del aviso.

function montarComoRol(role: "DM" | "PLAYER") {
  vi.spyOn(members, "useMyRole").mockReturnValue({
    role,
    isLoading: false,
    isError: false,
    retry: () => {},
  });
  return render(<AvisoDeDm campaignId="c1" />);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("AvisoDeDm", () => {
  it("un jugador no ve nada", () => {
    montarComoRol("PLAYER");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("el DM ve un botón con el número de valores anulables, no un párrafo suelto", () => {
    montarComoRol("DM");
    const boton = screen.getByRole("button", { name: /^Anulaciones del DM \(\d+\)$/ });
    expect(boton).toHaveAccessibleDescription(/Vista de DM: puedes anular a mano/);
  });

  it("pulsar el botón enfoca el primer control de la tarjeta «Anulaciones del DM»", () => {
    montarComoRol("DM");
    // La tarjeta real vive en otra pestaña (`Anulaciones.tsx`); aquí se monta un doble mínimo con
    // el mismo `aria-label` que pinta `TarjetaDeHoja` — es el mismo contrato que ya usa
    // `enfocarCausa` en `Traza.tsx` para saltar entre componentes que no comparten padre directo.
    const doble = document.createElement("section");
    doble.setAttribute("aria-label", "anulaciones del DM");
    const input = document.createElement("select");
    doble.appendChild(input);
    document.body.appendChild(doble);

    fireEvent.click(screen.getByRole("button", { name: /^Anulaciones del DM/ }));
    expect(input).toHaveFocus();

    doble.remove();
  });
});
