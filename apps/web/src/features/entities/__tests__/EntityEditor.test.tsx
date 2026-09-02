import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EntityEditor } from "../EntityEditor";
import { bodyToText } from "../body";
import * as entitiesApi from "../api";
import * as membersApi from "../../campaigns/members";
import * as linksApi from "../../links/api";
import * as commentsApi from "../../comments/api";
import type { Entity } from "../api";

function renderEditor() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <EntityEditor campaignId="c1" type="NPC" onClose={() => {}} />
    </QueryClientProvider>,
  );
}

function renderEditEditor(
  entity: Entity,
  props: { onClose?: () => void; readOnly?: boolean; readOnlyReason?: string } = {},
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <EntityEditor
        campaignId="c1"
        type="NPC"
        entity={entity}
        onClose={props.onClose ?? (() => {})}
        readOnly={props.readOnly}
        readOnlyReason={props.readOnlyReason}
      />
    </QueryClientProvider>,
  );
}

const editedEntity: Entity = {
  id: "e1",
  campaignId: "c1",
  type: "NPC",
  name: "Old Name",
  tags: ["tag1"],
  visibility: "SPECIFIC_PLAYERS",
  createdById: "u1",
  createdAt: "x",
};

describe("EntityEditor (create)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "p1", displayName: "Alice", role: "PLAYER" },
      { userId: "p2", displayName: "Bob", role: "PLAYER" },
    ]);
  });

  it("submits parsed payload with tags and specificPlayerIds", async () => {
    const spy = vi.spyOn(entitiesApi, "createEntity").mockResolvedValue({
      id: "e1",
      campaignId: "c1",
      type: "NPC",
      name: "Strahd",
      tags: [],
      visibility: "SPECIFIC_PLAYERS",
      createdById: "u1",
      createdAt: "x",
    });
    renderEditor();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Strahd" } });
    fireEvent.change(screen.getByLabelText("Etiquetas (separadas por coma)"), {
      target: { value: "villano, jefe" },
    });
    // Reseño 2026-09-02: la visibilidad dejó de ser un desplegable con los valores del enum en
    // crudo ("PUBLIC", "DM_ONLY"…) y pasó a ser un grupo de radios con su etiqueta en español y
    // una frase que explica quién ve qué. Se elige como lo elige una persona: pulsando.
    fireEvent.click(screen.getByRole("radio", { name: /Jugadores concretos/ }));

    // per-player picker appears after members load
    const alice = await screen.findByLabelText("Alice");
    fireEvent.click(alice);

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith("c1", {
      type: "NPC",
      name: "Strahd",
      tags: ["villano", "jefe"],
      visibility: "SPECIFIC_PLAYERS",
      specificPlayerIds: ["p1"],
    });
  });

  it("starts the visibility picker at OWNER_DM (fix 3: a player's DM_ONLY creation vanished)", () => {
    renderEditor();
    expect(screen.getByRole("radio", { name: /DM y creador/ })).toBeChecked();
  });
});

