import { z } from "zod";

// Paso 2, tarea A1 — la economía de acciones del turno.
//
// Hasta aquí un `Combatant` tenía iniciativa, grupo, posición y bando, pero **nada que contara
// acciones**: «acción impetuosa te da una acción extra» no significa nada si no hay acciones que
// contar. Este fichero declara el vocabulario cerrado de costes y la forma de la economía del
// turno; las tareas 2, 3 y 7 gastan y consultan esto, no reinventan su propio conjunto.
//
// **Se repone al EMPEZAR el turno de quien entra, no al terminar el anterior.** Fuente, SRD 5.1,
// «Reactions»: *«you regain your reaction at the start of your turn»*
// (<https://5thsrd.org/combat/actions-in-combat/#reactions>). Entre el final de un turno y el
// principio del siguiente no hay reacción disponible para nadie, y por eso un combatiente
// reacciona como mucho una vez por asalto.

/** Vocabulario cerrado de costes de una actividad, en el orden en que el SRD las presenta. */
export const COSTES = ["ACTION", "BONUS", "REACTION", "MOVEMENT", "FREE"] as const;
export type Coste = (typeof COSTES)[number];
export const costeSchema = z.enum(COSTES);

/**
 * Lo que un combatiente tiene disponible en el turno en curso.
 *
 * `movementUsed` es un contador en pies, no un booleano: el movimiento se gasta en tramos (mover,
 * atacar, seguir moviendo) y un booleano no podría decir cuánto queda.
 */
export const economiaDelTurnoSchema = z.object({
  actionUsed: z.boolean(),
  bonusUsed: z.boolean(),
  reactionUsed: z.boolean(),
  /** En pies, gastados de su velocidad. */
  movementUsed: z.number().int().nonnegative(),
});
export type EconomiaDelTurno = z.infer<typeof economiaDelTurnoSchema>;
