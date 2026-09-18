import { z } from "zod";

// Task 8 de 3A.2 («elegir, lanzar y usar») — el daño extra al impactar: Ataque furtivo (pícaro)
// y Castigo divino (paladín). El jugador lo marca sobre SU tirada de daño pendiente; el DM lo
// confirma al aplicar la bandeja (D-CF-129, `docs/decisiones.md`). Vocabulario cerrado: solo
// estas dos claves hoy — Marca del cazador (explorador) queda para 3B, con la ficha del
// explorador, porque necesita saber de la elección de presa que esta tarea no toca.

export const DAMAGE_EXTRA_KEYS = ["sneak-attack", "divine-smite"] as const;
export const damageExtraKeySchema = z.enum(DAMAGE_EXTRA_KEYS);
export type DamageExtraKey = z.infer<typeof damageExtraKeySchema>;

/**
 * Lo que pide quien marca el extra sobre una tirada de daño pendiente propia (o de su
 * personaje). `nivelDeEspacio` solo tiene sentido para Castigo divino — sin él, se gasta el
 * espacio de nivel 1 (la web de esta tarea no ofrece selector de nivel: ver el informe de la
 * tarea, Ruling correspondiente).
 */
export const addDamageExtraSchema = z.object({
  key: damageExtraKeySchema,
  nivelDeEspacio: z.number().int().min(1).max(5).optional(),
});
export type AddDamageExtraInput = z.infer<typeof addDamageExtraSchema>;

/**
 * Un extra ya tirado y colgado de `pendingDamage.extras` (`game-event.schema.ts`). El dado ya
 * salió —`amount`— y el `rollEventId` es la tirada propia que lo tiró, sin `pendingDamage` (no
 * es un daño que se aplique por sí solo: viaja dentro del daño principal).
 */
export const damageExtraSchema = z.object({
  key: damageExtraKeySchema,
  label: z.string().min(1).max(120),
  amount: z.number().int().min(0),
  rollEventId: z.string().min(1),
});
export type DamageExtra = z.infer<typeof damageExtraSchema>;

/**
 * Lo que la hoja del atacante ofrece marcar todavía, con el dado ya resuelto en el texto
 * («Ataque furtivo (2d6)»): la casilla no promete un número que no vaya a tirar.
 */
export const damageExtraOptionSchema = z.object({
  key: damageExtraKeySchema,
  label: z.string().min(1).max(120),
});
export type DamageExtraOption = z.infer<typeof damageExtraOptionSchema>;
