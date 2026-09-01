import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { LinksPanel } from "../LinksPanel";
import * as linksApi from "../api";
import * as entitiesApi from "../../entities/api";
import * as membersApi from "../../campaigns/members";
import { useAuthStore } from "../../../store/auth.store";
import type { Entity } from "../../entities/api";
import type { EntityLink } from "../api";

function renderPanel(entityCreatedById = "u1") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <LinksPanel campaignId="c1" entityId="e1" entityCreatedById={entityCreatedById} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const baseEntity: Entity = {
  id: "e1",
  campaignId: "c1",
  type: "NPC",
  name: "Self",
  tags: [],
  visibility: "OWNER_DM",
  createdById: "u1",
  createdAt: "x",
};

describe("LinksPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Task 1.16: the panel now looks up the viewer's identity/role before letting them
    // remove a link. Defaults every test to a DM (the widest permission) so the pre-existing
    // add/remove/error tests below keep exercising what they always did; the dedicated
    // "permiso" describe block below overrides this per test.
    useAuthStore.setState({ user: { id: "dm1", email: "dm@b.com", displayName: "DM" } });
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "dm1", displayName: "DM", role: "DM" },
      { userId: "u1", displayName: "Creator", role: "PLAYER" },
    ]);
  });

  it("adding a link calls the mutation with the chosen toId", async () => {
    vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([]);
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([
      baseEntity,
      { ...baseEntity, id: "e2", name: "Waterdeep", type: "LOCATION" },
    ]);
    const spy = vi.spyOn(linksApi, "createLink").mockResolvedValue({
      id: "l1",
      fromId: "e1",
      toId: "e2",
      label: undefined,
    });
    renderPanel();

    // Wait for the target list to actually load before selecting: the <select> itself
    // renders immediately, but its <option>s only appear once useAllEntities resolves.
    await screen.findByRole("option", { name: /Waterdeep/ });
    // fix 4 (semi-empty test): the entity being edited must never be a candidate for its
    // own link — this used to go unasserted, so deleting the filter kept it green.
    expect(screen.queryByRole("option", { name: /^Self/ })).not.toBeInTheDocument();
    const select = screen.getByLabelText("Entidad destino");
    fireEvent.change(select, { target: { value: "e2" } });
    fireEvent.click(screen.getByRole("button", { name: "Añadir enlace" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith("e1", { toId: "e2", label: undefined });
  });

  it("removing a link calls delete with that row's linkId, not another's", async () => {
    const rows: EntityLink[] = [
      { id: "link-1", label: null, to: { id: "e2", name: "Waterdeep", type: "LOCATION" } },
      { id: "link-2", label: null, to: { id: "e3", name: "Baldur's Gate", type: "LOCATION" } },
    ];
    vi.spyOn(linksApi, "fetchLinks").mockResolvedValue(rows);
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
    const spy = vi.spyOn(linksApi, "deleteLink").mockResolvedValue({ deleted: true });
    renderPanel();

    await screen.findByText("Baldur's Gate", { exact: false });
    const removeButtons = await screen.findAllByRole("button", { name: "Quitar" });
    expect(removeButtons).toHaveLength(2);
    await waitFor(() => expect(removeButtons[1]).not.toBeDisabled());
    fireEvent.click(removeButtons[1]);

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith("link-2");
  });

  it("a rejected delete shows the error instead of failing silently (fix 1)", async () => {
    const rows: EntityLink[] = [
      { id: "link-1", label: null, to: { id: "e2", name: "Waterdeep", type: "LOCATION" } },
    ];
    vi.spyOn(linksApi, "fetchLinks").mockResolvedValue(rows);
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
    vi.spyOn(linksApi, "deleteLink").mockRejectedValue(
      new Error("Only the DM or the creator can remove this link"),
    );
    renderPanel();

    await screen.findByText("Waterdeep", { exact: false });
    const removeButton = screen.getByRole("button", { name: "Quitar" });
    await waitFor(() => expect(removeButton).not.toBeDisabled());
    fireEvent.click(removeButton);

    expect(
      await screen.findByText("Only the DM or the creator can remove this link"),
    ).toBeInTheDocument();
  });

  it("excludes the entity's own name and already-linked targets from the picker (fix 4)", async () => {
    vi.spyOn(linksApi, "fetchLinks").mockResolvedValue([
      { id: "link-1", label: null, to: { id: "e2", name: "Waterdeep", type: "LOCATION" } },
    ]);
    vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([
      baseEntity,
      { ...baseEntity, id: "e2", name: "Waterdeep", type: "LOCATION" },
      { ...baseEntity, id: "e3", name: "Baldur's Gate", type: "LOCATION" },
    ]);
    renderPanel();

    await screen.findByRole("option", { name: /Baldur's Gate/ });
    expect(screen.queryByRole("option", { name: /^Self/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Waterdeep/ })).not.toBeInTheDocument();
  });

  // Task 1.16: closes the gap 1.15 left declared — LinksPanel used to paint "Quitar"
  // regardless of who was looking, which the server (links.service.ts:75) would reject for
  // anyone but the DM or the creator of the entity the link hangs off.
  describe("permiso para quitar enlaces", () => {
    const rows: EntityLink[] = [
      { id: "link-1", label: null, to: { id: "e2", name: "Waterdeep", type: "LOCATION" } },
    ];

    it("deshabilita Quitar, con el motivo, para quien no es DM ni creó la entidad", async () => {
      useAuthStore.setState({ user: { id: "p1", email: "p@b.com", displayName: "P" } });
      vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
        { userId: "dm1", displayName: "DM", role: "DM" },
        { userId: "p1", displayName: "P", role: "PLAYER" },
      ]);
      vi.spyOn(linksApi, "fetchLinks").mockResolvedValue(rows);
      vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
      const spy = vi.spyOn(linksApi, "deleteLink");
      // entityCreatedById is "u1" (renderPanel's default) — p1 is neither the DM nor u1.
      renderPanel("u1");

      const removeButton = await screen.findByRole("button", { name: "Quitar" });
      await waitFor(() => expect(removeButton).toBeDisabled());
      // Arreglo 2 (1.16-fix): the reason must be visible text, not just `title` — touch has
      // no way to reveal a tooltip and screen readers don't announce it.
      expect(
        await screen.findByText("Solo el DM o quien creó esta entidad puede quitar enlaces."),
      ).toBeInTheDocument();
      fireEvent.click(removeButton);
      expect(spy).not.toHaveBeenCalled();
    });

    it("deja Quitar habilitado para quien creó la entidad, aunque no sea DM", async () => {
      useAuthStore.setState({ user: { id: "creator1", email: "c@b.com", displayName: "C" } });
      vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
        { userId: "dm1", displayName: "DM", role: "DM" },
        { userId: "creator1", displayName: "C", role: "PLAYER" },
      ]);
      vi.spyOn(linksApi, "fetchLinks").mockResolvedValue(rows);
      vi.spyOn(entitiesApi, "fetchAllEntities").mockResolvedValue([]);
      renderPanel("creator1");

      const removeButton = await screen.findByRole("button", { name: "Quitar" });
      await waitFor(() => expect(removeButton).not.toBeDisabled());
    });
  });
});
