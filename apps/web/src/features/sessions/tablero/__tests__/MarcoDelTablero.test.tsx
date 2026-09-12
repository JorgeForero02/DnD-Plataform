import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarcoDelTablero } from "../MarcoDelTablero";

describe("MarcoDelTablero", () => {
  it("enmarca la partida con la política de referrer y los permisos del portapapeles", () => {
    render(<MarcoDelTablero url="https://tablero.example/game/la-mesa" />);
    const marco = screen.getByTitle("Sala del tablero");
    expect(marco).toHaveAttribute("src", "https://tablero.example/game/la-mesa");
    expect(marco).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(marco).toHaveAttribute("allow", "clipboard-read; clipboard-write");
    // Cada jugador inicia sesión en PlanarAlly dentro del marco, una vez por navegador: se dice
    // debajo, siempre, en una línea (no es un aviso que se cierra: es cómo funciona).
    expect(screen.getByText(/inicia sesión en el tablero dentro del marco/)).toBeInTheDocument();
  });
});
