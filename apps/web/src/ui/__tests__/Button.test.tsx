import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "../Button";

describe("Button", () => {
  it("renders its label and fires onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Guardar</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  // The app disables rather than hides controls the server would reject (docs/07-historial.md,
  // 1.15) — a disabled button must keep its label in the accessibility tree and must not fire.
  it("stays disabled, keeps its label, and does not fire onClick", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick} title="Solo el DM puede.">
        Borrar
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Borrar" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAccessibleName("Borrar");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  // Disabled buttons must not fade the label to near-invisible (the brief's explicit rule) —
  // check that the disabled treatment is the muted-text-on-surface pair, not an opacity fade
  // applied to the whole button (which would also dim the text).
  it("does not apply an opacity fade to a disabled button", () => {
    render(
      <Button disabled variant="primary">
        Borrar
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Borrar" });
    expect(button.className).not.toMatch(/opacity-/);
    expect(button.className).toContain("text-muted");
  });

  it.each(["primary", "secondary", "ghost", "danger"] as const)(
    "renders the %s variant without a literal colour class",
    (variant) => {
      render(<Button variant={variant}>Acción</Button>);
      const button = screen.getByRole("button", { name: "Acción" });
      // The project rule: no hex, no rgb(), no Tailwind default palette class anywhere.
      expect(button.className).not.toMatch(/#[0-9a-fA-F]{3,8}/);
      expect(button.className).not.toMatch(/rgb\(/);
      expect(button.className).not.toMatch(/-(slate|gray|zinc|neutral|stone|red|green|blue)-/);
    },
  );
});

// --- Ficha U9 (plan 14) — el botón apagado sigue siendo alcanzable ---
//
// Este producto **deshabilita en vez de esconder**, y escribe el motivo. La medición del 2026-09-05
// encontró **cero usos de `aria-disabled` en toda la web**: con `disabled` de verdad, el botón sale
// del recorrido de teclado, así que quien navega con teclado o con lector **no llega a él ni al
// motivo**. El botón informaba a quien mira y ocultaba la información a quien no.

describe("un botón apagado sigue alcanzable (U9)", () => {
  it("**no lleva `disabled`**, lleva `aria-disabled`, y por eso conserva el foco", () => {
    render(
      <Button disabled title="Solo el DM puede hacer esto.">
        Nuevo
      </Button>,
    );
    const boton = screen.getByRole("button", { name: "Nuevo" });
    expect(boton).toHaveAttribute("aria-disabled", "true");
    expect(boton).not.toHaveAttribute("disabled");

    // **La prueba de verdad**: un `<button disabled>` no puede recibir el foco. Este sí.
    boton.focus();
    expect(document.activeElement).toBe(boton);
    // Y su motivo viaja con él, que es lo que el foco existe para poder leer.
    expect(boton).toHaveAttribute("title", "Solo el DM puede hacer esto.");
  });

  it("**y aun así no hace nada al pulsarlo**: `aria-disabled` no impide el clic, el código sí", () => {
    // Sin esta mitad, el botón haría exactamente lo que dice que no puede hacer — que es peor que
    // el problema que U9 arregla.
    const alPulsar = vi.fn();
    render(
      <Button disabled onClick={alPulsar}>
        Nuevo
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Nuevo" }));
    expect(alPulsar).not.toHaveBeenCalled();
  });

  it("habilitado, pulsa como siempre", () => {
    const alPulsar = vi.fn();
    render(<Button onClick={alPulsar}>Nuevo</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Nuevo" }));
    expect(alPulsar).toHaveBeenCalledTimes(1);
  });
});
