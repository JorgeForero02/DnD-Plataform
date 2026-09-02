import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../ErrorBoundary";

// A component that throws once and then, once told to stop, renders normally — the shape a
// real transient failure takes (a bad response the next render won't hit again).
let shouldThrow = true;
function Flaky() {
  if (shouldThrow) throw new Error("boom");
  return <p>Contenido recuperado</p>;
}

function AlwaysThrows(): never {
  throw new Error("always boom");
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    shouldThrow = true;
  });

  // Task 1.18b, hallazgo 6 — the direct regression this task exists to prevent: task 1.15's
  // critical finding was a permanent blank screen, found by reading the code, not by using the
  // app. Remove the boundary (or have it return null / this.props.children on error) and this
  // fails: no heading, no way out.
  it("shows a way out instead of a blank screen when a child throws while rendering", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <AlwaysThrows />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("heading", { name: "Se produjo un error" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
    // Fix round 1 (post-1.18b review), Important 11: through the Button primitive now, not a
    // hand-copied <a> — a real <button>, not a link.
    expect(screen.getByRole("button", { name: "Volver a mis campañas" })).toBeInTheDocument();
  });

  // The brief's explicit requirement: not swallowed silently. Revert componentDidCatch to an
  // empty body (still shows the fallback, still "works") and this goes red even though the
  // screen looks identical — the point is the error is NOT silently discarded.
  it("logs the caught error instead of discarding it", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <AlwaysThrows />
      </ErrorBoundary>,
    );
    const loggedThisBoundary = consoleSpy.mock.calls.some(
      (call) => typeof call[0] === "string" && call[0].includes("ErrorBoundary caught"),
    );
    expect(loggedThisBoundary).toBe(true);
  });

  // Revert handleRetry to a no-op (or delete the button) and this fails: the fallback stays up
  // forever even once the underlying problem is gone, which is the whole point of offering a
  // retry instead of only a link away.
  it("Reintentar clears the error and re-renders the real children", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("heading", { name: "Se produjo un error" })).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(screen.getByText("Contenido recuperado")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Se produjo un error" })).not.toBeInTheDocument();
  });

  it("renders children normally when nothing throws", () => {
    render(
      <ErrorBoundary>
        <p>Todo bien</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Todo bien")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Se produjo un error" })).not.toBeInTheDocument();
  });
});
