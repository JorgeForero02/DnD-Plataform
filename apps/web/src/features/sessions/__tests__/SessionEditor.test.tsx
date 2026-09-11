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

  it("loses the seconds of scheduledAt in the datetime-local round trip (documented, not fixed)", async () => {
    // <input type="datetime-local"> only has minute precision (toDatetimeLocal in
    // SessionEditor.tsx drops seconds). A session scheduled at :30 seconds shows a truncated
    // input and, if saved untouched, is sent back with :00 seconds — silently losing them.
    const withSeconds: Session = { ...existingSession, scheduledAt: "2026-09-05T20:00:30.000Z" };
    const spy = vi.spyOn(sessionsApi, "updateSession").mockResolvedValue(withSeconds);
    renderEditEditor(withSeconds);

    // The input shows local time truncated to the minute, whatever the runner's timezone is —
    // the same conversion SessionEditor.tsx does (pad(getHours):pad(getMinutes)).
    const local = new Date(withSeconds.scheduledAt as string);
    const pad = (n: number) => String(n).padStart(2, "0");
    const expectedInputValue = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
    expect(screen.getByLabelText("Fecha y hora")).toHaveValue(expectedInputValue);

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const [, , input] = spy.mock.calls[0];
    expect(input).toHaveProperty("scheduledAt", "2026-09-05T20:00:00.000Z");
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
    // SPECIFIC_PLAYERS is not in this editor's own list (docs/05-datos.md). Task 27 (P3) went
    // further and made the API schema itself reject it on write — but a row saved by an OLDER
    // build, a seed, or a direct write to the database can still carry it, and this is the
    // read path: the editor still has to show what's actually stored, not pretend it never
    // happens.
    const session: Session = { ...existingSession, visibility: "SPECIFIC_PLAYERS" };
    renderEditEditor(session);

    // Sigue apareciendo, marcada y **no seleccionable**, con su motivo escrito: una opción que
    // desapareciera dejaría al DM guardando un valor distinto del que había sin enterarse.
    const guardada = screen.getByRole("radio", { name: /Jugadores concretos/ });
    expect(guardada).toBeChecked();
    expect(guardada).toBeDisabled();
    expect(screen.getByText(/Valor guardado por otra pantalla/)).toBeInTheDocument();
  });

  // Task 27 (P3, ronda del orquestador) — **OWNER_DM es el mismo placebo que SPECIFIC_PLAYERS.**
  // `Session` no tiene un creador distinto del DM (`sessions.service.ts` escribe
  // `createdById: ""`), así que «DM y creador» produce exactamente el mismo espectador que
  // «Solo DM» mientras promete uno que no existe. Se excluye de la misma lista y con el mismo
  // trato: sigue mostrándose, marcada y no seleccionable, si ya estaba guardada.
  it("shows a saved OWNER_DM the same way: marked and not selectable", () => {
    const session: Session = { ...existingSession, visibility: "OWNER_DM" };
    renderEditEditor(session);

    const guardada = screen.getByRole("radio", { name: /DM y creador/ });
    expect(guardada).toBeChecked();
    expect(guardada).toBeDisabled();
    expect(screen.getByText(/Valor guardado por otra pantalla/)).toBeInTheDocument();
  });

  it("never offers SPECIFIC_PLAYERS or OWNER_DM as choosable options — only three radios", () => {
    renderEditor();

    // Tres, y solo tres: Público, Jugadores, Solo DM. Ni «Jugadores concretos» ni «DM y
    // creador» aparecen cuando no hay un valor guardado que obligue a conservarlos.
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.queryByRole("radio", { name: /Jugadores concretos/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /DM y creador/ })).not.toBeInTheDocument();
  });

  // Task 27 (P3, ronda de arreglo 2) — **guardar sin tocar un valor heredado ya no reenvía ese
  // valor.** Desde que `sessionVisibilitySchema` (`@dnd/shared`) rechaza `SPECIFIC_PLAYERS` y
  // `OWNER_DM` con 400, una sesión que ya tuviera uno de los dos guardado (fila vieja, seed, o
  // escritura directa) se volvía imposible de re-guardar sin tocar el selector: el radio de ese
  // valor está marcado y no seleccionable, así que el DM no tiene manera de "arreglarlo" desde
  // aquí, y el `PATCH` de cualquier otro cambio (el título, la fecha) reenviaba el mismo valor
  // rechazado. La regla del orquestador: **un botón que el servidor rechaza es un defecto**, así
  // que si `visibility` no cambió y arrancó fuera de la lista que este editor ofrece, se OMITE
  // del `PATCH` — el servidor conserva lo que ya tenía (`sessions.service.ts`: una clave ausente
  // es "no la toques", el mismo contrato que ya usan `notes` y `scheduledAt` en esta pantalla).
  it("editando una sesión con SPECIFIC_PLAYERS guardado, sin tocar el selector: el PATCH no lleva visibility", async () => {
    const spy = vi
      .spyOn(sessionsApi, "updateSession")
      .mockResolvedValue({ ...existingSession, visibility: "SPECIFIC_PLAYERS" });
    const session: Session = { ...existingSession, visibility: "SPECIFIC_PLAYERS" };
    renderEditEditor(session);

    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Otro título" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const [, , input] = spy.mock.calls[0];
    expect(input.title).toBe("Otro título");
    expect(input).not.toHaveProperty("visibility");
  });

  it("editando esa misma sesión, si el DM SÍ elige «Solo DM»: el PATCH manda DM_ONLY", async () => {
    const spy = vi
      .spyOn(sessionsApi, "updateSession")
      .mockResolvedValue({ ...existingSession, visibility: "DM_ONLY" });
    const session: Session = { ...existingSession, visibility: "SPECIFIC_PLAYERS" };
    renderEditEditor(session);

    fireEvent.click(screen.getByRole("radio", { name: /Solo DM/ }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const [, , input] = spy.mock.calls[0];
    expect(input.visibility).toBe("DM_ONLY");
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