describe("EntityEditor (edit)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "p1", displayName: "Alice", role: "PLAYER" },
      { userId: "p2", displayName: "Bob", role: "PLAYER" },
    ]);
    // Edit mode now mounts LinksPanel and CommentThread, which call these three fetchers.
    // Spy them here (fix 5) so every "edit" case exercises jsdom + mocks instead of firing
    // three real `fetch`es that only pass today because `retry: false` turns the failure
    // into a silent `isError` nobody asserts on.
    vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([]);
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
    vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([]);
  });

  it("keeps existing grants when only the name changes (fix 1: the critical silent data loss)", async () => {
    vi.spyOn(entitiesApi, "fetchEntity").mockResolvedValue({
      ...editedEntity,
      grants: [{ id: "g1", entityId: "e1", userId: "p1" }],
    });
    const spy = vi.spyOn(entitiesApi, "updateEntity").mockResolvedValue(editedEntity);
    renderEditEditor(editedEntity);

    // wait for the preload to land before touching anything
    await waitFor(() => expect(screen.getByLabelText("Alice")).toBeChecked());

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Old Name," } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith(
      "c1",
      "e1",
      expect.objectContaining({ specificPlayerIds: ["p1"] }),
    );
  });

  it("shows the checkbox of a player with an existing grant as checked (fix 2)", async () => {
    vi.spyOn(entitiesApi, "fetchEntity").mockResolvedValue({
      ...editedEntity,
      grants: [{ id: "g1", entityId: "e1", userId: "p1" }],
    });
    vi.spyOn(entitiesApi, "updateEntity").mockResolvedValue(editedEntity);
    renderEditEditor(editedEntity);

    const alice = await screen.findByLabelText("Alice");
    await waitFor(() => expect(alice).toBeChecked());
    expect(screen.getByLabelText("Bob")).not.toBeChecked();
  });

  it("does not send specificPlayerIds while the entity detail is still in flight (race guard)", async () => {
    let resolveDetail!: (
      value: entitiesApi.Entity & { grants: { id: string; entityId: string; userId: string }[] },
    ) => void;
    vi.spyOn(entitiesApi, "fetchEntity").mockImplementation(
      () =>
        new Promise((res) => {
          resolveDetail = res;
        }),
    );
    const spy = vi.spyOn(entitiesApi, "updateEntity").mockResolvedValue(editedEntity);
    renderEditEditor(editedEntity);

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Old Name," } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const [, , input] = spy.mock.calls[0];
    expect(input).not.toHaveProperty("specificPlayerIds");

    // resolve so the test doesn't leak a dangling promise into the next one
    resolveDetail({ ...editedEntity, grants: [] });
  });

  it("does not send specificPlayerIds when visibility is turned back to PLAYERS (today's correct path)", async () => {
    vi.spyOn(entitiesApi, "fetchEntity").mockResolvedValue({
      ...editedEntity,
      grants: [{ id: "g1", entityId: "e1", userId: "p1" }],
    });
    const spy = vi.spyOn(entitiesApi, "updateEntity").mockResolvedValue(editedEntity);
    renderEditEditor(editedEntity);

    await waitFor(() => expect(screen.getByLabelText("Alice")).toBeChecked());
    fireEvent.click(screen.getByLabelText("Bob"));
    fireEvent.click(screen.getByRole("radio", { name: /Todos los que se sientan a esta mesa/ }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const [, , input] = spy.mock.calls[0];
    expect(input).not.toHaveProperty("specificPlayerIds");
  });
});

