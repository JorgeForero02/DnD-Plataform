import { z } from "zod";
import { visibilitySchema } from "./visibility.schema";

// Tarea 2C.6 — **las tablas del DM**, opcionales y apagadas por defecto.
//
// ## Lo que dice la fuente, y por qué eso decide la forma
//
// **El SRD no trae ninguna tabla de críticos ni de pifias.** Lo único oficial es que un crítico
// **duplica los dados y no los modificadores**, que es lo que la fase 2B ya hace. Todas las tablas
// que circulan —«te rompes el arma», «pierdes el turno»— son caseras.
//
// El autor las quiere porque **el DM de esta mesa las usa**, y esa es una razón perfectamente
// válida. Pero entonces entran como lo que son: **una regla de la casa, no una regla del juego**.
// De ahí las tres decisiones de forma:
//
//  1. **Interruptor por campaña, apagado por defecto** (`Campaign.houseTablesEnabled`). Con él
//     apagado, un crítico sigue duplicando dados y nada más — que es exactamente lo que dice el
//     manual.
//  2. **La pantalla lo dice a la vista.** Una casa que cambia una regla lo hace a la vista; una
//     tabla que se dispara sin avisar convierte una partida de 5.ª edición en otra cosa sin que
//     los jugadores se enteren.
//  3. **Se construye como primitiva, no como «funcionalidad de pifias».** Tirar sobre una tabla
//     con sus resultados y su visibilidad sirve igual para **botín, rumores y encuentros
//     aleatorios**, que es lo que el alcance de la fase 2 ya sospechaba. Una pieza, tres usos.

/**
 * Para qué se consulta sola una tabla.
 *
 * `NONE` es una tabla que solo se tira a mano —botín, rumores— y es el caso por defecto. Las otras
 * dos son las que el interruptor gobierna.
 */
export const tableTriggerSchema = z.enum(["NONE", "CRITICAL", "FUMBLE"]);
export type TableTrigger = z.infer<typeof tableTriggerSchema>;

/**
 * Una fila: **un rango y un texto**. Rango y no un solo número porque así se escribe una tabla de
 * verdad —«01-20: se te encasquilla el arma»— y porque una tabla de d100 con cien filas de un
 * número cada una es la misma tabla escrita cien veces.
 */
export const dmTableEntrySchema = z
  .object({
    min: z.number().int().min(1).max(1000),
    max: z.number().int().min(1).max(1000),
    text: z.string().min(1).max(500),
  })
  .refine((e) => e.max >= e.min, {
    message: "El final del rango no puede ser menor que el principio.",
  });
export type DmTableEntryInput = z.infer<typeof dmTableEntrySchema>;

export const createDmTableSchema = z
  .object({
    name: z.string().min(1).max(120),
    description: z.string().max(500).optional(),
    /**
     * Por defecto **solo el DM**. Una tabla de pifias que los jugadores puedan leer entera deja de
     * dar miedo, y esa es media gracia; el DM que quiera enseñarla lo dice.
     */
    visibility: visibilitySchema.default("DM_ONLY"),
    trigger: tableTriggerSchema.default("NONE"),
    entries: z.array(dmTableEntrySchema).min(1).max(200),
  })
  .superRefine((tabla, ctx) => {
    // **Los rangos no se solapan, y eso lo comprueba el esquema y no el servicio**: dos filas que
    // cubran el 7 harían que la misma tirada diera dos resultados distintos según el orden en que
    // se leyeran, que es un fallo que solo aparece cuando alguien saca justo ese 7.
    const ordenadas = [...tabla.entries].sort((a, b) => a.min - b.min);
    for (let i = 1; i < ordenadas.length; i++) {
      if (ordenadas[i].min <= ordenadas[i - 1].max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries"],
          message: `Dos filas se solapan en el ${ordenadas[i].min}: cada resultado tiene que caer en una sola.`,
        });
        return;
      }
    }
    // **Y no dejan huecos desde el 1.** Una tabla que empieza en el 3 o que salta del 5 al 8 tiene
    // tiradas sin resultado, y «no sale nada» no es una entrada de ninguna tabla: es un olvido.
    if (ordenadas[0].min !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["entries"],
        message: "La tabla tiene que empezar en el 1.",
      });
      return;
    }
    for (let i = 1; i < ordenadas.length; i++) {
      if (ordenadas[i].min !== ordenadas[i - 1].max + 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["entries"],
          message: `Falta el resultado ${ordenadas[i - 1].max + 1}: la tabla no puede tener huecos.`,
        });
        return;
      }
    }
  });
export type CreateDmTableInput = z.infer<typeof createDmTableSchema>;

/** El interruptor de la casa, por campaña. */
export const setHouseTablesSchema = z.object({ enabled: z.boolean() });
export type SetHouseTablesInput = z.infer<typeof setHouseTablesSchema>;

/** Lo que devuelve tirar sobre una tabla. */
export const dmTableRollSchema = z.object({
  tableId: z.string(),
  tableName: z.string(),
  /** El dado que se tiró: tantas caras como el resultado más alto de la tabla. */
  die: z.number().int().positive(),
  roll: z.number().int().positive(),
  text: z.string(),
  eventId: z.string(),
});
export type DmTableRoll = z.infer<typeof dmTableRollSchema>;
