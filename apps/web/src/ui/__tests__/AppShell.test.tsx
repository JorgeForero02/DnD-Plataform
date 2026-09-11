import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Breadcrumbs } from "../AppShell";

// Revisión (última ronda) — el enlace de una miga de pan es un control con teclado como
// cualquier otro (Button.tsx, Tabs.tsx), y por eso lleva el mismo anillo focus-visible: sin
// él, tabular hasta la miga la deja invisible para quien navega sin ratón.
describe("Breadcrumbs", () => {
  it("el enlace de una miga lleva el mismo anillo focus-visible que el resto de controles", () => {
    render(
      <MemoryRouter>
        <Breadcrumbs items={[{ label: "Mis campañas", to: "/campaigns" }, { label: "Ejemplo" }]} />
      </MemoryRouter>,
    );
    const enlace = screen.getByRole("link", { name: "Mis campañas" });
    expect(enlace.className).toContain("focus-visible:outline");
    expect(enlace.className).toContain("focus-visible:outline-2");
    expect(enlace.className).toContain("focus-visible:outline-offset-2");
    expect(enlace.className).toContain("focus-visible:outline-accent");
  });
});
