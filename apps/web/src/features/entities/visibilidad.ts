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
  PUBLIC: "Cualquiera de la campaña, y también quien no esté en ella si algún día se comparte.",
  PLAYERS: "Todos los que se sientan a esta mesa. Lo normal para el mundo que ya han visto.",
  SPECIFIC_PLAYERS: "Solo quienes elijas abajo. Para el secreto que uno sabe y los demás no.",
  OWNER_DM: "Tú y quien lo creó. Nadie más de la mesa.",
  DM_ONLY: "Solo el DM. Lo que todavía no ha pasado.",
};
