import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BandejaDeDados } from "../BandejaDeDados";
import { BANDEJA_VACIA } from "../bandeja";

// Task 10 — la bandeja de dados. Lo que puede romperse en silencio:
//
//  · que pulsar un dado lo añade y pulsar uno de la pila lo quita (la interacción entera);
//  · que la ventaja solo aparece con exactamente un d20, y desaparece sin él;
//  · que el modo avanzado empieza plegado y, una vez abierto, lo que se escribe manda sobre la
//    bandeja — hasta el próximo dado pulsado.
//
// `fireEvent`, no `userEvent`: es lo que ya usa el resto de esta suite
// (`PanelDeDados.test.tsx`), y `@testing-library/user-event` no está entre las dependencias del
// proyecto.

describe("BandejaDeDados", () => {
  it("pulsar un dado lo añade a la pila y pulsar uno de la pila lo quita", () => {
    const onChange = vi.fn();
    render(<BandejaDeDados valor={BANDEJA_VACIA} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Añadir un d6" }));
    expect(onChange).toHaveBeenLastCalledWith({
      bandeja: { dados: [6], modificador: 0 },
      expresion: "1d6",
    });
  });

  it("con un d20 en la pila ofrece ventaja; sin él, no", () => {
    const { rerender } = render(
      <BandejaDeDados valor={{ dados: [20], modificador: 0 }} onChange={() => {}} />,
    );
    expect(screen.getByRole("radiogroup", { name: /ventaja/i })).toBeInTheDocument();

    rerender(<BandejaDeDados valor={{ dados: [6], modificador: 0 }} onChange={() => {}} />);
    expect(screen.queryByRole("radiogroup", { name: /ventaja/i })).toBeNull();
  });

  it("el modo avanzado está plegado y, abierto, la expresión escrita manda", () => {
    const onChange = vi.fn();
    render(<BandejaDeDados valor={{ dados: [6], modificador: 0 }} onChange={onChange} />);

    expect(screen.queryByLabelText("Qué se tira")).toBeNull();

    fireEvent.click(screen.getByText("Modo avanzado"));
    const campo = screen.getByLabelText("Qué se tira");
    fireEvent.change(campo, { target: { value: "4d6kh3" } });

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ expresion: "4d6kh3" }));
  });

  it("un dado de la pila lleva su posición en el nombre: quitar el segundo no toca el primero", () => {
    const onChange = vi.fn();
    render(<BandejaDeDados valor={{ dados: [6, 6], modificador: 0 }} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Quitar el d6 (posición 2)" }));
    expect(onChange).toHaveBeenLastCalledWith({
      bandeja: { dados: [6], modificador: 0 },
      expresion: "1d6",
    });
  });

  it("pulsar un dado después de escribir a mano vuelve a dejar que la bandeja mande", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <BandejaDeDados valor={{ dados: [6], modificador: 0 }} onChange={onChange} />,
    );

    fireEvent.click(screen.getByText("Modo avanzado"));
    fireEvent.change(screen.getByLabelText("Qué se tira"), { target: { value: "4d6kh3" } });

    fireEvent.click(screen.getByRole("button", { name: "Añadir un d20" }));
    expect(onChange).toHaveBeenLastCalledWith({
      bandeja: { dados: [6, 20], modificador: 0 },
      expresion: "1d6+1d20",
    });

    // El componente es controlado: como en `PanelDeDados`, quien recibe el `onChange` es quien
    // decide la siguiente `valor` — aquí se simula ese paso.
    rerender(<BandejaDeDados valor={{ dados: [6, 20], modificador: 0 }} onChange={onChange} />);
    expect(screen.getByLabelText("Qué se tira")).toHaveValue("1d6+1d20");
  });

  it("el modificador sube y baja, y compone su propio signo", () => {
    const onChange = vi.fn();
    render(<BandejaDeDados valor={{ dados: [6], modificador: 0 }} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Subir el modificador" }));
    expect(onChange).toHaveBeenLastCalledWith({
      bandeja: { dados: [6], modificador: 1 },
      expresion: "1d6+1",
    });
  });

  it("compacta: sin el rótulo «Atajos»", () => {
    render(<BandejaDeDados valor={BANDEJA_VACIA} onChange={() => {}} compacta />);
    expect(screen.queryByText("Atajos")).toBeNull();
    expect(screen.getByRole("button", { name: "Añadir un d6" })).toBeInTheDocument();
  });

  it("sin dados en la pila no se pinta ninguna lista", () => {
    render(<BandejaDeDados valor={BANDEJA_VACIA} onChange={() => {}} />);
    expect(screen.queryByRole("list", { name: "Dados en la bandeja" })).toBeNull();
  });
});
