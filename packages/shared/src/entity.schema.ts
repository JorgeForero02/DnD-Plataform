import { z } from "zod";
import { visibilitySchema, entityTypeSchema } from "./visibility.schema";

export const entityBodySchema = z.object({
  format: z.literal("markdown"),
  text: z.string().max(50000),
});
export type EntityBody = z.infer<typeof entityBodySchema>;

/**
 * **Lo que se puede pedir al listar fichas del mundo** (ficha U3, plan 14).
 *
 * `q` busca **en el nombre Y en el cuerpo**. Hasta hoy la busqueda era del navegador y solo miraba
 * el nombre, asi que una ficha que dice «la puerta de sal» en su tercer parrafo era inencontrable.
 *
 * **Y va en el servidor por una razon que no es de comodidad**: el resultado tiene que pasar por
 * `canView` ANTES que por el texto. Sin eso, buscar se convierte en un oraculo — un jugador
 * confirma que existe una ficha `DM_ONLY` buscando una palabra que solo esta en ella.
 */
export const listEntitiesQuerySchema = z.object({
  type: entityTypeSchema.optional(),
  q: z.string().max(200).optional(),
});
export type ListEntitiesQuery = z.infer<typeof listEntitiesQuerySchema>;

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

/**
 * **Una fila del listado de enlaces por campaña** (`GET /campaigns/:id/links`, ficha «los enlaces
 * del taller se piden una vez por campaña»). A diferencia de `EntityLink` (por ficha), aquí no hay
 * un extremo «propio» desde el que mirar `direction` — la fila trae los dos extremos con nombre y
 * tipo, y quien consuma la lista decide cómo agruparlos. `canView` ya se aplicó en el servidor a
 * los DOS extremos antes de que la fila llegue aquí.
 */
export const campaignLinkRowSchema = z.object({
  id: z.string(),
  fromId: z.string(),
  toId: z.string(),
  label: z.string().nullable(),
  from: z.object({ id: z.string(), name: z.string(), type: entityTypeSchema }),
  to: z.object({ id: z.string(), name: z.string(), type: entityTypeSchema }),
});

export type CreateEntityInput = z.infer<typeof createEntitySchema>;
export type UpdateEntityInput = z.infer<typeof updateEntitySchema>;
export type CreateEntityLinkInput = z.infer<typeof createEntityLinkSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CampaignLinkRow = z.infer<typeof campaignLinkRowSchema>;
