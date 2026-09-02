import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import type { Visibility } from "@dnd/shared";
import { Badge } from "../Badge";

const ALL: Visibility[] = ["PUBLIC", "PLAYERS", "SPECIFIC_PLAYERS", "OWNER_DM", "DM_ONLY"];

describe("Badge", () => {
  it("renders a label for each of the five visibility levels", () => {
    const LABELS: Record<Visibility, string> = {
      PUBLIC: "Público",
      PLAYERS: "Jugadores",
      SPECIFIC_PLAYERS: "Jugadores concretos",
      OWNER_DM: "DM y creador",
      DM_ONLY: "Solo DM",
    };
    for (const level of ALL) {
      const { container, unmount } = render(<Badge visibility={level} />);
      const badge = container.querySelector(`[data-visibility="${level}"]`)!;
      expect(badge.textContent).toContain(LABELS[level]);
      unmount();
    }
  });

  // The brief's accessibility requirement: a colour-blind DM must still tell the five levels
  // apart, so no two levels may share both their icon glyph and their border style — that
  // combination is the non-hue signal. Revert Badge.tsx to a single shared icon/border and
  // this is the assertion that catches it.
  it("gives every level a distinct icon + border-style pair, not just a distinct colour", () => {
    const seen = new Set<string>();
    for (const level of ALL) {
      const { container, unmount } = render(<Badge visibility={level} />);
      const badge = container.querySelector(`[data-visibility="${level}"]`)!;
      const icon = badge.querySelector("[aria-hidden]")?.textContent ?? "";
      const borderStyleClass = Array.from(badge.classList).find((c) =>
        ["border-solid", "border-dashed", "border-double", "border-dotted"].includes(c),
      );
      const key = `${icon}|${borderStyleClass}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      unmount();
    }
  });

  it("never emits a literal colour in its class list", () => {
    const { container } = render(<Badge visibility="DM_ONLY" />);
    const badge = container.querySelector('[data-visibility="DM_ONLY"]')!;
    expect(badge.className).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(badge.className).not.toMatch(/rgb\(/);
  });
});
