import { z } from "zod";
import { visibilitySchema } from "./visibility.schema";

// Tarea 2A.13 — tirar de verdad.
//
// **Por qué esto es una tarea y no un detalle.** 2A.1 solo *evalúa* una expresión; nadie la
// ejecutaba. De este endpoint dependen tres cosas: las tiradas de creación de personaje
// (2A.6), el disparador «una tirada falla» del motor de eventos, y la línea de tiempo de la
// sesión. Sin él, ninguna de las tres existe.
//
// **Quien tira elige quién lo ve.** Una tirada oculta del DM es `DM_ONLY`; la de un jugador en
// la mesa es `PLAYERS`. Es el mismo modelo de visibilidad de todo lo demás, y por eso no hay
// nada nuevo que aprender.

export const createRollSchema = z.object({
  /** `d20`, `2d20kh1`, `4d6kh3`, `1d8+3`… Lo valida el evaluador de 2A.1. */
  expression: z.string().min(1).max(120),
  /** Qué se está tirando, en palabras: «Percepción», «Salvación de Destreza». */
  label: z.string().min(1).max(120).optional(),
  /**
   * Clase de Dificultad, si la había. **Opcional a propósito:** en la mesa se tira muchas veces
   * sin CD —daño, iniciativa, una tirada de dados a secas— y obligar a poner una convertiría
   * cada tirada en una pregunta.
   */
  dc: z.number().int().min(1).max(50).optional(),
  /** El personaje que tira, si es de alguien. Sin él, la tirada es de la campaña. */
  characterId: z.string().cuid().optional(),
  /**
   * La sesión a la que pertenece. **Si no se dice, se usa la que esté en curso**, que es lo que
   * quiere quien tira durante una partida; y si no hay ninguna, la tirada queda fuera de sesión
   * en vez de fallar.
   */
  sessionId: z.string().cuid().optional(),
  visibility: visibilitySchema.default("PLAYERS"),
});
export type CreateRollInput = z.infer<typeof createRollSchema>;

/**
 * **`natural` y `outcome` son dos hechos distintos, y por eso son dos campos.**
 *
 * Un 20 natural que no llega a la CD **sigue siendo un 20 natural**; un 1 natural que la supera
 * sigue siendo un 1. Guardarlos en un solo campo obliga a elegir cuál se pierde, y en la mesa
 * los dos se cantan.
 */
export const rollNaturalSchema = z.enum(["NONE", "ONE", "TWENTY"]);
export const rollOutcomeSchema = z.enum(["NO_DC", "SUCCESS", "FAILURE"]);

/** Lo que devuelve el servidor: el resultado, y el evento que quedó escrito. */
export const rollResultSchema = z.object({
  eventId: z.string(),
  expression: z.string(),
  /** Todos los dados que cayeron, en el orden en que salieron. */
  rolls: z.array(z.number().int()),
  /** Los que cuentan, y los que descartó un `kh`/`kl`. **Lo descartado no se pierde.** */
  kept: z.array(z.number().int()),
  dropped: z.array(z.number().int()),
  /** La parte que no son dados: el `+3` de `1d8+3`. */
  modifier: z.number().int(),
  total: z.number().int(),
  dc: z.number().int().optional(),
  natural: rollNaturalSchema,
  outcome: rollOutcomeSchema,
});
export type RollResult = z.infer<typeof rollResultSchema>;
