import { z } from "zod";
import { roleSchema } from "./visibility.schema";
import { tableRulesSchema } from "./table-rules.schema";

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(5000).optional(),
  // Migración 6 (D-CF-16): la variante de sobrecarga del SRD 5.1, apagada por defecto. Opcional
  // porque `updateCampaignSchema` la reutiliza vía `.partial()` (regla del DM que la enciende
  // más tarde) y porque crear una campaña sin decidirla todavía deja el valor por defecto de
  // Prisma (`false`), el mismo patrón que ya usa `houseTablesEnabled` en `dm-table.schema.ts`.
  encumbranceVariant: z.boolean().optional(),
  // Pulido 2026-09-12, C1 bis (spec del tablero § 2 ter): la partida de PlanarAlly que la mesa
  // enmarca. Solo `http(s)`: el valor va a un `src` de `<iframe>`, y `javascript:` no es una sala.
  // `null` la quita; ausente no la toca (`.partial()` en `updateCampaignSchema`).
  boardRoomUrl: z
    .string()
    .url()
    .max(500)
    .refine((u) => /^https?:\/\//i.test(u), "La sala tiene que ser una dirección http(s).")
    .nullable()
    .optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

// Reglas de la mesa (D-CF-53). Solo por `PATCH`: al crear la campaña se dejan las de siempre.
export const updateCampaignSchema = createCampaignSchema
  .partial()
  .extend({ tableRules: tableRulesSchema.optional() });
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

/**
 * **`entityCount` del listado** (U4, plan tandas 2–5, tarea 33).
 *
 * `GET /campaigns` no cuenta las fichas del mundo con un `_count` de Prisma porque una ficha
 * tiene cinco niveles de visibilidad: contar todas las filas le diría a un jugador cuánto hay
 * escondido de él. El número que viaja es el que resulta de aplicar `canView`
 * (`apps/api/src/common/visibility.ts`) fila a fila para QUIEN PREGUNTA — así que dos personas en
 * la misma mesa pueden ver un número distinto para la misma campaña, y es correcto que así sea.
 *
 * El campo se declara aquí y no en `apps/api` ni en `apps/web` porque es el único contrato: la
 * API lo calcula y la web solo lo pinta.
 */
export const campaignEntityCountSchema = z.number().int().nonnegative();
export type CampaignEntityCount = z.infer<typeof campaignEntityCountSchema>;

/**
 * **Cambiar el papel de un miembro** (plan 11, ficha D2).
 *
 * Hasta hoy **el rol era inmutable de por vida**: para cambiarlo habia que expulsar y reinvitar, y
 * eso **pierde el vinculo del miembro con sus personajes**. No es lo mismo ascender que echar y
 * volver a meter.
 *
 * Solo el DM, y hay una regla que no es opcional: **la mesa no puede quedarse sin ningun DM**.
 * Degradarse siendo el ultimo es un **409 con su motivo**, no un 403: no es que no puedas, es que
 * dejaria la mesa huerfana.
 */
export const changeMemberRoleSchema = z.object({ role: roleSchema });
export type ChangeMemberRoleInput = z.infer<typeof changeMemberRoleSchema>;

/**
 * **Crear una invitacion** (plan 11, fichas D3b y A3).
 *
 * `expiresInDays` es **opcional**, y sin el la invitacion **no caduca** — que es como se han
 * comportado todas hasta hoy, y por eso no se cambia el comportamiento por defecto sin decirlo. La
 * pantalla propone siete dias; el numero lo elige el DM.
 */
export const createInviteSchema = z.object({
  expiresInDays: z.number().int().min(1).max(365).optional(),
});
export type CreateInviteInput = z.infer<typeof createInviteSchema>;