// Task 1.16: the only irreversible action in the app. Borrar shows up next to Guardar, only
// in edit mode, and reuses the exact same readOnly/readOnlyReason the editor already gets
// from CampaignDetailPage.tsx for editing — entities.service.ts:requireEditable (DM or
// creator) gates both edit and delete identically, so there's no separate permission to
// compute here.
describe("EntityEditor (delete)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([]);
    vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([]);
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
  });

  function entityWith(grants: { id: string; entityId: string; userId: string }[]) {
    return { ...editedEntity, grants };
  }

  it("shows Borrar only in edit mode, not while creating", () => {
    renderEditor();
    expect(screen.queryByRole("button", { name: "Borrar" })).not.toBeInTheDocument();
  });

  it("pide confirmación: el primer clic no llama a la mutación (comportamiento 1)", async () => {
    vi.spyOn(entitiesApi, "fetchEntity").mockResolvedValue(entityWith([]));
    vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([]);
    const spy = vi.spyOn(entitiesApi, "deleteEntity");
    renderEditEditor(editedEntity);

    fireEvent.click(await screen.findByRole("button", { name: "Borrar" }));

    expect(spy).not.toHaveBeenCalled();
    // The confirmation text must say what disappears with it — the schema cascades
    // (schema.prisma: Entity -> EntityLink/EntityVisibilityGrant/Comment, onDelete: Cascade).
    expect(
      await screen.findByText(
        /No se puede deshacer: se borrarán también todos los enlaces en los que aparece/,
      ),
    ).toBeInTheDocument();
  });

  it("cuenta comentarios y concesiones reales en el aviso, no un texto genérico", async () => {
    vi.spyOn(entitiesApi, "fetchEntity").mockResolvedValue(
      entityWith([
        { id: "g1", entityId: "e1", userId: "p1" },
        { id: "g2", entityId: "e1", userId: "p2" },
      ]),
    );
    vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([
      { id: "c1", entityId: "e1", authorId: "u1", body: "hola", createdAt: "x" },
      { id: "c2", entityId: "e1", authorId: "u1", body: "adiós", createdAt: "x" },
      { id: "c3", entityId: "e1", authorId: "u1", body: "otra vez", createdAt: "x" },
    ]);
    renderEditEditor(editedEntity);

    fireEvent.click(await screen.findByRole("button", { name: "Borrar" }));

    expect(
      await screen.findByText(
        'Vas a borrar "Old Name". No se puede deshacer: se borrarán también todos los enlaces en los que aparece, salgan de ella o apunten a ella, 3 comentarios y 2 concesiones de visibilidad.',
      ),
    ).toBeInTheDocument();
  });

  it("confirmar borra, con el identificador correcto, y cierra el editor (comportamiento 2)", async () => {
    vi.spyOn(entitiesApi, "fetchEntity").mockResolvedValue(entityWith([]));
    vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([]);
    const spy = vi.spyOn(entitiesApi, "deleteEntity").mockResolvedValue({ deleted: true });
    const onClose = vi.fn();
    renderEditEditor(editedEntity, { onClose });

    fireEvent.click(await screen.findByRole("button", { name: "Borrar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, borrar definitivamente" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith("c1", "e1");
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("cancelar no borra y deja el editor abierto (comportamiento 3)", async () => {
    vi.spyOn(entitiesApi, "fetchEntity").mockResolvedValue(entityWith([]));
    vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([]);
    const spy = vi.spyOn(entitiesApi, "deleteEntity");
    const onClose = vi.fn();
    renderEditEditor(editedEntity, { onClose });

    fireEvent.click(await screen.findByRole("button", { name: "Borrar" }));
    fireEvent.click(await screen.findByRole("button", { name: "No, cancelar" }));

    expect(spy).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    // Back to the normal footer, editor still open.
    expect(screen.getByRole("button", { name: "Borrar" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Editar PNJ" })).toBeInTheDocument();
  });

  it("quien no puede editar tampoco puede borrar: deshabilitado con su motivo, el clic no llama a nada (comportamiento 4)", async () => {
    vi.spyOn(entitiesApi, "fetchEntity").mockResolvedValue(entityWith([]));
    vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([]);
    const spy = vi.spyOn(entitiesApi, "deleteEntity");
    renderEditEditor(editedEntity, {
      readOnly: true,
      readOnlyReason: "Solo el DM o quien lo creó puede editarlo.",
    });

    const deleteButton = await screen.findByRole("button", { name: "Borrar" });
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute("title", "Solo el DM o quien lo creó puede editarlo.");
    fireEvent.click(deleteButton);
    expect(spy).not.toHaveBeenCalled();
  });

  it("quien sí puede editar, sí puede borrar (comportamiento 5)", async () => {
    vi.spyOn(entitiesApi, "fetchEntity").mockResolvedValue(entityWith([]));
    vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([]);
    renderEditEditor(editedEntity, { readOnly: false });

    const deleteButton = await screen.findByRole("button", { name: "Borrar" });
    expect(deleteButton).not.toBeDisabled();
  });

  it("el fallo del servidor al borrar se ve (comportamiento 6)", async () => {
    vi.spyOn(entitiesApi, "fetchEntity").mockResolvedValue(entityWith([]));
    vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([]);
    vi.spyOn(entitiesApi, "deleteEntity").mockRejectedValue(
      new Error("Only the DM or the creator can modify this"),
    );
    renderEditEditor(editedEntity);

    fireEvent.click(await screen.findByRole("button", { name: "Borrar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Sí, borrar definitivamente" }));

    expect(
      await screen.findByText("Only the DM or the creator can modify this"),
    ).toBeInTheDocument();
    // The editor stays open on failure — nothing was actually deleted.
    expect(screen.getByRole("heading", { name: "Editar PNJ" })).toBeInTheDocument();
  });
});

// Task 1.17b · A1: the entity's Markdown body — write it, preview it, read it back.
describe("EntityEditor (body)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "p1", displayName: "Alice", role: "PLAYER" },
      { userId: "p2", displayName: "Bob", role: "PLAYER" },
    ]);
    vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([]);
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
    vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([]);
  });

  it("creating: writing text sends the exact body payload", async () => {
    const spy = vi.spyOn(entitiesApi, "createEntity").mockResolvedValue({
      id: "e1",
      campaignId: "c1",
      type: "NPC",
      name: "Strahd",
      tags: [],
      visibility: "OWNER_DM",
      createdById: "u1",
      createdAt: "x",
    });
    renderEditor();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Strahd" } });
    fireEvent.change(screen.getByLabelText("Texto"), {
      target: { value: "## Título\n\nDescripción" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith("c1", {
      type: "NPC",
      name: "Strahd",
      tags: [],
      visibility: "OWNER_DM",
      body: { format: "markdown", text: "## Título\n\nDescripción" },
    });
  });

  it("creating: an empty text does not send a body key", async () => {
    const spy = vi.spyOn(entitiesApi, "createEntity").mockResolvedValue({
      id: "e1",
      campaignId: "c1",
      type: "NPC",
      name: "Strahd",
      tags: [],
      visibility: "OWNER_DM",
      createdById: "u1",
      createdAt: "x",
    });
    renderEditor();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Strahd" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const [, input] = spy.mock.calls[0];
    expect(input).not.toHaveProperty("body");
  });

  it("editing: clearing the text sends an explicit empty body, not an omitted key", async () => {
    vi.spyOn(entitiesApi, "fetchEntity").mockResolvedValue({
      ...editedEntity,
      body: { format: "markdown", text: "algo viejo" },
      grants: [],
    });
    const spy = vi.spyOn(entitiesApi, "updateEntity").mockResolvedValue(editedEntity);
    renderEditEditor({ ...editedEntity, body: { format: "markdown", text: "algo viejo" } });

    const textarea = await screen.findByLabelText("Texto");
    expect(textarea).toHaveValue("algo viejo");
    fireEvent.change(textarea, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith(
      "c1",
      "e1",
      expect.objectContaining({ body: { format: "markdown", text: "" } }),
    );
  });

  it("does not re-seed the body from the detail fetch once the user has started typing", async () => {
    vi.spyOn(entitiesApi, "fetchEntity").mockResolvedValue({
      ...editedEntity,
      body: { format: "markdown", text: "del detalle" },
      grants: [{ id: "g1", entityId: "e1", userId: "p1" }],
    });
    vi.spyOn(entitiesApi, "updateEntity").mockResolvedValue(editedEntity);
    renderEditEditor({ ...editedEntity, body: { format: "markdown", text: "de la lista" } });

    // Seeded from the list response immediately, not left blank waiting for the detail.
    expect(screen.getByLabelText("Texto")).toHaveValue("de la lista");
    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "escribiendo…" } });

    // Wait for the detail fetch to actually resolve and re-render (signalled by the grants
    // preload, which does re-seed on the same render) before checking the body did not follow.
    await waitFor(() => expect(screen.getByLabelText("Alice")).toBeChecked());
    expect(screen.getByLabelText("Texto")).toHaveValue("escribiendo…");
  });

  it("preview renders ## as an accessible heading, not literal text", async () => {
    renderEditor();

    fireEvent.change(screen.getByLabelText("Texto"), { target: { value: "## Título" } });
    fireEvent.click(screen.getByRole("button", { name: "Vista previa" }));

    expect(await screen.findByRole("heading", { name: "Título" })).toBeInTheDocument();
    expect(screen.queryByText("## Título")).not.toBeInTheDocument();
  });

  it('readOnly: no textarea exists, only the rendered text, still labelled "Texto"', async () => {
    vi.spyOn(entitiesApi, "fetchEntity").mockResolvedValue({
      ...editedEntity,
      body: { format: "markdown", text: "## Ficha secreta" },
      grants: [],
    });
    renderEditEditor(
      { ...editedEntity, body: { format: "markdown", text: "## Ficha secreta" } },
      { readOnly: true, readOnlyReason: "Solo puedes ver esta entidad." },
    );

    // No editable control named "Texto" survives in read-only mode. queryByLabelText would
    // now also match the read-only region below (it's aria-labelledby'd, not just the old
    // textarea), and a bare queryByRole("textbox") would also match CommentThread's own
    // comment field (mounted alongside in edit mode) — naming the role narrows it to ours.
    expect(screen.queryByRole("textbox", { name: "Texto" })).toBeNull();
    expect(await screen.findByRole("heading", { name: "Ficha secreta" })).toBeInTheDocument();
    // Not an <htmlFor> label (there's no control left to point at), but still an accessible
    // name for the rendered body via aria-labelledby — a player reading a PUBLIC NPC must not
    // land on an unnamed block of prose between "Etiquetas" and "Visibilidad", and a screen
    // reader must be able to announce it, not just a sighted user seeing the text.
    expect(screen.getByRole("region", { name: "Texto" })).toBeInTheDocument();
  });

  it("bodyToText reads a plain string", () => {
    expect(bodyToText("texto viejo")).toBe("texto viejo");
  });
  it("bodyToText treats null as no body", () => {
    expect(bodyToText(null)).toBe("");
  });
  it("bodyToText treats undefined as no body", () => {
    expect(bodyToText(undefined)).toBe("");
  });
  it("bodyToText treats an unknown shape as no body", () => {
    expect(bodyToText({ format: "html", text: "<p>x</p>" })).toBe("");
    expect(bodyToText(42)).toBe("");
  });
  it("bodyToText treats a markdown body missing text as no body", () => {
    expect(bodyToText({ format: "markdown" })).toBe("");
  });
  it("bodyToText treats a markdown body with a non-string text as no body", () => {
    expect(bodyToText({ format: "markdown", text: 123 })).toBe("");
  });
  it("bodyToText reads a well-formed markdown body", () => {
    expect(bodyToText({ format: "markdown", text: "hola" })).toBe("hola");
  });
});
