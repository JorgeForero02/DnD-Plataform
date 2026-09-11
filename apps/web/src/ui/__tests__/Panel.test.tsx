import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Panel } from "../Panel";

describe("Panel", () => {
  it("renders chrome tone by default with no serif class and no clip-path", () => {
    render(<Panel>Contenido</Panel>);
    const panel = screen.getByText("Contenido").closest("[data-tone]");
    expect(panel).toHaveAttribute("data-tone", "chrome");
    expect(panel?.className).not.toContain("font-world");
    expect((panel as HTMLElement).style.clipPath).toBe("");
  });

  // Task 1.19 — the signature element. Revert tone="vellum" to plain styling and this test
  // fails: the serif register, the short measure, and the torn top edge are the three things
  // that make the vellum panel the one bold thing in the system.
  it("renders vellum tone with the world serif register, a 66ch measure, and a torn top edge", () => {
    render(<Panel tone="vellum">Prosa del mundo</Panel>);
    const panel = screen.getByText("Prosa del mundo", { exact: false }).closest("[data-tone]");
    expect(panel).toHaveAttribute("data-tone", "vellum");
    expect(panel?.className).toMatch(/\bfont-world\b/);
    expect(panel?.className).toContain("max-w-[66ch]");

    // Fix round 2, item 6: the hairline border Important 6 added ("separated by a hairline
    // rule and a subtly irregular top edge" — the brief's own words for this signature
    // element) had no coverage anywhere until now.
    //
    // Ticket 38 (2026-09-11): `border-vellum-border`, not `border-muted` — the reading theme's
    // hairline measured 2.78:1 in the browser against the mesa behind the panel (`--muted-ch`
    // there is tuned for text ON the paper, a different background). See `tokens.css`.
    expect(panel?.className).toMatch(/\bborder\b/);
    expect(panel?.className).toMatch(/\bborder-vellum-border\b/);

    // Fix round 1, small: jsdom never paints (docs/08-pruebas.md) — it cannot resolve a
    // Tailwind class to a real font or width, so this suite can only prove the primitive
    // WIRES the right classes; the Playwright contrast spec is what proves they resolve to
    // something real (font-family, measured contrast). The clip-path is different: it is a
    // genuine inline style, not a class, so jsdom really does compute and expose it — a
    // plain "not empty" check would still pass if the torn edge were flattened into a trivial
    // rectangle (still a non-empty clip-path, but no longer the signature element). This
    // parses the actual points and asserts the top edge has real Y variation, not just that
    // *a* clip-path exists.
    const clipPath = (panel as HTMLElement).style.clipPath;
    expect(clipPath).toMatch(/^polygon\(/);
    const points = clipPath
      .replace(/^polygon\(/, "")
      .replace(/\)$/, "")
      .split(",")
      .map((pair) => pair.trim());
    // The top edge is every point before the polygon drops down the right side to "100% 100%".
    const topEdgeYs = points
      .slice(
        0,
        points.findIndex((p) => p.startsWith("100% 100%")),
      )
      .map((p) => parseFloat(p.split(" ")[1]));
    expect(topEdgeYs.length).toBeGreaterThan(4);
    expect(new Set(topEdgeYs).size).toBeGreaterThan(1); // not a flat/rectangular edge
    expect(Math.max(...topEdgeYs)).toBeGreaterThan(0); // has real amplitude, not all 0px
  });

  it("never emits a literal colour in its class list", () => {
    render(<Panel tone="vellum">x</Panel>);
    const panel = screen.getByText("x").closest("[data-tone]");
    expect(panel?.className).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(panel?.className).not.toMatch(/rgb\(/);
  });
});
