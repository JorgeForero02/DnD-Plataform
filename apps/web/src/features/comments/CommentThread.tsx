import { useState } from "react";
import { useMembers, useMyRole } from "../campaigns/members";
import { CHECKING_PERMISSIONS } from "../campaigns/PermissionStatus";
import { useAuthStore } from "../../store/auth.store";
import { useComments, useCreateComment, useDeleteComment } from "./hooks";
import { Button } from "../../ui/Button";
import { fieldControlClass } from "../../ui/Field";

export function CommentThread({ campaignId, entityId }: { campaignId: string; entityId: string }) {
  const comments = useComments(entityId);
  // No `enabled` here on purpose: EntityEditor made this query lazy only to skip it while
  // the SPECIFIC_PLAYERS picker isn't shown, but the thread always renders in edit mode and
  // always needs member names to attribute comments — same query key, so it's one request.
  const members = useMembers(campaignId);
  const createComment = useCreateComment(entityId);
  const deleteComment = useDeleteComment(entityId);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  // The task 1.15 gap this task closes: this thread used to paint "Borrar" unconditionally.
  // The server rule (comments.service.ts:65) is DM or the comment's own author — per comment,
  // not per entity, unlike LinksPanel.
  const { role, isLoading: roleLoading, isError: roleError } = useMyRole(campaignId);
  const userId = useAuthStore((s) => s.user?.id);
  const roleUnresolved = roleLoading || roleError;
  const canDeleteComment = (authorId: string) =>
    !roleUnresolved && (role === "DM" || authorId === userId);
  const deleteReason = "Solo el autor o el DM puede borrar este comentario.";

  // authorId is all the API sends. If the author isn't in the member list (left the
  // campaign, or the list failed to load), fall back to the raw id instead of hiding
  // the comment or inventing a name.
  const authorName = (authorId: string) =>
    members.data?.find((m) => m.userId === authorId)?.displayName ?? authorId;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = body.trim();
    if (!trimmed) return;
    try {
      await createComment.mutateAsync({ body: trimmed });
      setBody("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section className="space-y-2 rounded-radius-sm border border-muted p-3">
      <h3 className="text-chrome-sm font-semibold">Comentarios</h3>
      {comments.isLoading && <p className="text-chrome-sm text-muted">Cargando comentarios…</p>}
      {comments.isError && (
        <p className="text-chrome-sm text-danger-text">No se pudieron cargar los comentarios.</p>
      )}
      {comments.data && comments.data.length === 0 && (
        <p className="text-chrome-sm text-muted">Sin comentarios.</p>
      )}
      <ul className="space-y-1">
        {comments.data?.map((c) => {
          const canDelete = canDeleteComment(c.authorId);
          const rowReason = roleUnresolved ? CHECKING_PERMISSIONS : deleteReason;
          return (
            <li key={c.id} className="flex items-start justify-between gap-2 text-chrome-sm">
              <span>
                <strong>{authorName(c.authorId)}:</strong> {c.body}
              </span>
              {/* Arreglo 2 (1.16-fix): the reason "Borrar" is disabled used to live only in
                  `title`, which touch has no way to reveal and screen readers don't announce.
                  This permission is per row (canDeleteComment(authorId), unlike LinksPanel's
                  single boolean), so the visible text is per row too. */}
              <span className="flex shrink-0 flex-col items-end gap-1">
                <button
                  type="button"
                  onClick={() => {
                    // `aria-disabled` no impide pulsar: sin esto, el botón haría justo lo que dice
                    // que no puede hacer.
                    if (!canDelete) return;
                    deleteComment.mutate(c.id, {
                      onError: (err) => setError((err as Error).message),
                    });
                  }}
                  // Ficha U9 — **`aria-disabled`, no `disabled`.** El motivo va escrito debajo, y
                  // un botón fuera del recorrido de teclado se lleva el motivo con él.
                  aria-disabled={!canDelete || undefined}
                  className={`text-chrome-sm ${
                    canDelete ? "text-danger-text" : "cursor-not-allowed text-muted"
                  }`}
                >
                  Borrar
                </button>
                {!canDelete && <span className="text-chrome-xs text-muted">{rowReason}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <label htmlFor="comment-body" className="sr-only">
          Nuevo comentario
        </label>
        <input
          id="comment-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Escribe un comentario…"
          className={`flex-1 ${fieldControlClass}`}
        />
        <Button type="submit" disabled={!body.trim() || createComment.isPending}>
          Publicar
        </Button>
      </form>
      {error && <p className="text-chrome-sm text-danger-text">{error}</p>}
    </section>
  );
}
