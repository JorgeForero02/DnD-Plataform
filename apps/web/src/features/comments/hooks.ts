import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateCommentInput } from "@dnd/shared";
import { fetchComments, createComment, deleteComment } from "./api";

export const commentsKey = (entityId: string) => ["entities", entityId, "comments"] as const;

// `enabled` defaults to true (CommentThread always wants it live); EntityEditor.tsx also
// calls this — same queryKey, so it shares the cache with CommentThread's own call instead of
// firing a second request — only to read `data?.length` for the delete-confirmation cascade
// text, and passes `enabled: isEdit` so it isn't fired while creating a brand-new entity that
// has no id yet.
export function useComments(entityId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: commentsKey(entityId),
    queryFn: () => fetchComments(entityId),
    enabled: options?.enabled,
  });
}

export function useCreateComment(entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) => createComment(entityId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: commentsKey(entityId) }),
  });
}

export function useDeleteComment(entityId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: commentsKey(entityId) }),
  });
}
