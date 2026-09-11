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

/**
 * ¿Este nivel de visibilidad lo ve **la mesa entera**?
 *
 * **Movido aquí desde `apps/api/src/common/visibility.ts` (fix round 3, Task 26).** Vivía allí,
 * junto a `canView`, con la misma razón que documenta `QUIEN_VE`: es un trozo de la matriz de
 * visibilidad, y esa matriz no se reimplementa por ahí suelta — ya se había escrito mal tres
 * veces (`rollAttack`, `resolveAttack`, la iniciativa de `EncountersService.start`, todas con un
 * `=== "PLAYERS"` que dejaba fuera a `PUBLIC`). Cuando Task 26 necesitó la misma pregunta en la
 * web para sembrar el selector de audiencia de `TirarAtaqueBoton.tsx`, la web no podía importar
 * de `apps/api` (`docs/01-arquitectura.md`) y la respuesta correcta no era copiarla a mano por
 * segunda vez — era subirla al paquete que las dos ya comparten. `apps/api/src/common/
 * visibility.ts` la re-exporta desde aquí para que ningún sitio de la API que ya la importaba
 * tenga que cambiar su import.
 *
 * `OWNER_DM` y `SPECIFIC_PLAYERS` no están, y no es un olvido: los ve **alguien**, no la mesa. Una
 * audiencia de registro solo distingue «todos» de «solo el DM», así que para esos dos lo correcto
 * es lo cerrado — quien tiene derecho a más lo verá por la ficha, no por la línea de tiempo.
 */
export function loVeLaMesa(visibility: string): boolean {
  return visibility === "PUBLIC" || visibility === "PLAYERS";
}
