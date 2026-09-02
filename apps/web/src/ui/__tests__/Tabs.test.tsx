import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs } from "../Tabs";

const ITEMS = [
  { id: "resumen", label: "Resumen", content: <p>Contenido de resumen</p> },
  { id: "npcs", label: "NPCs", content: <p>Contenido de NPCs</p> },
  { id: "sesiones", label: "Sesiones", content: <p>Contenido de sesiones</p> },
];

describe("Tabs", () => {
  it("shows the first tab's panel by default and switches on click", () => {
    render(<Tabs items={ITEMS} />);
    expect(screen.getByText("Contenido de resumen")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "NPCs" }));
    expect(screen.getByText("Contenido de NPCs")).toBeInTheDocument();
    expect(screen.queryByText("Contenido de resumen")).not.toBeInTheDocument();
  });

  it("marks the active tab with aria-selected and only it is Tab-reachable", () => {
    render(<Tabs items={ITEMS} />);
    const resumen = screen.getByRole("tab", { name: "Resumen" });
    const npcs = screen.getByRole("tab", { name: "NPCs" });
    expect(resumen).toHaveAttribute("aria-selected", "true");
    expect(resumen).toHaveAttribute("tabIndex", "0");
    expect(npcs).toHaveAttribute("aria-selected", "false");
    expect(npcs).toHaveAttribute("tabIndex", "-1");
  });

  // Task 1.19 — keyboard navigation is the requirement named in the brief. Revert the
  // handleKeyDown wiring in Tabs.tsx and these fail while a mouse click still switches tabs.
  it("moves selection with ArrowRight and wraps past the last tab", () => {
    render(<Tabs items={ITEMS} />);
    const resumen = screen.getByRole("tab", { name: "Resumen" });
    resumen.focus();
    fireEvent.keyDown(resumen, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "NPCs" })).toHaveFocus();
    expect(screen.getByText("Contenido de NPCs")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("tab", { name: "NPCs" }), { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByRole("tab", { name: "Sesiones" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Resumen" })).toHaveFocus();
  });

  it("moves selection with ArrowLeft and wraps before the first tab", () => {
    render(<Tabs items={ITEMS} />);
    const resumen = screen.getByRole("tab", { name: "Resumen" });
    resumen.focus();
    fireEvent.keyDown(resumen, { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Sesiones" })).toHaveFocus();
  });

  it("jumps to the last tab on End and back to the first on Home", () => {
    render(<Tabs items={ITEMS} />);
    const resumen = screen.getByRole("tab", { name: "Resumen" });
    resumen.focus();
    fireEvent.keyDown(resumen, { key: "End" });
    const sesiones = screen.getByRole("tab", { name: "Sesiones" });
    expect(sesiones).toHaveFocus();
    fireEvent.keyDown(sesiones, { key: "Home" });
    expect(screen.getByRole("tab", { name: "Resumen" })).toHaveFocus();
  });

  it("supports controlled active + onChange", () => {
    let active = "npcs";
    const onChange = (id: string) => {
      active = id;
    };
    const { rerender } = render(<Tabs items={ITEMS} active={active} onChange={onChange} />);
    expect(screen.getByText("Contenido de NPCs")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Sesiones" }));
    rerender(<Tabs items={ITEMS} active={active} onChange={onChange} />);
    expect(screen.getByText("Contenido de sesiones")).toBeInTheDocument();
  });
});
