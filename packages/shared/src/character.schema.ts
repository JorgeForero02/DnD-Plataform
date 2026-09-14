import { z } from "zod";
import { visibilitySchema } from "./visibility.schema";

/**
 * **El color de un personaje: una CLAVE de una lista corta, nunca un hexadecimal** (decisión D3).
 *
 * Tres motivos, y ninguno es estético:
 * 1. **Los temas.** El mismo color tiene que verse en Oscuro, Claro y Lectura. Un `#c07d46` que un
 *    jugador elige sobre pizarra es ilegible sobre el pliego de vitela.
 * 2. **El contraste se mide una vez.** Una clave se comprueba en los tres temas y queda comprobada;
 *    un hexadecimal libre no se puede medir por adelantado.
 * 3. **Es la regla del proyecto**: ningún valor de enumeración llega a la pantalla, y su forma
 *    legible se escribe una vez por dominio — aquí, en `apps/web/src/dominio/`.
 *
 * **Ocho es el techo, y es una decisión.** Más de ocho voces en una mesa no se distinguen aunque el
 * token exista, así que ampliar la lista no arregla nada que la elección no arregle mejor.
 *
 * **Cambiar esta lista cambia el color por defecto de todo el que no haya elegido**, porque el
 * defecto es una huella sobre ella. Es aceptable **una vez**; después se congela.
 */
export const CHARACTER_COLORS = [
  "tinta",
  "cobre",
  "senal",
  "brasa",
  "salvia",
  "ciruela",
  "indigo",
  "arena",
] as const;
export const characterColorSchema = z.enum(CHARACTER_COLORS);
export type CharacterColor = z.infer<typeof characterColorSchema>;

export const createCharacterSchema = z.object({
  name: z.string().min(1).max(120),
  level: z.number().int().min(1).max(20).default(1),
  bio: z.string().max(5000).optional(),
  visibility: visibilitySchema.default("PLAYERS"),
  /**
   * **`null` significa «no lo he elegido, dame el de por defecto»**, no «negro».
   *
   * Un valor escrito significa «lo elegí yo», y **eso no se pisa nunca** con un recálculo: el
   * defecto se deriva del `id` del personaje al pintar, no se guarda.
   */
  color: characterColorSchema.nullable().optional(),
});
export const updateCharacterSchema = createCharacterSchema.partial().extend({
  /**
   * PNJ del mundo y la mesa (spec §3.1): la ficha del mundo de la que este cuerpo es. **Solo el DM**
   * (403 al dueño, como `level`); `null` desenlaza. El servidor exige `type: NPC` y misma campaña.
   */
  entityId: z.string().cuid().nullable().optional(),
});

export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
export type UpdateCharacterInput = z.infer<typeof updateCharacterSchema>;
