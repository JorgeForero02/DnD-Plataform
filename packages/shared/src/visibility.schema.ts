import { z } from "zod";

export const visibilitySchema = z.enum([
  "PUBLIC",
  "PLAYERS",
  "SPECIFIC_PLAYERS",
  "OWNER_DM",
  "DM_ONLY",
]);
export const roleSchema = z.enum(["DM", "PLAYER"]);
export const entityTypeSchema = z.enum([
  "NPC",
  "LOCATION",
  "QUEST",
  "FACTION",
  "OBJECT",
  "EVENT",
  "DOCUMENT",
]);

export type Visibility = z.infer<typeof visibilitySchema>;
export type Role = z.infer<typeof roleSchema>;
export type EntityType = z.infer<typeof entityTypeSchema>;
