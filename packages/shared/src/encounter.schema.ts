import { z } from "zod";

// Tarea 2.5.2 — iniciativa y orden de turnos.
//
// **Un encuentro cuelga de la sesión** (`session.schema.ts` ya declara el estado mutable de la
// partida), y dentro hay una lista ORDENADA de combatientes. Cada combatiente apunta a un
// `Character` — desde 2D un PNJ en la mesa ES una fila de `Character`, así que no hace falta un
// segundo tipo de combatiente.
//
// **Todo esto es de servidor.** El spec de la fase 2.5 (§2.5.2) acepta que quede sin pantalla
// hasta que exista la mesa de combate (§2.5.6); lo que se construye aquí es la dependencia real:
// las condiciones caducan por asaltos (2C.4) contra el mismo reloj de campaña que un asalto
// avanza.

export const encounterStatusSchema = z.enum(["ACTIVE", "ENDED"]);
export type EncounterStatus = z.infer<typeof encounterStatusSchema>;

/** Un combatiente tal y como lo pinta el registro — no hay pantalla que lo consuma todavía. */
export const combatantSchema = z.object({
  id: z.string().cuid(),
  characterId: z.string().cuid(),
  initiative: z.number().int(),
  position: z.number().int().nonnegative(),
});
export type Combatant = z.infer<typeof combatantSchema>;

export const encounterSchema = z.object({
  id: z.string().cuid(),
  sessionId: z.string().cuid(),
  status: encounterStatusSchema,
  round: z.number().int().positive(),
  activePosition: z.number().int().nonnegative(),
  combatants: z.array(combatantSchema),
});
export type Encounter = z.infer<typeof encounterSchema>;

/**
 * Empezar un encuentro: quiénes combaten. **El servidor tira la iniciativa**, no se manda un
 * número — el jugador manda a quién representa, no un resultado.
 *
 * Los personajes que compartan `statblockRef` (los PNJ idénticos que 2D instancia) se agrupan
 * automáticamente y comparten una única tirada — el SRD: *"Tu GM hará una única tirada para todo
 * un grupo de criaturas idénticas, de modo que todos los miembros de dicho grupo actuarán a la
 * vez."* Agruparlos no lo decide quien llama: lo decide el servidor mirando `statblockRef`.
 */
export const startEncounterSchema = z.object({
  characterIds: z.array(z.string().cuid()).min(1).max(50),
});
export type StartEncounterInput = z.infer<typeof startEncounterSchema>;

/**
 * El DM corrige un número de iniciativa tras la tirada — como en Foundry, y porque el SRD deja
 * los empates a su criterio. Cambia solo ESTE combatiente: si quiere separar a un grupo que
 * actuaba junto, esta es la puerta.
 */
export const setInitiativeSchema = z.object({
  initiative: z.number().int().min(-20).max(60),
});
export type SetInitiativeInput = z.infer<typeof setInitiativeSchema>;
