import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { Dialog } from "../Dialog";

// Fix round 1, Important 3: reproduces the real-world shape — a parent that re-renders for a
// reason that has nothing to do with the dialog (here, an unrelated counter), passing onClose
// as a fresh inline arrow every render, exactly like every real consumer of Dialog does.
function ReRenderHarness() {
  const [open, setOpen] = useState(true);
  const [tick, setTick] = useState(0);
  return (
    <div>
      <button onClick={() => setTick((t) => t + 1)}>Re-render externo</button>
      <p>tick: {tick}</p>
      <Dialog open={open} onClose={() => setOpen(false)} title="Formulario">
        <input aria-label="Campo uno" />
        <input aria-label="Campo dos" />
      </Dialog>
    </div>
  );
}

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Abrir</button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Confirmar">
        <button>Primero</button>
        <button>Segundo</button>
      </Dialog>
    </div>
  );
}

describe("Dialog", () => {
  it("does not render when closed", () => {
    render(
      <Dialog open={false} onClose={vi.fn()} title="X">
        contenido
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders with role dialog, aria-modal, and its title when open", () => {
    render(
      <Dialog open onClose={vi.fn()} title="Confirmar borrado">
        contenido
      </Dialog>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Confirmar borrado")).toBeInTheDocument();
  });

  // Task 1.19 — the three behaviours the brief names explicitly. Each assertion below fails on
  // its own if the corresponding piece of Dialog.tsx's useEffect is removed.
  it("moves focus into the dialog on open and returns it to the trigger on close", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Abrir" });
    trigger.focus();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "Primero" })).toHaveFocus();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("calls onClose on Escape", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="X">
        <button>Uno</button>
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  // Ola 0 (2026-09-04) — **el ciclo del foco empieza en el aspa, no en el contenido.** Al pasar
  // de cuadro centrado a cajón lateral, el chasis ganó un botón «Cerrar (Escape)» en su cabecera,
  // y en orden del DOM va antes que todo lo que le pasen dentro. El foco atrapado es el mismo —lo
  // que se comprueba aquí es que Tab no se escapa del cajón—, pero el PRIMER foco del ciclo pasó
  // a ser el aspa. No es un detalle de marcado: un cajón que no se puede cerrar con el teclado
  // sin pasar por Escape sería peor accesible, no mejor.
  it("traps Tab focus: Tab from the last focusable wraps to the first", () => {
    render(
      <Dialog open onClose={vi.fn()} title="X">
        <button>Primero</button>
        <button>Segundo</button>
      </Dialog>,
    );
    const aspa = screen.getByRole("button", { name: "Cerrar (Escape)" });
    const second = screen.getByRole("button", { name: "Segundo" });
    second.focus();
    expect(second).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(aspa).toHaveFocus();
  });

  it("traps Shift+Tab focus: Shift+Tab from the first focusable wraps to the last", () => {
    render(
      <Dialog open onClose={vi.fn()} title="X">
        <button>Primero</button>
        <button>Segundo</button>
      </Dialog>,
    );
    const aspa = screen.getByRole("button", { name: "Cerrar (Escape)" });
    const second = screen.getByRole("button", { name: "Segundo" });
    aspa.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(second).toHaveFocus();
  });

  // Y la contrapartida, que es lo que de verdad se decidió: **el foco ENTRA en el contenido, no
  // en el aspa.** Si cayera sobre «Cerrar», abrir un formulario dejaría el cursor sobre el botón
  // que lo cierra y el primer Enter desharía el gesto que acabas de hacer.
  it("el foco inicial va al primer control del CUERPO, no al aspa de cerrar", () => {
    render(
      <Dialog open onClose={vi.fn()} title="X">
        <button>Primero</button>
        <button>Segundo</button>
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "Primero" })).toHaveFocus();
  });

  // El cajón trae dos ranuras que el cuadro centrado no tenía. Sin esta prueba, quitarlas del
  // chasis no rompe nada visible hasta que alguien abre la pantalla que las usaba.
  it("pinta el subtítulo y el pie de acciones cuando se los pasan", () => {
    render(
      <Dialog
        open
        onClose={vi.fn()}
        title="X"
        subtitulo="Nivel 6 · competencia +3"
        acciones={<button>Guardar en el mundo</button>}
      >
        contenido
      </Dialog>,
    );
    expect(screen.getByText("Nivel 6 · competencia +3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar en el mundo" })).toBeInTheDocument();
  });

  // Fix round 1, Important 3 — the bug: the old useEffect deps were [open, onClose], and every
  // consumer passes onClose as an inline arrow (a fresh function every render), so a parent
  // re-render while the dialog stayed open tore the effect down and rebuilt it — the cleanup
  // yanked focus back to the trigger, then the effect immediately refocused the dialog's FIRST
  // control. A user typing in the second field of a dialog form would lose focus to the first
  // field on every keystroke that re-rendered the parent. This fails on the old deps array and
  // passes once onClose lives in a ref and the effect depends on [open] alone.
  it("keeps focus in place across a parent re-render while the dialog stays open", () => {
    render(<ReRenderHarness />);
    const second = screen.getByLabelText("Campo dos");
    second.focus();
    expect(second).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Re-render externo" }));
    expect(screen.getByText("tick: 1")).toBeInTheDocument();

    expect(second).toHaveFocus();
  });
});

