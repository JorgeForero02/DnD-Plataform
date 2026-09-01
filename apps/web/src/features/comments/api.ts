import type { CreateCommentInput } from "@dnd/shared";
import { apiFetch } from "../../lib/api";

export interface Comment {
  id: string;
  entityId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export function fetchComments(entityId: string): Promise<Comment[]> {
  return apiFetch<Comment[]>(`/entities/${entityId}/comments`);
}

export function createComment(entityId: string, input: CreateCommentInput): Promise<Comment> {
  return apiFetch<Comment>(`/entities/${entityId}/comments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteComment(commentId: string): Promise<{ deleted: boolean }> {
  // Task 1.16: same fix as features/links/api.ts's deleteLink, found the same way.
  return apiFetch<{ deleted: boolean }>(`/comments/${commentId}`, {
    method: "DELETE",
    body: JSON.stringify({}),
  });
}
