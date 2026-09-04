import { condicionesActivas, type CondicionConVencimiento } from "../conditions/vencimiento";

// Tarea 2.5.4 — la salvación de concentración (hueco M17). **Pura**: sin Nest, sin Prisma, misma
// familia que `../damage/apply-damage-modifiers.ts` y `../speed/effective-speed.ts`.
//
// SRD 5.1 ("Casting a Spell" / "Concentration", texto en inglés — es el que manda cuando las
// ediciones discrepan, `docs/04-convenciones.md`; verificado contra dos fuentes independientes
// que citan el CC-BY original, dnd5eapi.co y el "Basic Rules" de D&D Beyond):
//
//   «Whenever you take damage while you are concentrating on a spell, you must make a
//   Constitution saving throw to maintain your concentration. The DC equals 10 or half the
//   damage you take, whichever number is higher.»
//
//   «If you take damage from multiple sources, such as an arrow and a dragon's breath, you make
//   a separate saving throw for each source of damage.»
//
// Dos consecuencias directas de esa cita:
//
//  1. **La CD es `max(10, floor(daño / 2))`.** El redondeo hacia abajo no está en esta frase con
//     esas palabras, pero es la misma convención de división que ya usa el proyecto para "la
//     mitad" (`apply-damage-modifiers.ts`, con el ejemplo del propio SRD).
//  2. **Una salvación por CADA fuente de daño, no una por turno.** Este módulo no impone eso: lo
//     impone quien llama, por construcción — cada golpe que pasa por `changeHp` pide la suya, sin
//     acumular ni deduplicar entre golpes del mismo asalto.
//
// **Basta con pedirla.** El sistema no decide si la concentración se pierde —eso es tirar el
// dado y compararlo con la CD, que ya hace el tirador de 2C cuando alguien responde la
// petición—, solo tiene que impedir que se olvide de pedirse.

/**
 * La clave con la que la mesa marca que un personaje está concentrado, por convención del
 * proyecto y no del SRD: la concentración **no** es una de las quince condiciones cerradas
 * (`SRD_CONDITIONS`) — el informe de huecos que las cerró avisó explícitamente de que dejaba la
 * concentración fuera— así que se guarda con la clave libre que `ConditionsService` ya admite
 * para cualquier cosa que el motor no calcula. `"concentrating-on-bless"` es el ejemplo que trae
 * el propio spec de la fase 2.5; el prefijo es lo único que hace falta reconocer.
 */
export const CONCENTRATION_KEY_PREFIX = "concentrating";

/** ¿Hay, entre las condiciones VIGENTES (no vencidas), alguna de concentración? */
export function estaConcentrado(
  condiciones: CondicionConVencimiento[],
  relojSegundos: number,
): boolean {
  return condicionesActivas(condiciones, relojSegundos).some((c) =>
    c.key.startsWith(CONCENTRATION_KEY_PREFIX),
  );
}

/**
 * La CD de la salvación de concentración, a partir del **daño tomado**: después de resistencia y
 * vulnerabilidad —que cambian cuánto daño te hace el golpe— y **antes de los PG temporales**, que
 * no cambian el daño sino quién lo paga.
 *
 * Aquí ponía «y PG temporales», y era falso. *«Whenever you take damage…»* y *«half the damage you
 * take»*: el SRD describe los temporales como algo que se gasta **cuando tomas daño** —«when you
 * have temporary hit points and take damage»—, así que absorben el golpe, no lo impiden. Con la
 * versión anterior, un mago con 5 temporales que encajaba 5 no tiraba ninguna salvación. Lo
 * encontró la revisión de cierre y se verificó contra la fuente antes de cambiar nada.
 */
export function concentrationSaveDc(damage: number): number {
  return Math.max(10, Math.floor(damage / 2));
}
