import { z } from "zod";
import { rollAudienceSchema, rollResultSchema } from "./roll.schema";

// Tarea 2.5.3 — el ataque, comparado en el servidor.
//
// El jugador pide «ataco al objetivo X con mi cimitarra». El servidor deriva su bono de ataque
// (ya lo hacía, con su traza), tira con el azar suyo, compara con la CA del objetivo —que ya
// sabe derivar— y **propone** un veredicto: impacta, falla o es crítico. El DM confirma o
// corrige; ni el impacto ni el daño se aplican solos (§4 del spec de la fase 2.5, "el sistema
// propone; el DM dispone").
//
// **Qué se publica, y con qué visibilidad — decidido a propósito, no por omisión.** La tirada
// (el total, los dados que la componen) y el veredicto viajan con la MISMA audiencia que
// cualquier otra tirada del atacante: es lo que el atacante ya sabe en una mesa real —su propio
// d20 y si impactó—, así que ocultárselo a él mismo no protegería nada que la mesa de verdad
// no cuente en voz alta. **Lo único que nunca sale de aquí, ni en la respuesta ni en el suceso
// del registro, es el número contra el que se comparó** (`character-sheet.service.ts`,
// `resolveAttack`): la CA no es un campo que se redacte, es un campo que nunca se calcula fuera
// del servidor. Dos ataques bien elegidos por un jugador atento sí acotan algo sobre la CA de un
// objetivo fijo con el tiempo — y eso pasa igual en una mesa de verdad, cuando el DM dice «no,
// no le das» en voz alta: no es un agujero de este sistema, es cómo funciona un ataque en 5.ª
// edición. Lo que este sistema no hace, y Foundry tampoco, es pronunciar el número en sí.

/**
 * **Tres estados, no dos.** Un 20 natural impacta pase lo que pase con la CA (SRD 5.1,
 * "Resolving Attacks": *"If the d20 roll for an attack is a 20, the attack hits regardless of
 * any modifiers or the target's AC. This is called a critical hit."*) y es un hecho distinto de
 * un impacto corriente — dobla los dados de daño. Colapsarlo en `HIT` perdería esa distinción en
 * la única capa que la conoce sin volver a mirar la tirada.
 */
export const attackVerdictSchema = z.enum(["HIT", "MISS", "CRITICAL"]);
export type AttackVerdict = z.infer<typeof attackVerdictSchema>;

/**
 * Lo que el jugador manda para pedir el ataque: a quién apunta, y con qué modo de tirada. **Sin
 * `critical`**: a diferencia de `rollAttackSchema` (2C), aquí no hay nada que el cliente decida
 * sobre si el golpe fue crítico — sale de la propia tirada, no del cuerpo de la petición.
 */
export const resolveAttackSchema = z.object({
  targetCharacterId: z.string().cuid(),
  mode: z.enum(["NORMAL", "ADVANTAGE", "DISADVANTAGE"]).default("NORMAL"),
  /**
   * A quién va dirigida la tirada del ataque. **Opcional a propósito**: si no se dice, el
   * servidor la deriva de la visibilidad de quien ataca, igual que hace `rollAttack` desde 2C.
   */
  audience: rollAudienceSchema.optional(),
});
export type ResolveAttackInput = z.infer<typeof resolveAttackSchema>;

/**
 * La respuesta: la tirada tal cual la devuelve cualquier tirada de la mesa, más el veredicto.
 *
 * **`verdict` está ausente cuando `roll.revealed` es `false`.** Una tirada a ciegas —audiencia
 * `BLIND`— no le enseña el total a quien tiró; enseñarle el veredicto igualmente sería la misma
 * fuga por otra puerta, porque «impacta» ya dice más de lo que una tirada a ciegas promete
 * esconder.
 */
export const attackResolutionSchema = z.object({
  roll: rollResultSchema,
  verdict: attackVerdictSchema.optional(),
});
export type AttackResolution = z.infer<typeof attackResolutionSchema>;
