import { z } from "zod";
import { visibilitySchema } from "./visibility.schema";

export const createCharacterSchema = z.object({
  name: z.string().min(1).max(120),
  race: z.string().max(60).optional(),
  class: z.string().max(60).optional(),
  level: z.number().int().min(1).max(20).default(1),
  bio: z.string().max(5000).optional(),
  visibility: visibilitySchema.default("PLAYERS"),
});
export const updateCharacterSchema = createCharacterSchema.partial();

export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;
