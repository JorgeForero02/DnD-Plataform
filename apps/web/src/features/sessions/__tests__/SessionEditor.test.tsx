import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionEditor } from "../SessionEditor";
import * as sessionsApi from "../api";
import type { Session } from "../api";

function renderEditor() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SessionEditor campaignId="c1" onClose={() => {}} />
    </QueryClientProvider>,
  );
}

// scheduledAt has :00 seconds on purpose. <input type="datetime-local"> only has minute
// precision (toDatetimeLocal in SessionEditor.tsx drops seconds), so the preload/round-trip
// assertion below only matches by coincidence: with e.g. "20:00:30Z" the round trip would
// lose the seconds and this same assertion would fail. That loss of precision is real and
// not fixed here — see docs/06-pendientes.md.
const existingSession: Session = {
  id: "s1",
  campaignId: "c1",
  title: "Sesión 1: la Tumba",
  scheduledAt: "2026-09-05T20:00:00.000Z",
  notes: "Traer velas",
  visibility: "PLAYERS",
  createdAt: "x",
};

function renderEditEditor(session: Session) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SessionEditor campaignId="c1" session={session} onClose={() => {}} />
    </QueryClientProvider>,
  );
}

describe("SessionEditor (create)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("submits the chosen title, visibility, and scheduledAt as an ISO string", async () => {
    const spy = vi.spyOn(sessionsApi, "createSession").mockResolvedValue({
      ...existingSession,
      id: "s2",
    });
    renderEditor();

    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "Sesión 2: el descenso" },
    });
    fireEvent.change(screen.getByLabelText("Fecha y hora"), {
      target: { value: "2026-09-12T19:30" },
    });
    fireEvent.change(screen.getByLabelText("Visibilidad"), {
      target: { value: "DM_ONLY" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const [, input] = spy.mock.calls[0];
    expect(input.title).toBe("Sesión 2: el descenso");
    expect(input.visibility).toBe("DM_ONLY");
    expect(typeof input.scheduledAt).toBe("string");
    expect(input.scheduledAt).toBe(new Date("2026-09-12T19:30").toISOString());
  });

  it("does not send scheduledAt when the date is left empty", async () => {
    const spy = vi.spyOn(sessionsApi, "createSession").mockResolvedValue(existingSession);
    renderEditor();

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Sesión sin fecha" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const [, input] = spy.mock.calls[0];
    expect(input).not.toHaveProperty("scheduledAt");
  });
});

describe("SessionEditor (edit)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("preloads the existing title, notes, and visibility, and submits only what corresponds", async () => {
    const spy = vi.spyOn(sessionsApi, "updateSession").mockResolvedValue(existingSession);
    renderEditEditor(existingSession);

    expect(screen.getByLabelText("Título")).toHaveValue("Sesión 1: la Tumba");
    expect(screen.getByLabelText("Notas")).toHaveValue("Traer velas");
    expect(screen.getByLabelText("Visibilidad")).toHaveValue("PLAYERS");

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Sesión 1, revisada" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith("c1", "s1", {
      title: "Sesión 1, revisada",
      scheduledAt: existingSession.scheduledAt
        ? new Date(existingSession.scheduledAt).toISOString()
        : undefined,
      notes: "Traer velas",
      visibility: "PLAYERS",
    });
  });

  it("shows the server error instead of failing silently", async () => {
    vi.spyOn(sessionsApi, "updateSession").mockRejectedValue(
      new Error("Only the DM can modify this session"),
    );
    renderEditEditor(existingSession);

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Only the DM can modify this session")).toBeInTheDocument();
  });

  it("sends an empty string for notes when the user clears the field, instead of omitting it", async () => {
    const spy = vi.spyOn(sessionsApi, "updateSession").mockResolvedValue(existingSession);
    renderEditEditor(existingSession);

    fireEvent.change(screen.getByLabelText("Notas"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const [, , input] = spy.mock.calls[0];
    expect(input).toHaveProperty("notes", "");
  });

  it("shows a saved visibility that the selector doesn't offer, instead of a blank select", () => {
    // SPECIFIC_PLAYERS is not in this editor's own list (docs/05-datos.md), but the API
    // schema still accepts it (seed, curl, a future client), so a session can arrive with it.
    const session: Session = { ...existingSession, visibility: "SPECIFIC_PLAYERS" };
    renderEditEditor(session);

    expect(screen.getByLabelText("Visibilidad")).toHaveValue("SPECIFIC_PLAYERS");
  });
});
