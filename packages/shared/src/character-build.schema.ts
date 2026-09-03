import { z } from "zod";
import { proficiencyLevelSchema } from "./rules/trace.schema";
import { resolvedItemSchema } from "./item.schema";

// Tareas 2A.3 / 2A.4, corregido tras la revisión del 2026-09-02.
//
// **Por qué esto vive aquí y no en `apps/api`.** La forma de los datos vive una sola vez, en
// `packages/shared` (`docs/01-arquitectura.md`), y la entrada se valida con Zod desde
// `@dnd/shared` (`docs/04-convenciones.md`). Eran interfaces de TypeScript sueltas dentro de la
// API, y eso **no era neutro**: una `abilities` a la que le faltara una característica daba
// `undefined`, y el `NaN` se propagaba en silencio a **todos** los valores derivados —
// modificadores, PG máximos, CA— sin que nada lo parase, porque nadie validaba a la salida.
//
// La revisión lo llamó «una trampa puesta para 2A.6», y tenía razón: el día que hubiera un
// endpoint, el cuerpo de la petición habría llegado sin esquema.

export const contentRefSchema = z.union([
  z.object({ source: z.literal("SRD"), key: z.string().min(1).max(60) }),
  z.object({ source: z.literal("CAMPAIGN"), id: z.string().min(1).max(60) }),
]);
export type ContentRefInput = z.infer<typeof contentRefSchema>;

/**
 * Las seis, **todas obligatorias**. Un `Partial` aquí es exactamente el agujero por el que
 * entraba el `NaN`.
 *
 * El rango 1–30 es el del SRD para una criatura; no se acota más porque una anulación manual
 * del DM es legítima y el motor ya sabe representarla.
 */
export const abilityScoresSchema = z.object({
  str: z.number().int().min(1).max(30),
  dex: z.number().int().min(1).max(30),
  con: z.number().int().min(1).max(30),
  int: z.number().int().min(1).max(30),
  wis: z.number().int().min(1).max(30),
  cha: z.number().int().min(1).max(30),
});

/** Lo elegido, por clave de concesión. La fila persistida de 2A.6 tiene esta misma forma. */
export const characterChoicesSchema = z.record(
  z.string().min(1).max(60),
  z.array(z.string().min(1).max(60)).max(20),
);
export type CharacterChoices = z.infer<typeof characterChoicesSchema>;

export const characterBuildSchema = z.object({
  abilities: abilityScoresSchema,
  race: contentRefSchema,
  subrace: contentRefSchema.optional(),
  class: contentRefSchema,
  // **1 a 20.** Sin este tope, el nivel 21 daba bonificador de competencia +7, fuera de la
  // tabla del SRD y sin que ningún invariante lo notara; y un nivel 0 o negativo daba PG
  // máximos negativos, porque el suelo del motor es `level` y no 1.
  level: z.number().int().min(1).max(20),
  /** Armadura y escudo equipados. El tope evita una lista arbitraria por HTTP. */
  armor: z.array(contentRefSchema).max(8).optional(),
  /**
   * El **equipo equipado ya resuelto** (fase 2B): armadura, escudo, armas y objetos con
   * efectos, vengan del SRD o de la campaña.
   *
   * Va resuelto y no por referencia **a propósito**: quien resuelve una referencia de campaña
   * tiene que comprobar además que ese objeto pertenece a la campaña del personaje, y esa
   * comprobación necesita la base de datos, que el resolutor no toca (ficha S8 de
   * `docs/06-pendientes.md`). Aquí llegan objetos, no identificadores, así que no hay ningún
   * `else` en el que se pueda colar un IDOR entre campañas.
   */
  items: z.array(resolvedItemSchema).max(60).optional(),
  skillProficiencies: z.record(z.string().min(1).max(60), proficiencyLevelSchema).optional(),
  choices: characterChoicesSchema.optional(),
});
export type CharacterBuildInput = z.infer<typeof characterBuildSchema>;

/** Lo que el jugador propone para una concesión concreta. Es lo que valida el `PATCH` de 2A.6. */
export const submitChoiceSchema = z.object({
  grantId: z.string().min(1).max(60),
  picks: z.array(z.string().min(1).max(60)).max(20),
});
export type SubmitChoiceInput = z.infer<typeof submitChoiceSchema>;
