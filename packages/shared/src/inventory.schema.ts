import { z } from "zod";
import { rollAudienceSchema } from "./roll.schema";
import { contentRefSchema } from "./character-build.schema";
import { equipSlotSchema, itemLocationSchema } from "./item.schema";

// Fase 2B — el inventario de un personaje y su bolsa.
//
// **Se guarda lo decidido, se calcula lo derivado**, como en toda la hoja: aquí se guarda qué
// objeto tiene, cuántos, dónde está y en qué ranura. La CA que resulta de llevarlo puesto no es
// una columna: la calcula el motor, y sale con su traza.

/**
 * Meter un objeto en el inventario. La referencia es la misma `ContentRef` de 2A —`SRD` con su
 * clave o `CAMPAIGN` con su identificador—, así que el catálogo y el homebrew entran por la
 * misma puerta.
 */
export const addInventoryItemSchema = z.object({
  ref: contentRefSchema,
  quantity: z.number().int().min(1).max(9999).default(1),
  /** Por defecto entra **en la mochila**, no puesto: equipar es un gesto aparte. */
  location: itemLocationSchema.default("CARRIED"),
  slot: equipSlotSchema.optional(),
  /** Dónde está guardado, si lo está: «en la posada», «en el carro». */
  storedAt: z.string().max(120).optional(),
  note: z.string().max(280).optional(),
});
export type AddInventoryItemInput = z.infer<typeof addInventoryItemSchema>;

/**
 * Mover, equipar, desequipar, sintonizar y cambiar la cantidad: **una sola mutación**, porque
 * todas son la misma frase —«este objeto ahora está así»— y partirla en cinco endpoints obligaría
 * a la pantalla a encadenar peticiones para un gesto que el usuario ve como uno.
 */
export const updateInventoryItemSchema = z
  .object({
    quantity: z.number().int().min(1).max(9999).optional(),
    location: itemLocationSchema.optional(),
    /** `null` la libera. Obligatoria al pasar a `EQUIPPED` si el objeto tiene ranura. */
    slot: equipSlotSchema.nullable().optional(),
    attuned: z.boolean().optional(),
    storedAt: z.string().max(120).nullable().optional(),
    note: z.string().max(280).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "No hay nada que cambiar en esta petición.",
  });
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;

/**
 * Gastar un consumible: una poción que se bebe, una antorcha que se quema, un paquete de
 * flechas que se acaba.
 *
 * **Existe porque `quantity` no puede bajar a cero** —el mínimo del esquema es 1— así que la
 * última poción solo se podía «beber» borrando la fila, y beber la segunda de tres y beber la
 * última eran dos gestos distintos en la pantalla sin que ninguno dejara constancia. Lo señaló
 * la auditoría de mecánica de 2B. Al llegar a cero, la fila se va: una fila con cero unidades no
 * es información, es ruido en la mochila.
 */
export const consumeInventoryItemSchema = z.object({
  amount: z.number().int().min(1).max(9999).default(1),
  reason: z.string().max(280).optional(),
});
export type ConsumeInventoryItemInput = z.infer<typeof consumeInventoryItemSchema>;

/** Las cinco monedas del SRD 5.1. El orden es de menor a mayor valor. */
export const COIN_KEYS = ["cp", "sp", "ep", "gp", "pp"] as const;
export const coinKeySchema = z.enum(COIN_KEYS);
export type CoinKey = z.infer<typeof coinKeySchema>;

/**
 * Cuántos cobres vale cada moneda. **No se guarda un total normalizado** (H6): la mesa dice
 * «tres monedas de plata», no «0,3 po», y un total en oro obliga a decidir qué hacer con 12,37
 * ya escritos el día que alguien quiera las cinco.
 */
export const COIN_VALUE_CP: Record<CoinKey, number> = {
  cp: 1,
  sp: 10,
  ep: 50,
  gp: 100,
  pp: 1000,
};

/** Una moneda pesa **un tercio de onza**: cincuenta monedas, una libra (SRD 5.1). */
export const COIN_WEIGHT_OZ = 1 / 3;

export const coinPurseSchema = z.object({
  cp: z.number().int().min(0).max(1000000),
  sp: z.number().int().min(0).max(1000000),
  ep: z.number().int().min(0).max(1000000),
  gp: z.number().int().min(0).max(1000000),
  pp: z.number().int().min(0).max(1000000),
});
export type CoinPurse = z.infer<typeof coinPurseSchema>;

/**
 * Mover dinero es un **delta**, por el mismo motivo que los puntos de golpe: en la mesa nadie
 * dice «tengo 137 de oro», dice «pago 20». Dos deltas simultáneos aterrizan los dos; dos valores
 * absolutos se pisan.
 *
 * Un delta que dejaría una bolsa en negativo se rechaza con un 400: **no se hace cambio
 * automático**. Cambiar plata por oro es una decisión de la mesa, y hacerla sola convierte
 * «paga 3 po» en un desglose que nadie pidió.
 */
export const changeMoneySchema = z
  .object({
    cp: z.number().int().min(-1000000).max(1000000).optional(),
    sp: z.number().int().min(-1000000).max(1000000).optional(),
    ep: z.number().int().min(-1000000).max(1000000).optional(),
    gp: z.number().int().min(-1000000).max(1000000).optional(),
    pp: z.number().int().min(-1000000).max(1000000).optional(),
    reason: z.string().max(280).optional(),
  })
  .refine((v) => COIN_KEYS.some((k) => v[k] !== undefined && v[k] !== 0), {
    message: "Hay que mover al menos una moneda.",
  });
export type ChangeMoneyInput = z.infer<typeof changeMoneySchema>;

/**
 * Un ataque tal y como lo pide la pantalla. **El servidor compone la expresión**, igual que hace
 * con la ventaja desde 2A.13: un cliente que la montara podría decir que tira 1d8 y mandar 1d12.
 */
export const rollAttackSchema = z.object({
  /** Qué mitad se tira: el ataque o el daño. Son dos tiradas, no una. */
  part: z.enum(["ATTACK", "DAMAGE"]),
  mode: z.enum(["NORMAL", "ADVANTAGE", "DISADVANTAGE"]).default("NORMAL"),
  /** A dos manos, en un arma versátil: cambia el dado de daño, no el de ataque. */
  versatile: z.boolean().default(false),
  /** Daño crítico: **se duplican los dados, nunca el modificador** (SRD 5.1). */
  critical: z.boolean().default(false),
  /**
   * A quién va dirigida la tirada. **El mismo vocabulario que la pantalla de dados**
   * (`rollAudienceSchema`), no el nivel de visibilidad crudo: aquí había una copia literal del
   * enum de visibilidad, que es la forma de los datos escrita dos veces.
   */
  audience: rollAudienceSchema.optional(),
});
export type RollAttackInput = z.infer<typeof rollAttackSchema>;
