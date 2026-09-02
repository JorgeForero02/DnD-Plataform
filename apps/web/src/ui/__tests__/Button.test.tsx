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
    expect(button).toBeDisabled();
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
