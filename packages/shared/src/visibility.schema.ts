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

/**
 * **La matriz declarada de quién ve qué, por nivel.** Ficha 23: el texto de visibilidad de la web
 * (`apps/web/src/features/entities/visibilidad.ts`) mintió una vez sobre esto, y la razón era que
 * la prosa se escribía a mano sin nada que la comparase con `canView`
 * (`apps/api/src/common/visibility.ts`), que es el dueño único de la regla.
 *
 * Vive en `@dnd/shared` — no en la API ni en la web — porque las dos la necesitan y ninguna puede
 * importar de la otra: la API la usa como fixture de `apps/api/src/common/visibilidad-matriz.spec.ts`
 * (que la compara contra `canView` de verdad) y la web la usa para componer `EXPLICACION_DE_NIVEL`.
 *
 * Los cinco espectadores de mentira, todos jugadores de una campaña salvo `noMiembro`:
 *
 * - `noMiembro`: no es miembro de la campaña (rol `null`, no admin). `canView` corta en seco antes
 *   de mirar el nivel: nunca ve nada, así que esta columna es `false` en las cinco filas.
 * - `jugador`: miembro `PLAYER` cualquiera — ni el creador del recurso, ni alguien nombrado en sus
 *   concesiones.
 * - `jugadorConcedido`: miembro `PLAYER` que SÍ aparece en `grantedUserIds` del recurso.
 * - `creador`: miembro `PLAYER` que es el `createdById` del recurso (y no está, por eso solo,
 *   nombrado en `grantedUserIds`: son dos preguntas distintas para `canView`).
 * - `dm`: rol `DM`. `canView` lo deja pasar siempre, antes de mirar el nivel — por eso la fila es
 *   `true` en las cinco.
 */
export const QUIEN_VE: Record<
  Visibility,
  {
    noMiembro: boolean;
    jugador: boolean;
    jugadorConcedido: boolean;
    creador: boolean;
    dm: boolean;
  }
> = {
  PUBLIC: { noMiembro: false, jugador: true, jugadorConcedido: true, creador: true, dm: true },
  PLAYERS: { noMiembro: false, jugador: true, jugadorConcedido: true, creador: true, dm: true },
  SPECIFIC_PLAYERS: {
    noMiembro: false,
    jugador: false,
    jugadorConcedido: true,
    creador: false,
    dm: true,
  },
  OWNER_DM: { noMiembro: false, jugador: false, jugadorConcedido: false, creador: true, dm: true },
  DM_ONLY: {
    noMiembro: false,
    jugador: false,
    jugadorConcedido: false,
    creador: false,
    dm: true,
  },
};
