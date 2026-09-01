import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { CommentThread } from "../CommentThread";
import * as commentsApi from "../api";
import * as membersApi from "../../campaigns/members";

function renderThread() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CommentThread campaignId="c1" entityId="e1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CommentThread", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
      { userId: "u1", displayName: "Alice", role: "DM" },
    ]);
  });

  it("posting a comment calls the mutation with the typed text and clears the field", async () => {
    vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([]);
    const spy = vi.spyOn(commentsApi, "createComment").mockResolvedValue({
      id: "c1",
      entityId: "e1",
      authorId: "u1",
      body: "hola",
      createdAt: "x",
    });
    renderThread();

    const input = await screen.findByLabelText("Nuevo comentario");
    fireEvent.change(input, { target: { value: "hola" } });
    fireEvent.click(screen.getByRole("button", { name: "Publicar" }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith("e1", { body: "hola" });
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("a comment whose authorId is not among the members is still shown", async () => {
    vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([
      { id: "c1", entityId: "e1", authorId: "ghost-user", body: "texto perdido", createdAt: "x" },
    ]);
    renderThread();

    expect(await screen.findByText("texto perdido", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("ghost-user", { exact: false })).toBeInTheDocument();
  });

  it("a rejected delete shows the error instead of failing silently (fix 1)", async () => {
    vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([
      { id: "c1", entityId: "e1", authorId: "u1", body: "hola", createdAt: "x" },
    ]);
    vi.spyOn(commentsApi, "deleteComment").mockRejectedValue(
      new Error("Only the author or the DM can delete this comment"),
    );
    renderThread();

    await screen.findByText("hola", { exact: false });
    fireEvent.click(screen.getByRole("button", { name: "Borrar" }));

    expect(
      await screen.findByText("Only the author or the DM can delete this comment"),
    ).toBeInTheDocument();
  });
});
