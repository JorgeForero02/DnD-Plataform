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
    /**
     * El delta de la carrera (M2B-8, imita `consumeInventoryItemSchema`): dos personas
     * descontando una flecha a la vez con `quantity` absoluto pisan el mismo número — la que
     * escribe segunda deja el que leyó primero, no el resultado de las dos restas. El servicio
     * lo aplica con `increment` dentro de la transacción que ya bloquea la fila.
     */
    quantityDelta: z
      .number()
      .int()
      .refine((n) => n !== 0, { message: "El delta de cantidad no puede ser cero." })
      .optional(),
    location: itemLocationSchema.optional(),
    /** `null` la libera. Obligatoria al pasar a `EQUIPPED` si el objeto tiene ranura. */
    slot: equipSlotSchema.nullable().optional(),
    attuned: z.boolean().optional(),
    storedAt: z.string().max(120).nullable().optional(),
    note: z.string().max(280).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "No hay nada que cambiar en esta petición.",
  })
  .refine((v) => v.quantity === undefined || v.quantityDelta === undefined, {
    message: "No se puede fijar una cantidad absoluta y un delta a la vez.",
    path: ["quantityDelta"],
  });
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;

/**
 * La fila del inventario tal cual queda tras el `PATCH`: lo que ya devolvía el endpoint, sin
 * resolver contra el catálogo (eso lo hace el listado, no esta mutación).
 */
export const inventoryItemRowSchema = z.object({
  id: z.string(),
  characterId: z.string(),
  quantity: z.number().int(),
  location: itemLocationSchema,
  slot: equipSlotSchema.nullable(),
  attuned: z.boolean(),
  storedAt: z.string().nullable(),
  note: z.string().nullable(),
});
export type InventoryItemRow = z.infer<typeof inventoryItemRowSchema>;

/**
 * La respuesta del `PATCH` de equipar/desequipar/mover/sintonizar/cambiar cantidad (M2B-11): el
 * objeto tal cual queda, **más la CA de antes y de después de escribir**.
 *
 * Existe porque hasta esta ficha la pantalla hacía `fetchAc` → `PATCH` → `fetchAc`: dos
 * peticiones que no tienen nada que ver con equipar, y si la segunda fallaba después de un
 * `PATCH` que sí había escrito, la ficha se quedaba enseñando la CA de antes. Las dos CA que
 * viajan aquí las calcula el servidor **dentro de la misma transacción** que el cambio — el
 * mismo motivo por el que el suceso de inventario se escribe ahí y no fuera.
 *
 * **`acBefore` viaja también, y no solo `ac`** (fix de ronda 1, Q-2): la pantalla no siempre
 * tiene la hoja ya cargada en caché para leer "el antes" por su cuenta —el diálogo de la bolsa
 * desde la mesa monta el inventario sin la hoja—, y ahí el aviso "CA 13 -> 14" desaparecía en
 * silencio. Con las dos mitades en la misma respuesta, la pantalla no depende de qué más haya
 * cargado antes.
 *
 * `null` en cualquiera de las dos cuando el personaje no tiene hoja que derivar (un PNJ sin
 * plantilla, por ejemplo): equipar no tiene por qué fallar por eso, así que el hueco viaja como
 * dato y no como error.
 */
export const updateInventoryItemResponseSchema = z.object({
  item: inventoryItemRowSchema,
  acBefore: z.number().nullable(),
  ac: z.number().nullable(),
});
export type UpdateInventoryItemResponse = z.infer<typeof updateInventoryItemResponseSchema>;

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

/**
 * Migración 6, fix round 1 (BAJA-1) — el estado de sobrecarga (SRD 5.1, Variant: Encumbrance),
 * **calculado por el servidor con el peso SIN filtrar por visibilidad**.
 *
 * Hasta este arreglo, `PanelCarga.tsx` derivaba los umbrales dividiendo `carryCapacityOz` (una
 * suposición sobre que la capacidad es exactamente 15×Fuerza, que además ya viaja) y los
 * comparaba contra `totalWeightOz`, que `InventoryService.list()` calcula **filtrado por
 * `canView`**: un objeto de campaña `DM_ONLY` que empuja a un personaje sobre el umbral no cuenta
 * en ese número para un jugador sin concesión, así que su panel podía decir «Sin cargar» mientras
 * la hoja (que sí suma el peso real) ya decía −10 pies. El estado viaja ya decidido, y **nunca
 * los números que lo causan** cuando esos números vienen de algo que el visor no puede ver — la
 * misma doctrina que ya sigue `entityCount` en `campaigns.service.ts`.
 *
 * `"none"` y no solo `encumbered`/`heavily` ausentes: al panel le hace falta un tercer estado
 * explícito para "por debajo de los dos umbrales", que es distinto de "la variante está
 * apagada" (`null`, más abajo) — los dos se pintan distinto.
 */
