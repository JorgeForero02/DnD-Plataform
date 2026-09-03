import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RollResult } from "@dnd/shared";
import { ResultadoDeTirada } from "../ResultadoDeTirada";

// **Ver el dado que se cayó es media gracia de tener ventaja.** Estas pruebas comprueban que el
// descartado sigue en pantalla, identificable y anunciado — no que esté tachado: el tachado es
// maquetación, jsdom no maqueta, y eso se mide en el navegador.

function tirada(parcial: Partial<RollResult> = {}): RollResult {
  return {
    eventId: "e1",
    expression: "2d20kh1+3",
    rolls: [8, 17],
    kept: [17],
    dropped: [8],
    modifier: 3,
    total: 20,
    natural: "NONE",
    outcome: "NO_DC",
    ...parcial,
  };
}

describe("ResultadoDeTirada", () => {
  it("pinta los DOS dados y marca cuál se descartó", () => {
    render(<ResultadoDeTirada resultado={tirada()} etiqueta="Percepción" />);
    const dados = document.querySelectorAll("[data-dado]");
    expect(dados).toHaveLength(2);
    expect(dados[0]).toHaveAttribute("data-dado", "descartado");
    expect(dados[0]).toHaveTextContent("8");
    expect(dados[1]).toHaveAttribute("data-dado", "conservado");
    expect(dados[1]).toHaveTextContent("17");
  });

  it("dice cuál se queda, y lo saca de la expresión que el servidor tiró", () => {
    render(<ResultadoDeTirada resultado={tirada()} etiqueta="Percepción" />);
    expect(screen.getByText("se queda el alto")).toBeInTheDocument();

    // Desventaja: la misma tirada con `kl`. El rótulo cambia porque cambia lo que pasó, no
    // porque el cliente recuerde qué pidió.
    render(
      <ResultadoDeTirada
        resultado={tirada({ expression: "2d20kl1+3", kept: [8], dropped: [17], total: 11 })}
        etiqueta="Sigilo"
      />,
    );
    expect(screen.getByText("se queda el bajo")).toBeInTheDocument();
  });

  it("una tirada normal no promete que se descarte nada", () => {
    render(
      <ResultadoDeTirada
        resultado={tirada({
          expression: "1d20+3",
          rolls: [12],
          kept: [12],
          dropped: [],
          total: 15,
        })}
        etiqueta="Percepción"
      />,
    );
    expect(screen.queryByText(/se queda el/)).not.toBeInTheDocument();
    expect(document.querySelectorAll("[data-dado]")).toHaveLength(1);
  });

  it("el desglose de la suma está siempre, nunca un número solo", () => {
    render(<ResultadoDeTirada resultado={tirada()} etiqueta="Percepción" />);
    expect(screen.getByText("20 = 17 dado +3 percepción")).toBeInTheDocument();
  });

  it("el 20 natural se marca con una palabra", () => {
    render(
      <ResultadoDeTirada
        resultado={tirada({
          rolls: [3, 20],
          kept: [20],
          dropped: [3],
          total: 23,
          natural: "TWENTY",
        })}
        etiqueta="Percepción"
      />,
    );
    expect(screen.getByText("Crítico")).toBeInTheDocument();
  });

  it("el 1 natural también, y con la suya", () => {
    render(
      <ResultadoDeTirada
        resultado={tirada({ rolls: [1, 4], kept: [1], dropped: [4], total: 4, natural: "ONE" })}
        etiqueta="Percepción"
      />,
    );
    expect(screen.getByText("Pifia")).toBeInTheDocument();
  });

  it("sin natural no se marca nada", () => {
    render(<ResultadoDeTirada resultado={tirada()} etiqueta="Percepción" />);
    expect(screen.queryByText("Crítico")).not.toBeInTheDocument();
    expect(screen.queryByText("Pifia")).not.toBeInTheDocument();
  });

  it("ninguna enumeración del servidor llega a la pantalla", () => {
    const { container } = render(
      <ResultadoDeTirada
        resultado={tirada({ natural: "TWENTY", dc: 15, outcome: "SUCCESS" })}
        etiqueta="Percepción"
      />,
    );
    for (const enumeracion of ["TWENTY", "ONE", "NONE", "SUCCESS", "FAILURE", "NO_DC"]) {
      expect(container.textContent).not.toContain(enumeracion);
    }
    expect(screen.getByText("Supera la CD 15.")).toBeInTheDocument();
  });

  it("el dado se dibuja: SVG, nunca un emoji de dado", () => {
    const { container } = render(<ResultadoDeTirada resultado={tirada()} etiqueta="Percepción" />);
    expect(container.querySelectorAll('svg[data-icono="dado"]')).toHaveLength(2);
  });
});
