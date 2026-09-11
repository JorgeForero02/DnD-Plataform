import { QUIEN_VE, type Visibility } from "@dnd/shared";

// Reseño 2026-09-02, segunda pasada. Qué significa cada nivel, en una frase, para que el DM lo
// lea en el momento de elegir y no tenga que acordarse. Vive en su propio módulo y no junto al
// componente porque un fichero que exporta a la vez componentes y constantes rompe el refresco
// rápido de React — lo avisa el linter, y tiene razón.
//
// Esto es **texto de interfaz**, no una regla: quién ve qué lo decide `canView` en el servidor
// (apps/api/src/common/visibility.ts). Si alguna vez dejan de coincidir, el que miente es este
// fichero.
// U6-visibilidad: la forma legible de cada nivel, para que una pantalla pueda nombrarlo dentro
// de una frase sin duplicar el texto. `ui/Badge.tsx` importa esto en vez de guardar su propia
// copia — antes vivía privado ahí dentro, y "una forma legible por dominio" no admite dos.
export const ETIQUETA_DE_NIVEL: Record<Visibility, string> = {
  PUBLIC: "Público",
  PLAYERS: "Jugadores",
  SPECIFIC_PLAYERS: "Jugadores concretos",
  OWNER_DM: "DM y creador",
  DM_ONLY: "Solo DM",
};

/**
 * **El patrón de audiencia de cada nivel, declarado junto a su frase** (ficha 23) — para poder
 * comprobarlo contra `QUIEN_VE` (`packages/shared/src/visibility.schema.ts`), la misma matriz que
 * `apps/api/src/common/visibilidad-matriz.spec.ts` compara contra `canView`. Antes la frase de
 * audiencia no tenía nada que la mantuviera honesta, y llegó a mentir (ver el aviso más abajo,
 * sobre `PUBLIC`). `noMiembro` no aparece: es `false` en las cinco filas, así que nunca distingue
 * un patrón de otro.
 */
export type PatronDeAudiencia =
  "todosLosDeLaMesa" | "soloLosConcedidos" | "creadorYDm" | "soloElDm";

export const PATRON_DE_NIVEL: Record<Visibility, PatronDeAudiencia> = {
  PUBLIC: "todosLosDeLaMesa",
  PLAYERS: "todosLosDeLaMesa",
  SPECIFIC_PLAYERS: "soloLosConcedidos",
  OWNER_DM: "creadorYDm",
  DM_ONLY: "soloElDm",
};

/**
 * ¿El patrón de audiencia declarado para este nivel sigue siendo el que cuenta `QUIEN_VE`?
 *
 * **Pura — no lanza.** No se llama al construir `EXPLICACION_DE_NIVEL` (ese módulo lo importa
 * `ui/Badge.tsx` y media pantalla más: reventar aquí tumbaría toda la aplicación en producción por
 * una frase de texto). La comprueba `visibilidad.test.tsx`, una vez por nivel — ahí es donde una
 * divergencia real tiene que ponerse roja, no en tiempo de carga del módulo.
 */
export function coincideConQuienVe(nivel: Visibility): boolean {
  const patron = PATRON_DE_NIVEL[nivel];
  const m = QUIEN_VE[nivel];
  switch (patron) {
    case "todosLosDeLaMesa":
      return m.jugador && m.jugadorConcedido && m.creador;
    case "soloLosConcedidos":
      return !m.jugador && m.jugadorConcedido && !m.creador;
    case "creadorYDm":
      return !m.jugador && !m.jugadorConcedido && m.creador;
    case "soloElDm":
      return !m.jugador && !m.jugadorConcedido && !m.creador;
  }
}

/** La frase de audiencia de cada nivel, pegada a su detalle. Solo concatena: nada que comprobar
 * aquí — la comprobación contra `QUIEN_VE` vive en `coincideConQuienVe` y la ejerce la prueba. */
function explicacion(audiencia: string, detalle: string): string {
  return `${audiencia}. ${detalle}`;
}

export const EXPLICACION_DE_NIVEL: Record<Visibility, string> = {
  // Ojo con esta frase: la primera versión prometía que "público" dejaba ver a quien no
  // estuviera en la campaña, y es MENTIRA. canView (apps/api/src/common/visibility.ts) devuelve
  // false para quien no es miembro ANTES de mirar el nivel, así que hoy PUBLIC y PLAYERS
  // producen exactamente el mismo conjunto de espectadores. Está documentado en
  // docs/05-datos.md, que ya lo decía bien cuando este texto lo contradijo.
  PUBLIC: explicacion(
    "Todo el que esté en la campaña",
    "Hoy es lo mismo que «Jugadores»: nadie de fuera entra todavía.",
  ),
  PLAYERS: explicacion(
    "Todos los que se sientan a esta mesa",
    "Lo normal para el mundo que ya han visto.",
  ),
  // (Sí: PUBLIC y PLAYERS coinciden hoy. La diferencia existe en el modelo, guardada para el
  // día en que algo se pueda compartir fuera de la mesa, y por eso el nivel sigue ofreciéndose.)
  SPECIFIC_PLAYERS: explicacion(
    "Solo quienes elijas abajo",
    "Para el secreto que uno sabe y los demás no.",
  ),
  OWNER_DM: explicacion("Tú y quien lo creó", "Nadie más de la mesa."),
  DM_ONLY: explicacion("Solo el DM", "Lo que todavía no ha pasado."),
};
