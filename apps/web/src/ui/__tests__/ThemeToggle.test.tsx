import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "../ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("reflects the current theme and offers to switch to the other one", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    render(<ThemeToggle />);
    expect(
      screen.getByRole("button", { name: "Cambiar a tema claro (pergamino)" }),
    ).toBeInTheDocument();
  });

  // Task 1.19, fix round 1, Important 8 — this test renders ThemeToggle directly, so it
  // proves the component's own click → setTheme → re-render wiring, not that anything mounts
  // it anywhere. Fix round 2: ThemeToggle is mounted on /design-tokens only (not app-wide, see
  // App.tsx and the report) — no RTL test exercises that mount point today, the same way none
  // exercises DesignTokensPage's other primitives; Playwright's contrast spec is what actually
  // renders /design-tokens and would be what breaks if the mount were removed there.
  it("clicking switches the theme, persists it, and updates its own label", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: "Cambiar a tema claro (pergamino)" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("dnd-theme")).toBe("light");
    expect(screen.getByRole("button", { name: "Cambiar a tema oscuro" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cambiar a tema oscuro" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("dnd-theme")).toBe("dark");
  });
});
