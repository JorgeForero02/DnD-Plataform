import { z } from "zod";
import { visibilitySchema, entityTypeSchema } from "./visibility.schema";

export const entityBodySchema = z.object({
  format: z.literal("markdown"),
  text: z.string().max(50000),
});
export type EntityBody = z.infer<typeof entityBodySchema>;

export const createEntitySchema = z.object({
  type: entityTypeSchema,
  name: z.string().min(1).max(160),
  body: entityBodySchema.optional(),
  /**
   * **Las etiquetas se NORMALIZAN al guardar, no se rechazan** (2026-09-05).
   *
   * Escribir «lich, lich» persistía `["lich", "lich"]`: las filas dedupaban **al pintar**, que tapa
   * el síntoma y deja la fila sucia — y quien consulte por etiqueta desde otro sitio cuenta dos.
   *
   * **Se normaliza y no se rechaza** porque rechazar obliga a la persona a arreglar algo que la
   * máquina arregla sola, y **un duplicado no significa nada**: no hay ninguna intención que
   * `["lich","lich"]` exprese y `["lich"]` no. Se conserva **el orden de la primera aparición**,
   * que es el que quien escribe tiene en la cabeza.
   *
   * Vive en el esquema compartido y no en la pantalla a propósito: la web no es la única puerta,
   * y una normalización que solo hace el cliente es una que la API no tiene.
   */
  tags: z
    .array(z.string().min(1).max(40))
    .max(50)
    .default([])
    .transform((etiquetas) => [...new Set(etiquetas)]),
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
