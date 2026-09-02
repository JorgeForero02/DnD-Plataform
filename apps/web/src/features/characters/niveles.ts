import type { Visibility } from "@dnd/shared";

// Los niveles de visibilidad que un personaje admite de verdad.
//
// `SPECIFIC_PLAYERS` se deja fuera a propósito, por el mismo motivo que en las sesiones:
// `Character` no tiene concesiones (docs/05-datos.md), así que sería una opción que no hace
// nada. `OWNER_DM` sí es pleno aquí — `ownerId` es quien lo creó, de modo que significa
// literalmente «el dueño y el DM».
//
// Vive en su propio módulo, y no junto a un componente, porque un fichero que exporta a la vez
// componentes y constantes rompe el refresco rápido de React (lo avisa el linter).
export const CHARACTER_VISIBILITIES: Visibility[] = ["PUBLIC", "PLAYERS", "OWNER_DM", "DM_ONLY"];
