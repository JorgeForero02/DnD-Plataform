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

  it("traps Tab focus: Tab from the last focusable wraps to the first", () => {
    render(
      <Dialog open onClose={vi.fn()} title="X">
        <button>Primero</button>
        <button>Segundo</button>
      </Dialog>,
    );
    const first = screen.getByRole("button", { name: "Primero" });
    const second = screen.getByRole("button", { name: "Segundo" });
    second.focus();
    expect(second).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(first).toHaveFocus();
  });

  it("traps Shift+Tab focus: Shift+Tab from the first focusable wraps to the last", () => {
    render(
      <Dialog open onClose={vi.fn()} title="X">
        <button>Primero</button>
        <button>Segundo</button>
      </Dialog>,
    );
    const first = screen.getByRole("button", { name: "Primero" });
    const second = screen.getByRole("button", { name: "Segundo" });
    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(second).toHaveFocus();
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