// --- Ficha U8 (plan 14) — cerrar con cambios sin guardar pregunta ---
//
// `Escape`, el clic en el velo y el aspa **descartaban lo escrito sin decir nada**. Con el cuerpo
// de una ficha dentro, eso es perder trabajo, y las tres salidas son igual de fáciles de rozar.
//
// **Y la mitad que se olvida**: el aviso NO debe saltar cuando no hay cambios. Uno que salta
// siempre se aprende a descartar sin leer en dos días, y entonces tampoco protege el día que sí.

describe("cerrar con cambios sin guardar (U8)", () => {
  function montar(hayCambios: boolean, onClose = vi.fn()) {
    render(
      <Dialog open onClose={onClose} title="Escribir ficha" hayCambiosSinGuardar={hayCambios}>
        <p>cuerpo</p>
      </Dialog>,
    );
    return onClose;
  }

  it("**sin cambios NO avisa**: Escape cierra directamente", () => {
    const onClose = montar(false);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("con cambios, **las tres salidas preguntan**: Escape, el velo y el aspa", () => {
    // Si una sola se saltara la pregunta, bastaría con rozarla para perder lo escrito — y sería
    // justo la que nadie prueba.
    for (const salir of [
      () => fireEvent.keyDown(document, { key: "Escape" }),
      () => fireEvent.click(screen.getByRole("presentation")),
      () => fireEvent.click(screen.getByRole("button", { name: /Cerrar/ })),
    ]) {
      const onClose = vi.fn();
      const { unmount } = render(
        <Dialog open onClose={onClose} title="Escribir ficha" hayCambiosSinGuardar>
          <p>cuerpo</p>
        </Dialog>,
      );
      salir();
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      unmount();
    }
  });

  it("**nombra lo que se pierde, y nunca dice «seguro»**", () => {
    montar(true);
    fireEvent.keyDown(document, { key: "Escape" });
    const aviso = screen.getByRole("alertdialog");
    expect(aviso).toHaveTextContent(/no se ha guardado/i);
    expect(aviso).toHaveTextContent(/se pierde/i);
    // «Seguro» se pulsa sin leer, y además tranquiliza justo cuando no toca.
    expect(aviso.textContent ?? "").not.toMatch(/seguro/i);
  });

  it("«Seguir escribiendo» no cierra; «Salir y perderlo» sí", () => {
    const onClose = montar(true);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Seguir escribiendo" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Salir y perderlo" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
