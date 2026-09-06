import { combatantSideSchema, type CombatantSide, type EncounterStatus } from "@dnd/shared";

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
//
// **Sin la función defensiva `traducir` que tiene `dano.ts`.** Allí hace falta porque un tipo de
// daño puede venir de datos viejos que la tabla no cubra; aquí el `Record` de cada tabla es
// exhaustivo en compilación —`CombatantSide` y `EncounterStatus` cierran las claves posibles— y
// una clave fuera de tabla no puede existir, así que esa red sería para un caso imposible.

export const NOMBRE_BANDO: Record<CombatantSide, string> = {
  ALLY: "Aliado",
  ENEMY: "Enemigo",
  NEUTRAL: "Neutral",
};

/**
 * La explicación de cada bando, aparte del nombre: es texto de producto, no relleno, porque
 * `BANDOS` se pinta como radios y cada frase es lo único que le dice al DM qué hace el bando en
 * la mesa.
 */
const EXPLICACION_BANDO: Record<CombatantSide, string> = {
  ALLY: "Lucha del lado del grupo.",
  ENEMY: "Lucha contra el grupo.",
  NEUTRAL: "Ni una cosa ni la otra, todavía.",
};

/**
 * Los tres bandos, con su explicación. **Se pintan como radios, no como desplegable**: son
 * opciones con significado y el DM tiene que verlas todas a la vez (regla vinculante del reseño
 * 2026-09-02, `docs/04-convenciones.md`).
 *
 * Se construye a partir de `NOMBRE_BANDO` y `EXPLICACION_BANDO` — no repite los nombres como
 * literales sueltos — así que el nombre de un bando vive en un solo sitio y añadir uno nuevo
 * obliga a rellenar las dos tablas o el build no compila.
 */
export const BANDOS = combatantSideSchema.options.map((valor) => ({
  valor,
  nombre: NOMBRE_BANDO[valor],
  explicacion: EXPLICACION_BANDO[valor],
})) satisfies ReadonlyArray<{ valor: CombatantSide; nombre: string; explicacion: string }>;

export const NOMBRE_ESTADO_DE_COMBATE: Record<EncounterStatus, string> = {
  PREPARING: "Preparando combate",
  ACTIVE: "En combate",
  ENDED: "Combate terminado",
};
