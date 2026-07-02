import { z } from "zod";
import { visibilitySchema } from "./visibility.schema";

export const createSessionSchema = z.object({
  title: z.string().min(1).max(160),
  scheduledAt: z.coerce.date().optional(),
  notes: z.unknown().optional(),
  visibility: visibilitySchema.default("PLAYERS"),
});
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
