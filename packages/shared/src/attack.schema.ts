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
// del servidor.
//
// **Y ahora la parte que este comentario contaba mal, corregida por la revisión de cierre.** Decía
// que acotar la CA a base de ataques «pasa igual en una mesa de verdad, cuando el DM dice "no, no
// le das" en voz alta». Eso es cierto para un objetivo **que está en la mesa**, y es falso justo
// para el caso que D-2.5-5 habilita: sobre un PNJ que el jugador no sabe que existe, en una mesa
// de verdad **no hay tirada que hacer**. La frase describía la situación segura y se usaba para
// autorizar la insegura.
//
// Lo cierto es esto: con el total y el veredicto, **cada ataque es una comparación exacta**, así
// que veinte o treinta peticiones dan la CA. Se acepta, y se acepta escrito —ficha P2 de
// `docs/06-pendientes.md`— con dos cosas que lo hacen soportable: **queda rastro** (cada ataque
// escribe un `ATTACK_RESOLVED` con su objetivo, que el DM ve) y el arreglo bueno está nombrado
// —exigir que el objetivo sea combatiente del encuentro activo—, esperando a la pantalla del
// encuentro. Lo que este sistema no hace, y Foundry tampoco, es pronunciar el número en sí.

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
export const resolveAttackSchema = z
  .object({
    targetCharacterId: z.string().cuid(),
    mode: z.enum(["NORMAL", "ADVANTAGE", "DISADVANTAGE"]).default("NORMAL"),
    /**
     * **Gastar la inspiración en esta tirada de ataque** (plan 08, ficha I8). Misma regla y mismo
     * campo que `rollAttackSchema`: el ataque resuelto contra un objetivo sigue siendo una tirada de
     * ataque, y dejarlo fuera aquí habría hecho que la inspiración funcionara en un botón y no en el
     * de al lado.
     */
    spendInspiration: z.boolean().default(false),
    /**
     * A quién va dirigida la tirada del ataque. **Opcional a propósito**: si no se dice, el
     * servidor la deriva de la visibilidad de quien ataca, igual que hace `rollAttack` desde 2C.
     */
    audience: rollAudienceSchema.optional(),
  })
  .superRefine((v, ctx) => {
    // Se anularían y se perdería para nada. Misma comprobación que las otras dos puertas.
    if (v.spendInspiration && v.mode === "DISADVANTAGE") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["spendInspiration"],
        message:
          "La ventaja de la inspiración y esa desventaja se anulan: tirarías normal y la perderías.",
      });
    }
  });
export type ResolveAttackInput = z.infer<typeof resolveAttackSchema>;

/**
 * La respuesta: la tirada tal cual la devuelve cualquier tirada de la mesa, más el veredicto.
 *
 * **`verdict` está ausente cuando `roll.revealed` es `false`.** Una tirada a ciegas —audiencia
 * `BLIND`— no le enseña el total a quien tiró; enseñarle el veredicto igualmente sería la misma
 * fuga por otra puerta, porque «impacta» ya dice más de lo que una tirada a ciegas promete
 * esconder.
 *
 * **`excedido` (Task 4b, 3A.3, D-CF-146)** — presente solo cuando quien ataca es combatiente de
 * un encuentro `ACTIVE`: un ataque de arma con objetivo gasta la acción del turno como cualquier
 * otra actividad (`EncountersService.gastar`, doctrina "cuenta y avisa, nunca rechaza"), y
 * `true` dice que ya se había gastado. **`ActivitiesService.usar()` no expone esta misma señal
 * todavía** —gasta por la misma puerta pero descarta el resultado (`gastarActivacion`, doctrina
 * de la tarea A2)—; queda pendiente que lo haga, fuera del alcance de esta tarea.
 */
export const attackResolutionSchema = z.object({
  roll: rollResultSchema,
  verdict: attackVerdictSchema.optional(),
  excedido: z.boolean().optional(),
});
export type AttackResolution = z.infer<typeof attackResolutionSchema>;
