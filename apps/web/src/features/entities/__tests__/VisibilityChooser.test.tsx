import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VisibilityChooser } from "../VisibilityChooser";

// PNJ del mundo y la mesa (E-PM-14) — `legend` y `aclaracion` son opcionales y no rompen a
// ningún consumidor de hoy: sin pasarlas, el control sigue pintando exactamente lo mismo que
// antes de esta tanda.
describe("VisibilityChooser — legend y aclaracion", () => {
  it("sin props nuevas, pinta «Quién puede verlo» y ninguna aclaración", () => {
    render(<VisibilityChooser value="DM_ONLY" onChange={vi.fn()} />);
    expect(screen.getByRole("group", { name: "Quién puede verlo" })).toBeInTheDocument();
    expect(screen.queryByText(/afecta/i)).not.toBeInTheDocument();
  });

  it("con legend y aclaracion, pinta las dos", () => {
    render(
      <VisibilityChooser
        value="DM_ONLY"
        onChange={vi.fn()}
        legend="Quién ve la plantilla"
        aclaracion="Afecta a la plantilla del Bestiario."
      />,
    );
    expect(screen.getByRole("group", { name: "Quién ve la plantilla" })).toBeInTheDocument();
    expect(screen.getByText("Afecta a la plantilla del Bestiario.")).toBeInTheDocument();
  });
});
