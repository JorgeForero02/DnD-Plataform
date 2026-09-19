import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BandejaDeDados } from "../BandejaDeDados";
import { BANDEJA_VACIA } from "../bandeja";

// Task 10 — la bandeja de dados. Lo que puede romperse en silencio:
//
//  · que pulsar un dado lo añade y pulsar uno de la pila lo quita (la interacción entera);
//  · que la ventaja solo aparece con exactamente un d20 **al principio de lo que de verdad se
//    manda** — de la bandeja si manda ella, del propio texto si manda el campo — porque el
//    servidor solo reescribe un `d20` en cabeza de expresión (`conVentaja`);
//  · que el modo avanzado empieza plegado y, una vez abierto, lo que se escribe manda sobre la
//    bandeja — hasta el próximo dado pulsado o hasta que se pliega.
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

  // Round 2 de revisión (anexo #8) — **el radio se queda montado siempre**, apagado cuando no
  // se puede: el anexo #8 (espacio reservado) prohíbe que un control aparezca/desaparezca y
  // mueva la tarjeta. `queryByRole` con `null` sería el defecto que esta ronda arregló.
  it("con un d20 en la pila ofrece ventaja habilitada; sin él, se apaga con su motivo", () => {
    const { rerender } = render(
      <BandejaDeDados valor={{ dados: [20], modificador: 0 }} onChange={() => {}} />,
    );
    expect(screen.getByRole("group", { name: /cómo tirar/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Normal" })).toBeEnabled();

    rerender(<BandejaDeDados valor={{ dados: [6], modificador: 0 }} onChange={() => {}} />);
    // Sigue montado — no desaparece — pero apagado, y con el motivo a la vista.
    expect(screen.getByRole("group", { name: /cómo tirar/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Normal" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Solo con un d20 al principio de la tirada.")).toBeInTheDocument();
  });

  // Round 1 de revisión (IMPORTANT #1) — el defecto de verdad: un d6 pulsado antes que el d20
  // compone (sin el arreglo) `1d6+1d20`, que el servidor tira normal — `conVentaja` solo
  // reescribe un `d20` al principio. Con el arreglo, `expresionDeBandeja` pone el d20 primero, y
  // el radio de ventaja sigue ofreciéndose porque sigue siendo cierto que se cumplirá.
  it("d6 y luego d20: la bandeja compone el d20 primero, y la ventaja se ofrece de verdad", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <BandejaDeDados valor={{ dados: [6], modificador: 0 }} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Añadir un d20" }));
    expect(onChange).toHaveBeenLastCalledWith({
      bandeja: { dados: [6, 20], modificador: 0 },
      expresion: "1d20+1d6",
    });

    // Controlado: se simula que el panel recibió el `onChange` y pasó la bandeja nueva.
    rerender(<BandejaDeDados valor={{ dados: [6, 20], modificador: 0 }} onChange={onChange} />);
    expect(screen.getByRole("group", { name: /cómo tirar/i })).toBeInTheDocument();
  });

  // Round 1 (IMPORTANT #1, segunda mitad) — **con el texto al mando, el radio depende del
  // texto**, no de la bandeja: la bandeja de debajo sí tendría un solo d20 (ofrecería ventaja
  // por sí sola), pero lo que de verdad se manda al tirar es lo escrito, y `1d6+1d20` no la
  // ofrece nunca en el servidor.
  it("con el texto al mando, el radio depende de lo escrito y no de la bandeja de debajo", () => {
    render(<BandejaDeDados valor={{ dados: [20], modificador: 0 }} onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "Normal" })).toBeEnabled();

    fireEvent.click(screen.getByText("Modo avanzado"));
    fireEvent.change(screen.getByLabelText("Qué se tira"), { target: { value: "1d6+1d20" } });
    // Sigue montado, apagado — no desmontado: es justo lo que el anexo #8 exige.
    expect(screen.getByRole("group", { name: /cómo tirar/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Normal" })).toHaveAttribute("aria-disabled", "true");

    fireEvent.change(screen.getByLabelText("Qué se tira"), { target: { value: "1d20+3" } });
    expect(screen.getByRole("radio", { name: "Normal" })).toBeEnabled();
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

  // Round 1 de revisión (IMPORTANT #2) — **plegar también devuelve el control a la bandeja.**
  // Sin el arreglo, el `onChange` seguía mandando `4d6kh3` aunque el campo que lo explicaba ya
  // no estuviera a la vista — una fuente escondida que nadie podía ver ni corregir.
  it("plegar el modo avanzado después de escribir devuelve el control a la bandeja", () => {
    const onChange = vi.fn();
    render(<BandejaDeDados valor={{ dados: [6], modificador: 0 }} onChange={onChange} />);

    fireEvent.click(screen.getByText("Modo avanzado"));
    fireEvent.change(screen.getByLabelText("Qué se tira"), { target: { value: "4d6kh3" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ expresion: "4d6kh3" }));

    // Se pliega: el mismo rótulo, un segundo clic.
    fireEvent.click(screen.getByText("Modo avanzado"));
    expect(onChange).toHaveBeenLastCalledWith({
      bandeja: { dados: [6], modificador: 0 },
      expresion: "1d6",
    });
    expect(screen.queryByLabelText("Qué se tira")).toBeNull();
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
      // El d20 se pulsó el último y aun así abre la expresión: `expresionDeBandeja` lo antepone
      // porque hay exactamente uno (round 1, IMPORTANT #1).
      expresion: "1d20+1d6",
    });

    // El componente es controlado: como en `PanelDeDados`, quien recibe el `onChange` es quien
    // decide la siguiente `valor` — aquí se simula ese paso.
    rerender(<BandejaDeDados valor={{ dados: [6, 20], modificador: 0 }} onChange={onChange} />);
    expect(screen.getByLabelText("Qué se tira")).toHaveValue("1d20+1d6");
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

  // Round 1 de revisión (extra pedido) — **quitar el d20 no deja `modo` pegado en Ventaja.** Sin
  // el arreglo, `onModoChange` nunca se llamaba y el próximo «Tirar» habría mandado
  // `mode: "ADVANTAGE"` sin que ningún control en pantalla lo explicara.
  it("quitar el d20 (o dejar de escribirlo) devuelve el modo a Normal", () => {
    const onModoChange = vi.fn();
    const { rerender } = render(
      <BandejaDeDados
        valor={{ dados: [20], modificador: 0 }}
        onChange={() => {}}
        modo="ADVANTAGE"
        onModoChange={onModoChange}
      />,
    );
    expect(onModoChange).not.toHaveBeenCalled();

    rerender(
      <BandejaDeDados
        valor={{ dados: [6], modificador: 0 }}
        onChange={() => {}}
        modo="ADVANTAGE"
        onModoChange={onModoChange}
      />,
    );
    expect(onModoChange).toHaveBeenCalledWith("NORMAL");
  });

  // Round 1 de revisión (anexo #10, IMPORTANT #3) — **la pila no es un atajo más**: rótulo
  // propio y distinguible de la fila de botones de arriba.
  it("la pila lleva su propio rótulo, distinto de «Atajos»", () => {
    render(<BandejaDeDados valor={{ dados: [6, 6], modificador: 0 }} onChange={() => {}} />);
    expect(screen.getByText(/En la bandeja/)).toBeInTheDocument();
    expect(screen.getByText("En la bandeja · 2 dados")).toBeInTheDocument();
  });

  it("compacta: sin el rótulo «Atajos»", () => {
    render(<BandejaDeDados valor={BANDEJA_VACIA} onChange={() => {}} compacta />);
    expect(screen.queryByText("Atajos")).toBeNull();
    expect(screen.getByRole("button", { name: "Añadir un d6" })).toBeInTheDocument();
  });

  // Revisión final del pulido (2026-09-13) — **`SelectorDeVentaja` con `disabled` nativo dejaba
  // los radios apagados inalcanzables por teclado**, y la línea de motivo no estaba enlazada por
  // `aria-describedby`. Apagado es `aria-disabled`, nunca `disabled`: el control sigue en la
  // secuencia de tabulación, solo que no hace nada y dice por qué.
  it("apagado, el radio sigue alcanzable por teclado, dice por qué y no cambia el modo", () => {
    const onModoChange = vi.fn();
    render(
      <BandejaDeDados
        valor={{ dados: [6], modificador: 0 }}
        onChange={() => {}}
        modo="NORMAL"
        onModoChange={onModoChange}
      />,
    );
    const radio = screen.getByRole("radio", { name: "Ventaja" });
    expect(radio).not.toBeDisabled();
    expect(radio).toHaveAttribute("aria-disabled", "true");
    expect(
      screen.getByRole("group", { name: "Cómo tirar esta tirada" }),
    ).toHaveAccessibleDescription("Solo con un d20 al principio de la tirada.");
    fireEvent.click(radio);
    expect(onModoChange).not.toHaveBeenCalled();
  });

  it("sin dados en la pila no se pinta ninguna lista", () => {
    render(<BandejaDeDados valor={BANDEJA_VACIA} onChange={() => {}} />);
    expect(screen.queryByRole("list", { name: "Dados en la bandeja" })).toBeNull();
    expect(screen.queryByText(/En la bandeja/)).toBeNull();
  });
});