export const ENCUMBRANCE_STATES = ["none", "encumbered", "heavily"] as const;
export const encumbranceStateSchema = z.enum(ENCUMBRANCE_STATES);
export type EncumbranceState = z.infer<typeof encumbranceStateSchema>;

/**
 * `null` cuando la variante de la campaña está apagada, o el personaje no tiene Fuerza asignada
 * todavía — los mismos dos casos en los que `character-sheet.service.ts` no calcula nada.
 * `encumberedAtOz`/`heavilyAtOz` son los umbrales (5×/10×Fuerza en onzas): el panel los enseña
 * porque son del propio personaje, nunca del inventario de otro.
 */
export const encumbranceInfoSchema = z.object({
  state: encumbranceStateSchema,
  encumberedAtOz: z.number().nonnegative(),
  heavilyAtOz: z.number().nonnegative(),
});
export type EncumbranceInfo = z.infer<typeof encumbranceInfoSchema>;

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
export const rollAttackSchema = z
  .object({
    /** Qué mitad se tira: el ataque o el daño. Son dos tiradas, no una. */
    part: z.enum(["ATTACK", "DAMAGE"]),
    mode: z.enum(["NORMAL", "ADVANTAGE", "DISADVANTAGE"]).default("NORMAL"),
    /**
     * **Gastar la inspiración en esta tirada de ATAQUE** (plan 08, ficha I8).
     *
     * SRD 5.1: *«you can expend it when you make an attack roll, saving throw, or ability check»*.
     * El ataque es una de las tres, así que sin esto la inspiración cubriría **la mitad del SRD** y
     * justo la mitad que se usa en combate.
     *
     * **En el DAÑO no**, y el servidor lo rechaza: el daño no es ninguna de las tres tiradas que la
     * regla nombra, y además no se tira con ventaja — se tiran dados de daño, no un d20.
     */
    spendInspiration: z.boolean().default(false),
    /** A dos manos, en un arma versátil: cambia el dado de daño, no el de ataque. */
    versatile: z.boolean().default(false),
    /**
     * **La tirada de ATAQUE cuyo daño se está cobrando** — el `eventId` que `rollAttack` y
     * `resolveAttack` devuelven. De ahí, y solo de ahí, sale si el golpe fue crítico: el servidor
     * lee el `natural` que quedó escrito en ese suceso, del mismo personaje, la misma campaña y
     * **el mismo ataque**.
     *
     * **Aquí había un `critical: boolean` y se quitó el 2026-09-05 (ficha C2.5-2, cerrada).** Era un
     * campo que el cuerpo de la petición declaraba y el servidor se creía: cualquiera podía pedir el
     * daño duplicado sin haber sacado un 20. Es la misma regla que `resolveAttackSchema` ya aplicaba
     * desde la ficha R2C-2 —*«eso lo decide la tirada, no quien la pide»*—, y ahora las dos puertas
     * dicen lo mismo.
     *
     * **Opcional a propósito, y sin él NO hay crítico**: pedir el daño sin decir qué tirada se cobra
     * es legítimo —se tira daño suelto—, y entonces no hay ningún 20 al que agarrarse.
     */
    attackRollEventId: z.string().min(1).optional(),
    /**
     * A quién va dirigida la tirada. **El mismo vocabulario que la pantalla de dados**
     * (`rollAudienceSchema`), no el nivel de visibilidad crudo: aquí había una copia literal del
     * enum de visibilidad, que es la forma de los datos escrita dos veces.
     */
    audience: rollAudienceSchema.optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.spendInspiration) return;
    // **La inspiración no se gasta en el daño.** El SRD nombra tres tiradas —ataque, salvación y
    // prueba— y el daño no es ninguna; además la ventaja es del d20, y el daño no lleva d20.
    if (v.part === "DAMAGE") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["spendInspiration"],
        message: "La inspiración da ventaja en la tirada de ataque, no en la de daño.",
      });
    }
    // Misma razón que en `createRollSchema`: se anularían y se perdería para nada.
    if (v.mode === "DISADVANTAGE") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["spendInspiration"],
        message:
          "La ventaja de la inspiración y esa desventaja se anulan: tirarías normal y la perderías.",
      });
    }
  });
export type RollAttackInput = z.infer<typeof rollAttackSchema>;
