import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateCommentInput } from "@dnd/shared";
import { fetchComments, createComment, deleteComment } from "./api";

export const commentsKey = (entityId: string) => ["entities", entityId, "comments"] as const;

export function useComments(entityId: string) {
  return useQuery({
    queryKey: commentsKey(entityId),
    queryFn: () => fetchComments(entityId),
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
