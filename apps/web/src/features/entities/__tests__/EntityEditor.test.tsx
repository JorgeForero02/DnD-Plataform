import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EntityEditor } from "../EntityEditor";
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

function renderEditEditor(entity: Entity) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <EntityEditor campaignId="c1" type="NPC" entity={entity} onClose={() => {}} />
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
    fireEvent.change(screen.getByLabelText("Visibilidad"), {
      target: { value: "SPECIFIC_PLAYERS" },
    });

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
    expect(screen.getByLabelText("Visibilidad")).toHaveValue("OWNER_DM");
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
    fireEvent.change(screen.getByLabelText("Visibilidad"), { target: { value: "PLAYERS" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const [, , input] = spy.mock.calls[0];
    expect(input).not.toHaveProperty("specificPlayerIds");
  });
});
