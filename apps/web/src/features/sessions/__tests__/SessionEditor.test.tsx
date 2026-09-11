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
  status: "PLANNED" as const,
  startedAt: null,
  endedAt: null,
  attendance: null,
};

function renderEditEditor(
  session: Session,
  props: { onClose?: () => void; readOnly?: boolean; readOnlyReason?: string } = {},
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SessionEditor
        campaignId="c1"
        session={session}
        onClose={props.onClose ?? (() => {})}
        readOnly={props.readOnly}
        readOnlyReason={props.readOnlyReason}
      />
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
    // Reseño 2026-09-02: la visibilidad es un grupo de radios con etiqueta en español y una
    // frase que explica quién ve qué, no un desplegable con los valores del enum en crudo.
    fireEvent.click(screen.getByRole("radio", { name: /Solo DM/ }));
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
    expect(
      screen.getByRole("radio", { name: /Todos los que se sientan a esta mesa/ }),
    ).toBeChecked();

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

  it("sends null for scheduledAt when the date is cleared on a session that had one (P3.5)", async () => {
    const spy = vi.spyOn(sessionsApi, "updateSession").mockResolvedValue(existingSession);
    renderEditEditor(existingSession);

    fireEvent.change(screen.getByLabelText("Fecha y hora"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const [, , input] = spy.mock.calls[0];
    expect(input).toHaveProperty("scheduledAt", null);
  });

  it("shows a saved visibility that the selector doesn't offer, instead of a blank select", () => {
    // SPECIFIC_PLAYERS is not in this editor's own list (docs/05-datos.md), but the API
    // schema still accepts it (seed, curl, a future client), so a session can arrive with it.
    const session: Session = { ...existingSession, visibility: "SPECIFIC_PLAYERS" };
    renderEditEditor(session);

    // Sigue apareciendo, marcada y **no seleccionable**, con su motivo escrito: una opción que
    // desapareciera dejaría al DM guardando un valor distinto del que había sin enterarse.
    const guardada = screen.getByRole("radio", { name: /Jugadores concretos/ });
    expect(guardada).toBeChecked();
    expect(guardada).toBeDisabled();
    expect(screen.getByText(/Valor guardado por otra pantalla/)).toBeInTheDocument();
  });
});

// Task 1.16: Borrar reuses the same readOnly/readOnlyReason the editor already gets from
// CampaignDetailPage.tsx — sessions.service.ts gates both update and delete with
// requireDM, so there's no separate permission to compute here.
describe("SessionEditor (delete)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("no muestra Borrar al crear, solo al editar", () => {
    renderEditor();
    expect(screen.queryByRole("button", { name: "Borrar" })).not.toBeInTheDocument();
  });

  it("pide confirmación: el primer clic no llama a la mutación (comportamiento 1)", () => {
    const spy = vi.spyOn(sessionsApi, "deleteSession");
    renderEditEditor(existingSession);

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));

    expect(spy).not.toHaveBeenCalled();
    expect(
      screen.getByText('Vas a borrar la sesión "Sesión 1: la Tumba". No se puede deshacer.'),
    ).toBeInTheDocument();
  });

  it("confirmar borra, con el identificador correcto, y cierra el editor (comportamiento 2)", async () => {
    const spy = vi.spyOn(sessionsApi, "deleteSession").mockResolvedValue({ deleted: true });
    const onClose = vi.fn();
    renderEditEditor(existingSession, { onClose });

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar definitivamente" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith("c1", "s1");
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("cancelar no borra y deja el editor abierto (comportamiento 3)", () => {
    const spy = vi.spyOn(sessionsApi, "deleteSession");
    const onClose = vi.fn();
    renderEditEditor(existingSession, { onClose });

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    fireEvent.click(screen.getByRole("button", { name: "No, cancelar" }));

    expect(spy).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Editar sesión" })).toBeInTheDocument();
  });

  it("quien no puede editar tampoco puede borrar: deshabilitado con su motivo, el clic no llama a nada (comportamiento 4)", () => {
    const spy = vi.spyOn(sessionsApi, "deleteSession");
    renderEditEditor(existingSession, {
      readOnly: true,
      readOnlyReason: "Solo el DM puede crear o editar sesiones.",
    });

    const deleteButton = screen.getByRole("button", { name: "Borrar" });
    expect(deleteButton).toHaveAttribute("aria-disabled", "true");
    expect(deleteButton).toHaveAttribute("title", "Solo el DM puede crear o editar sesiones.");
    fireEvent.click(deleteButton);
    expect(spy).not.toHaveBeenCalled();
  });

  it("quien sí puede editar, sí puede borrar (comportamiento 5)", () => {
    renderEditEditor(existingSession, { readOnly: false });
    expect(screen.getByRole("button", { name: "Borrar" })).not.toHaveAttribute("aria-disabled");
  });

  it("el fallo del servidor al borrar se ve (comportamiento 6)", async () => {
    vi.spyOn(sessionsApi, "deleteSession").mockRejectedValue(
      new Error("Only the DM can modify this session"),
    );
    renderEditEditor(existingSession);

    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));
    fireEvent.click(screen.getByRole("button", { name: "Sí, borrar definitivamente" }));

    expect(await screen.findByText("Only the DM can modify this session")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Editar sesión" })).toBeInTheDocument();
  });
});
