import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { CommentThread } from "../CommentThread";
import * as commentsApi from "../api";
import * as membersApi from "../../campaigns/members";
import { useAuthStore } from "../../../store/auth.store";

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
    // Task 1.16: the thread now looks up the viewer's identity/role before letting them
    // delete a comment. Defaults every test here to its author (u1), the narrowest identity
    // that can still delete its own comment, so the pre-existing tests below keep exercising
    // what they always did; the dedicated "permiso" describe block overrides this per test.
    useAuthStore.setState({ user: { id: "u1", email: "u@b.com", displayName: "Alice" } });
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

    const deleteButton = await screen.findByRole("button", { name: "Borrar" });
    await waitFor(() => expect(deleteButton).not.toBeDisabled());
    fireEvent.click(deleteButton);

    expect(
      await screen.findByText("Only the author or the DM can delete this comment"),
    ).toBeInTheDocument();
  });

  // Task 1.16: closes the gap 1.15 left declared — CommentThread used to paint "Borrar"
  // regardless of who was looking, which the server (comments.service.ts:65) would reject for
  // anyone but the DM or the comment's own author.
  describe("permiso para borrar comentarios", () => {
    it("deshabilita Borrar, con el motivo, para quien no es DM ni el autor", async () => {
      useAuthStore.setState({ user: { id: "p1", email: "p@b.com", displayName: "P" } });
      vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
        { userId: "dm1", displayName: "DM", role: "DM" },
        { userId: "otro", displayName: "Otro", role: "PLAYER" },
        { userId: "p1", displayName: "P", role: "PLAYER" },
      ]);
      vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([
        { id: "c1", entityId: "e1", authorId: "otro", body: "ajeno", createdAt: "x" },
      ]);
      const spy = vi.spyOn(commentsApi, "deleteComment");
      renderThread();

      const deleteButton = await screen.findByRole("button", { name: "Borrar" });
      await waitFor(() => expect(deleteButton).toBeDisabled());
      // Arreglo 2 (1.16-fix): the reason must be visible text, not just `title` — touch has
      // no way to reveal a tooltip and screen readers don't announce it.
      expect(
        await screen.findByText("Solo el autor o el DM puede borrar este comentario."),
      ).toBeInTheDocument();
      fireEvent.click(deleteButton);
      expect(spy).not.toHaveBeenCalled();
    });

    // Arreglo 3 (1.16-fix): canDeleteComment is per-row, unlike every other permission in the
    // app (LinksPanel's canRemoveLinks is one boolean for the whole panel). An implementation
    // that computed a single boolean for the whole thread — say from comments.data[0].authorId,
    // copying LinksPanel's pattern — would pass all the tests above (they only ever mount one
    // comment). This test is the one that would catch it: two comments, one the viewer's own,
    // one someone else's.
    it("con dos comentarios, habilita Borrar solo en el propio y lo deshabilita en el ajeno", async () => {
      useAuthStore.setState({ user: { id: "p1", email: "p@b.com", displayName: "P" } });
      vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
        { userId: "dm1", displayName: "DM", role: "DM" },
        { userId: "otro", displayName: "Otro", role: "PLAYER" },
        { userId: "p1", displayName: "P", role: "PLAYER" },
      ]);
      vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([
        { id: "c1", entityId: "e1", authorId: "p1", body: "mio", createdAt: "x" },
        { id: "c2", entityId: "e1", authorId: "otro", body: "ajeno", createdAt: "x" },
      ]);
      renderThread();

      const deleteButtons = await screen.findAllByRole("button", { name: "Borrar" });
      expect(deleteButtons).toHaveLength(2);
      await waitFor(() => expect(deleteButtons[0]).not.toBeDisabled());
      expect(deleteButtons[1]).toBeDisabled();
    });

    it("deja Borrar habilitado para el propio autor, aunque no sea DM", async () => {
      useAuthStore.setState({ user: { id: "p1", email: "p@b.com", displayName: "P" } });
      vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
        { userId: "dm1", displayName: "DM", role: "DM" },
        { userId: "p1", displayName: "P", role: "PLAYER" },
      ]);
      vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([
        { id: "c1", entityId: "e1", authorId: "p1", body: "mio", createdAt: "x" },
      ]);
      renderThread();

      const deleteButton = await screen.findByRole("button", { name: "Borrar" });
      await waitFor(() => expect(deleteButton).not.toBeDisabled());
    });

    it("deja Borrar habilitado para el DM sobre el comentario de otro", async () => {
      useAuthStore.setState({ user: { id: "dm1", email: "dm@b.com", displayName: "DM" } });
      vi.spyOn(membersApi, "fetchMembers").mockResolvedValue([
        { userId: "dm1", displayName: "DM", role: "DM" },
        { userId: "otro", displayName: "Otro", role: "PLAYER" },
      ]);
      vi.spyOn(commentsApi, "fetchComments").mockResolvedValue([
        { id: "c1", entityId: "e1", authorId: "otro", body: "ajeno", createdAt: "x" },
      ]);
      renderThread();

      const deleteButton = await screen.findByRole("button", { name: "Borrar" });
      await waitFor(() => expect(deleteButton).not.toBeDisabled());
    });
  });
});
