import type { CombatantSide, EncounterStatus } from "@dnd/shared";

// Tarea 6 (2026-09-05, iniciativa y bando) — **el vocabulario del combate, una sola vez.**
//
// Dos features van a importar esto —`features/encounters/EmpezarCombate.tsx` y
// `features/sessions/elenco/FichaDeElenco.tsx`—, y la decisión E-07-4 (`docs/decisiones.md`)
// reserva `apps/web/src/dominio/` para el vocabulario del juego que usa más de una pantalla: un
// vocabulario que vive dentro de un solo `features/<x>/` es cómo nacieron las tres copias del
// tipo de daño (`dano.ts`).
//
// **Ningún valor de enumeración llega a la pantalla** (docs/04-convenciones.md): ni `ALLY` ni
// `PREPARING` se pintan crudos en ningún sitio, se traducen aquí y solo aquí.
//
// El bando vive en el combatiente del encuentro, no en el personaje: «enemigo» es una relación en
// un momento, no una propiedad de la criatura (`packages/shared/src/encounter.schema.ts`). Las
// frases de `BANDOS` no prometen otra cosa, y `NEUTRAL` explica lo que de verdad significa en el
// servidor —«no se ha dicho», no «indiferente»—, para que el texto no mienta sobre la regla.

export const NOMBRE_BANDO: Record<CombatantSide, string> = {
  ALLY: "Aliado",
  ENEMY: "Enemigo",
  NEUTRAL: "Neutral",
};

/**
 * Los tres bandos, con su explicación. **Se pintan como radios, no como desplegable**: son
 * opciones con significado y el DM tiene que verlas todas a la vez (regla vinculante del reseño
 * 2026-09-02, `docs/04-convenciones.md`).
 */
export const BANDOS = [
  { valor: "ALLY", nombre: "Aliado", explicacion: "Lucha del lado del grupo." },
  { valor: "ENEMY", nombre: "Enemigo", explicacion: "Lucha contra el grupo." },
  {
    valor: "NEUTRAL",
    nombre: "Neutral",
    explicacion: "Ni una cosa ni la otra, todavía.",
  },
] as const satisfies ReadonlyArray<{ valor: CombatantSide; nombre: string; explicacion: string }>;

export const NOMBRE_ESTADO_DE_COMBATE: Record<EncounterStatus, string> = {
  PREPARING: "Preparando combate",
  ACTIVE: "En combate",
  ENDED: "Combate terminado",
};
