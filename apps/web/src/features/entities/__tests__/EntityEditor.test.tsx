import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EntityEditor } from "../EntityEditor";
import * as entitiesApi from "../api";
import * as membersApi from "../../campaigns/members";

function renderEditor() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <EntityEditor campaignId="c1" type="NPC" onClose={() => {}} />
    </QueryClientProvider>,
  );
}

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
});
