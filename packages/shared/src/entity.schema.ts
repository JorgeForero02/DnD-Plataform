import { z } from "zod";
import { visibilitySchema, entityTypeSchema } from "./visibility.schema";

export const createEntitySchema = z.object({
  type: entityTypeSchema,
  name: z.string().min(1).max(160),
  body: z.unknown().optional(),
  tags: z.array(z.string().min(1).max(40)).max(50).default([]),
  visibility: visibilitySchema.default("DM_ONLY"),
  specificPlayerIds: z.array(z.string()).optional(),
});
export const updateEntitySchema = createEntitySchema.partial();

export const createEntityLinkSchema = z.object({
  toId: z.string().min(1),
  label: z.string().max(80).optional(),
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(4000),
});

export type CreateEntityInput = z.infer<typeof createEntitySchema>;
export type UpdateEntityInput = z.infer<typeof updateEntitySchema>;
export type CreateEntityLinkInput = z.infer<typeof createEntityLinkSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
