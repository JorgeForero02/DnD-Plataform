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
      screen.getByRole("button", { name: "Cambiar al tema Lectura (vitela)" }),
    ).toBeInTheDocument();
  });

  // Task 1.19, fix round 1, Important 8 — this test renders ThemeToggle directly, so it
  // proves the component's own click → setTheme → re-render wiring, not that anything mounts
  // it anywhere. Task 1.19b: ThemeToggle now mounts app-wide (App.tsx), once every real screen
  // follows the theme — no RTL test exercises that mount point, the same way none exercises
  // App.tsx's routing; Playwright is what actually renders the app shell and would be what
  // breaks if the mount were removed there.
  it("clicking switches the theme, persists it, and updates its own label", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: "Cambiar al tema Lectura (vitela)" }));

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("dnd-theme")).toBe("light");
    expect(screen.getByRole("button", { name: "Cambiar al tema Oscuro" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cambiar al tema Oscuro" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("dnd-theme")).toBe("dark");
  });
});
