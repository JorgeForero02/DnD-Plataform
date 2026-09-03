import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TiradaACiegas } from "../TiradaACiegas";

// Tarea 2C.1 — **lo que ve quien tira a ciegas**, que hasta ahora era su propio resultado.
//
// El agujero se cierra en el servidor (`rolls.service.ts`: la respuesta omite el desglose), y
// esta es la mitad de pantalla: si no se dice nada, quien pulsó «Tirar» cree que la petición
// falló y vuelve a pulsar. La prueba mide las dos cosas que importan: **que lo dice** y **que no
// se le escapa el resultado**.

describe("TiradaACiegas", () => {
  it("dice que se tiró y que el resultado lo tiene el DM", () => {
    render(<TiradaACiegas etiqueta="Percepción" expresion="1d20+5" />);
    const aviso = screen.getByRole("status");
    expect(aviso).toHaveTextContent(/tirado a ciegas/i);
    expect(aviso).toHaveTextContent(/el DM ve el resultado/i);
  });

  it("enseña qué se tiró: el motivo y la expresión, que no delatan nada", () => {
    render(<TiradaACiegas etiqueta="Percepción" expresion="1d20+5" />);
    expect(screen.getByRole("status")).toHaveTextContent("Percepción · 1d20+5");
  });

  it("**no pinta ningún dado**: no hay desglose que pintar, y eso es el punto", () => {
    render(<TiradaACiegas etiqueta="Percepción" expresion="1d20+5" />);
    expect(document.querySelectorAll("[data-dado]")).toHaveLength(0);
  });
});
