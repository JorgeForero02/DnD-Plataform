import { useState } from "react";
import { useMembers } from "../campaigns/members";
import { useComments, useCreateComment, useDeleteComment } from "./hooks";

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
    <section className="space-y-2 rounded border border-slate-700 p-3">
      <h3 className="text-sm font-semibold">Comentarios</h3>
      {comments.isLoading && <p className="text-sm text-slate-400">Cargando comentarios…</p>}
      {comments.isError && (
        <p className="text-sm text-red-400">No se pudieron cargar los comentarios.</p>
      )}
      {comments.data && comments.data.length === 0 && (
        <p className="text-sm text-slate-400">Sin comentarios.</p>
      )}
      <ul className="space-y-1">
        {comments.data?.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-2 text-sm">
            <span>
              <strong>{authorName(c.authorId)}:</strong> {c.body}
            </span>
            <button
              type="button"
              onClick={() =>
                deleteComment.mutate(c.id, {
                  onError: (err) => setError((err as Error).message),
                })
              }
              className="shrink-0 text-red-400"
            >
              Borrar
            </button>
          </li>
        ))}
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
          className="flex-1 rounded bg-slate-700 p-1 text-sm"
        />
        <button
          type="submit"
          disabled={!body.trim() || createComment.isPending}
          className="rounded bg-indigo-600 px-2 py-1 text-sm font-semibold disabled:opacity-50"
        >
          Publicar
        </button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </section>
  );
}
