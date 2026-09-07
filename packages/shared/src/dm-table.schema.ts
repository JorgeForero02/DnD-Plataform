import { z } from "zod";
import { contentRefSchema } from "./character-build.schema";
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

/** Las cinco monedas del SRD, cada una su propio entero. Ver el comentario de `entregaSchema`. */
const monedasSchema = z.object({
  cp: z.number().int().min(0).max(1_000_000).optional(),
  sp: z.number().int().min(0).max(1_000_000).optional(),
  ep: z.number().int().min(0).max(1_000_000).optional(),
  gp: z.number().int().min(0).max(1_000_000).optional(),
  pp: z.number().int().min(0).max(1_000_000).optional(),
});

/** Una referencia y cuántas, tal y como la escribe el DM al montar la fila. */
const entregaObjetoSchema = z.object({
  ref: contentRefSchema,
  cantidad: z.number().int().min(1).max(999),
});

/**
 * Tarea B1 — lo que una fila puede entregar: objetos del catálogo y monedas.
 *
 * **Opcional en la fila que la contiene**, porque la misma primitiva sirve para una tabla de
 * rumores que no entrega nada. Aquí dentro, en cambio, no hay nada opcional de verdad: una
 * `entrega` presente pero vacía (`{}`, `{ objetos: [] }`, `{ monedas: {} }`) es indistinguible de
 * no tener `entrega`, y dos formas de decir lo mismo acaban con una pantalla mirando la
 * equivocada. El `.refine` de abajo cierra las tres formas de estar vacía a la vez.
 *
 * `ref` usa `contentRefSchema` tal cual —la unión de objetos `{ source, key|id }`— porque es el
 * formato real del catálogo compartido en este código; la cadena `"SRD:shortsword"` es una
 * abreviatura del plan que no corresponde a ningún esquema existente.
 *
 * Las monedas son **cinco enteros y no un total**, igual que la bolsa de un personaje (D-2B-5):
 * normalizar aquí y desnormalizar allí inventaría una segunda verdad para el mismo dinero.
 */
export const entregaSchema = z
  .object({
    objetos: z.array(entregaObjetoSchema).max(20).optional(),
    monedas: monedasSchema.optional(),
  })
  .refine(
    (e) =>
      (e.objetos !== undefined && e.objetos.length > 0) ||
      (e.monedas !== undefined && Object.keys(e.monedas).length > 0),
    { message: "Una entrega vacía no vale: o entrega algo, o no está." },
  );
export type EntregaInput = z.infer<typeof entregaSchema>;

/**
 * Una fila: **un rango, un texto y opcionalmente una entrega**. Rango y no un solo número porque
 * así se escribe una tabla de verdad —«01-20: se te encasquilla el arma»— y porque una tabla de
 * d100 con cien filas de un número cada una es la misma tabla escrita cien veces.
 */
export const dmTableEntrySchema = z
  .object({
    min: z.number().int().min(1).max(1000),
    max: z.number().int().min(1).max(1000),
    text: z.string().min(1).max(500),
    /** Lo que da esta fila, si da algo. Ausente en una tabla de rumores o de encuentros. */
    entrega: entregaSchema.optional(),
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

/**
 * Editar una tabla (ficha C2C-6). **Mismo cuerpo que crearla, y las filas se reemplazan enteras.**
 *
 * No hay un `PATCH` por fila a propósito: las filas de una tabla **se validan como conjunto** —no
 * pueden solaparse, no pueden dejar huecos y tienen que empezar en 1—, así que editar una sola
 * dejaría a las demás en un estado que el esquema no puede comprobar sin volver a mirarlas todas.
 * Reemplazarlas enteras es la única forma en que la tabla guardada siempre es una tabla válida.
 */
export const updateDmTableSchema = createDmTableSchema;
export type UpdateDmTableInput = CreateDmTableInput;

/** El interruptor de la casa, por campaña. */
export const setHouseTablesSchema = z.object({ enabled: z.boolean() });
export type SetHouseTablesInput = z.infer<typeof setHouseTablesSchema>;

/**
 * Tarea B2 — un objeto de una entrega, ya resuelto para la pantalla o marcado como ausente.
 *
 * **Ninguna clave de catálogo llega nunca a la pantalla**: por eso la rama viva lleva `name`, no
 * solo `ref`. Y una `ref` que ya no se puede resolver —el DM borró su objeto de campaña— no tumba
 * la tirada: sale por la otra rama, con `ausente: true` y un motivo en español que se pueda leer,
 * nunca con un dato inventado en su lugar.
 *
 * Es una unión discriminada por `ausente` y no un objeto con campos todos opcionales: así el tipo
 * ya no permite construir a mano un resultado con `name` y `motivo` a la vez, que no significaría
 * nada.
 */
export const entregaObjetoResueltoSchema = z.discriminatedUnion("ausente", [
  z.object({
    ausente: z.literal(false),
    ref: contentRefSchema,
    cantidad: z.number().int().min(1).max(999),
    name: z.string().min(1),
    weightOz: z.number().int().min(0),
    costCp: z.number().int().min(0).optional(),
  }),
  z.object({
    ausente: z.literal(true),
    ref: contentRefSchema,
    cantidad: z.number().int().min(1).max(999),
    /** Por qué no se pudo resolver, en español y legible: no un código. */
    motivo: z.string().min(1),
  }),
]);
export type EntregaObjetoResuelto = z.infer<typeof entregaObjetoResueltoSchema>;

/** La `entrega` de una fila, ya resuelta: la misma forma de entrada, con los objetos traducidos. */
export const entregaResueltaSchema = z.object({
  objetos: z.array(entregaObjetoResueltoSchema).max(20).optional(),
  monedas: monedasSchema.optional(),
});
export type EntregaResuelta = z.infer<typeof entregaResueltaSchema>;

/** Lo que devuelve tirar sobre una tabla. */
export const dmTableRollSchema = z.object({
  tableId: z.string(),
  tableName: z.string(),
  /** El dado que se tiró: tantas caras como el resultado más alto de la tabla. */
  die: z.number().int().positive(),
  roll: z.number().int().positive(),
  text: z.string(),
  eventId: z.string(),
  /** Lo que entrega la fila que salió, con sus objetos resueltos. Ausente si no entrega nada. */
  entrega: entregaResueltaSchema.optional(),
});
export type DmTableRoll = z.infer<typeof dmTableRollSchema>;
