import type { Visibility } from "@dnd/shared";

// Reseño 2026-09-02, segunda pasada. Qué significa cada nivel, en una frase, para que el DM lo
// lea en el momento de elegir y no tenga que acordarse. Vive en su propio módulo y no junto al
// componente porque un fichero que exporta a la vez componentes y constantes rompe el refresco
// rápido de React — lo avisa el linter, y tiene razón.
//
// Esto es **texto de interfaz**, no una regla: quién ve qué lo decide `canView` en el servidor
// (apps/api/src/common/visibility.ts). Si alguna vez dejan de coincidir, el que miente es este
// fichero.
export const EXPLICACION_DE_NIVEL: Record<Visibility, string> = {
  // Ojo con esta frase: la primera versión prometía que "público" dejaba ver a quien no
  // estuviera en la campaña, y es MENTIRA. canView (apps/api/src/common/visibility.ts) devuelve
  // false para quien no es miembro ANTES de mirar el nivel, así que hoy PUBLIC y PLAYERS
  // producen exactamente el mismo conjunto de espectadores. Está documentado en
  // docs/05-datos.md, que ya lo decía bien cuando este texto lo contradijo.
  PUBLIC:
    "Todo el que esté en la campaña. Hoy es lo mismo que «Jugadores»: nadie de fuera entra todavía.",
  PLAYERS: "Todos los que se sientan a esta mesa. Lo normal para el mundo que ya han visto.",
  // (Sí: PUBLIC y PLAYERS coinciden hoy. La diferencia existe en el modelo, guardada para el
  // día en que algo se pueda compartir fuera de la mesa, y por eso el nivel sigue ofreciéndose.)
  SPECIFIC_PLAYERS: "Solo quienes elijas abajo. Para el secreto que uno sabe y los demás no.",
  OWNER_DM: "Tú y quien lo creó. Nadie más de la mesa.",
  DM_ONLY: "Solo el DM. Lo que todavía no ha pasado.",
};
