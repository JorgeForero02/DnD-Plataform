import { z } from "zod";
import { abilityKeySchema, proficiencyLevelSchema, SKILLS } from "./rules/trace.schema";
import { visibilitySchema } from "./visibility.schema";

// Fase 2B — la forma de un objeto.
//
// **Un objeto que solo es texto no puede alimentar el motor ni tirar dados**, así que aquí vive
// el dato estructurado: qué clase de cosa es, cuánto pesa, cuánto vale, qué daño hace si es un
// arma, qué CA da si es armadura, y **qué efectos numéricos aporta**.
//
// La forma vive en `packages/shared` y no en la API porque la pinta la web (`docs/01-arquitectura.md`),
// y porque el catálogo SRD (datos en código, `apps/api/src/rules/catalog/`) y los objetos propios
// de una campaña (filas de `CampaignItem`) tienen que ser **la misma forma**: el motor no puede
// saber de dónde salió el objeto que le llega.

/**
 * **Las unidades.** El peso se guarda en **onzas** y el valor en **piezas de cobre**, los dos
 * enteros, y la pantalla los traduce (kg y la moneda que toque). Es el mismo principio que los
 * pies de la especificación de distancias: la unidad íntegra abajo, la legible arriba. En libras
 * el SRD tiene fracciones (¼ de libra) y una moneda pesa ⅓ de onza; en onzas todo es entero, y
 * un entero no acumula error al sumar sesenta filas de mochila.
 */
export const WEIGHT_OZ_PER_LB = 16;

export const itemKindSchema = z.enum(["WEAPON", "ARMOR", "SHIELD", "CONSUMABLE", "GEAR", "OTHER"]);
export type ItemKind = z.infer<typeof itemKindSchema>;

/** Los trece tipos de daño del SRD 5.1. */
export const damageTypeSchema = z.enum([
  "BLUDGEONING",
  "PIERCING",
  "SLASHING",
  "ACID",
  "COLD",
  "FIRE",
  "FORCE",
  "LIGHTNING",
  "NECROTIC",
  "POISON",
  "PSYCHIC",
  "RADIANT",
  "THUNDER",
]);
export type DamageType = z.infer<typeof damageTypeSchema>;

/**
 * Propiedades de arma del SRD. **`VERSATILE` y `TWO_HANDED` no son decoración**: la primera
 * cambia el dado si se empuña a dos manos, la segunda **prohíbe el escudo**. Es el caso que el
 * informe de huecos (H1) llama «no es aritmética».
 */
export const weaponPropertySchema = z.enum([
  "AMMUNITION",
  "FINESSE",
  "HEAVY",
  "LIGHT",
  "LOADING",
  "REACH",
  "SPECIAL",
  "THROWN",
  "TWO_HANDED",
  "VERSATILE",
]);
export type WeaponProperty = z.infer<typeof weaponPropertySchema>;

/** `1d8`, `2d6`. Sin modificador: el modificador lo pone el motor, no la transcripción. */
export const damageDiceSchema = z
  .string()
  .regex(/^[1-9]\d?d(4|6|8|10|12|20|100)$/, "El dado de daño se escribe como «1d8» o «2d6».");

export const weaponCategorySchema = z.enum(["SIMPLE", "MARTIAL"]);
export type WeaponCategory = z.infer<typeof weaponCategorySchema>;

export const weaponRangeSchema = z.enum(["MELEE", "RANGED"]);
export type WeaponRange = z.infer<typeof weaponRangeSchema>;

/** Lo que hace falta para tirar un ataque y su daño. */
export const weaponDataSchema = z.object({
  category: weaponCategorySchema,
  range: weaponRangeSchema,
  damageDice: damageDiceSchema,
  damageType: damageTypeSchema,
  properties: z.array(weaponPropertySchema).max(10).default([]),
  /** El dado a dos manos de un arma versátil. Solo con `VERSATILE`. */
  versatileDice: damageDiceSchema.optional(),
  /** Alcance normal y largo **en pies**, para las arrojadizas y las de disparo. */
  rangeNormalFt: z.number().int().min(0).max(2000).optional(),
  rangeLongFt: z.number().int().min(0).max(2000).optional(),
});
export type WeaponData = z.infer<typeof weaponDataSchema>;

export const armorCategorySchema = z.enum(["LIGHT", "MEDIUM", "HEAVY", "SHIELD"]);
export type ArmorCategory = z.infer<typeof armorCategorySchema>;

/**
 * El tope de Destreza **lo determina la categoría** (SRD 5.1), no es una casilla aparte: ligera
 * sin tope, media +2, pesada nada. Un escudo no suma Destreza en absoluto — es una suma plana —
 * y por eso tampoco tiene tope.
 */
export const TOPE_DE_DESTREZA_POR_CATEGORIA: Record<ArmorCategory, number | undefined> = {
  LIGHT: undefined,
  MEDIUM: 2,
  HEAVY: 0,
  SHIELD: undefined,
};

/**
 * Lo que hace falta para calcular la CA. **`dexCap` distingue tres cosas y no dos**: sin tope
 * (ligera), tope de 2 (media) y **cero** (pesada, que no suma nada). Un `0` mal puesto da una CA
 * silenciosamente baja y un `undefined` mal puesto la da silenciosamente alta.
 */
export const armorDataSchema = z.object({
  category: armorCategorySchema,
  baseAc: z.number().int().min(0).max(30),
  dexCap: z.number().int().min(0).max(10).optional(),
  strengthRequirement: z.number().int().min(0).max(30).default(0),
  stealthDisadvantage: z.boolean().default(false),
});
export type ArmorData = z.infer<typeof armorDataSchema>;

const skillKeySchema = z.enum(Object.keys(SKILLS) as [string, ...string[]]);
const movementSchema = z.enum(["walk", "climb", "swim", "fly", "burrow"]);
export type Movement = z.infer<typeof movementSchema>;

/**
 * **La lista cerrada de efectos, y es una regla dura del alcance.** Se automatiza lo que es un
 * número; todo lo demás se queda como prosa que lee la persona.
 *
 * Con estos seis quedan cubiertos armadura, escudo, capa de protección, cinturón de fuerza y
 * anillos de bonos — la inmensa mayoría de lo que una mesa toca. **Nada de dotes ni conjuros**:
 * un efecto condicional («ventaja en Engaño ante la Casa Vhael») **no entra aquí**, y esa es la
 * discrepancia declarada con la pantalla 21 del prototipo, que lo pinta como si entrara.
 */
export const itemEffectSchema = z.discriminatedUnion("kind", [
  /** Suma plana a la Clase de Armadura: el +1 del anillo de protección. */
  z.object({ kind: z.literal("ac"), amount: z.number().int().min(-10).max(10) }),
  /**
   * Sube o **fija** una puntuación de característica. `set` existe porque el cinturón de fuerza
   * no suma: **sustituye** la puntuación, y el motor ya sabe representarlo (`override`).
   */
  z.object({
    kind: z.literal("abilityScore"),
    ability: abilityKeySchema,
    mode: z.enum(["add", "set"]),
    amount: z.number().int().min(-10).max(30),
  }),
  /** Bono a salvaciones. Sin `ability`, **a las seis** (capa de protección). */
  z.object({
    kind: z.literal("save"),
    ability: abilityKeySchema.optional(),
    amount: z.number().int().min(-10).max(10),
  }),
  z.object({ kind: z.literal("maxHp"), amount: z.number().int().min(-100).max(100) }),
  /** En **pies**, y puede ser negativa (una armadura que pesa). */
  z.object({
    kind: z.literal("speed"),
    movement: movementSchema,
    amount: z.number().int().min(-60).max(60),
  }),
  /** Competencia en una habilidad, con sus cuatro estados. */
  z.object({
    kind: z.literal("skillProficiency"),
    skill: skillKeySchema,
    level: proficiencyLevelSchema,
  }),
  /** Competencia en una salvación. */
  z.object({ kind: z.literal("saveProficiency"), ability: abilityKeySchema }),
  /**
   * **El arma mágica**: `+1` al ataque y `+1` al daño, que es el objeto más común del juego
   * después de la armadura.
   *
   * Entra tras la auditoría de mecánica de 2B, que encontró que **no había forma de
   * representarlo**: ni por efecto, ni por anulación manual del DM (la lista de anulaciones no
   * incluye `attack.*`). El DM entregaba la primera espada +1 y el cuadro de ataques seguía
   * diciendo lo mismo, así que la mesa volvía a sumar a mano — que es exactamente lo que esta
   * herramienta existe para quitar.
   *
   * **Son dos efectos y no uno** porque el juego los separa: hay objetos que dan solo daño
   * (la flecha mata-dragones) y otros solo puntería. Se aplican **al arma que los lleva**, no a
   * todos los ataques: un anillo que suba todos los ataques sería otra cosa, y no está en el
   * SRD ni hace falta todavía.
   *
   * **Legal:** esto abre la *forma*, no el contenido. Los objetos mágicos del SRD siguen sin
   * copiarse (ver `NOTICE.md`); lo que se puede escribir es el homebrew del DM.
   */
  z.object({ kind: z.literal("weaponAttack"), amount: z.number().int().min(-5).max(5) }),
  z.object({ kind: z.literal("weaponDamage"), amount: z.number().int().min(-5).max(5) }),
]);
export type ItemEffect = z.infer<typeof itemEffectSchema>;

/**
 * Las ranuras. **Existen desde la primera migración** (H1): añadirlas después obliga a adivinar
 * a qué ranura pertenece cada fila ya escrita —un anillo, ¿a cuál de los dos?—.
 */
export const equipSlotSchema = z.enum([
  "MAIN_HAND",
  "OFF_HAND",
  "ARMOR",
  "HEAD",
  "NECK",
  "CLOAK",
  "RING_1",
  "RING_2",
  "HANDS",
  "FEET",
  "OTHER",
]);
export type EquipSlot = z.infer<typeof equipSlotSchema>;

/** Las dos ranuras que son manos. Un arma a dos manos las ocupa las dos. */
export const HAND_SLOTS = ["MAIN_HAND", "OFF_HAND"] as const;

/**
 * Dónde está el objeto. **Tres sitios, y la sintonización va aparte** (booleano): un anillo
 * sintonizado **está equipado**, así que meter `ATTUNED` como cuarto valor de este enum obligaría
 * a elegir entre las dos verdades. El tercer sitio —«guardado en otro sitio»— lo exige la
 * pantalla 20 del prototipo: el cofre de la posada.
 */
export const itemLocationSchema = z.enum(["EQUIPPED", "CARRIED", "STORED"]);
export type ItemLocation = z.infer<typeof itemLocationSchema>;

/** SRD 5.1: **tres objetos sintonizados** como máximo por criatura. */
export const MAX_ATTUNED_ITEMS = 3;

/** El cuerpo común de un objeto, lo escriba el DM o lo traiga el catálogo. */
const itemFieldsSchema = z.object({
  name: z.string().min(1).max(120),
  kind: itemKindSchema,
  /** La prosa: qué parece, de dónde salió. El DM asesor la pidió por su nombre. */
  description: z.string().max(4000).optional(),
  weightOz: z.number().int().min(0).max(160000).default(0),
  costCp: z.number().int().min(0).max(100000000).optional(),
  effects: z.array(itemEffectSchema).max(12).default([]),
  weapon: weaponDataSchema.optional(),
  armor: armorDataSchema.optional(),
  requiresAttunement: z.boolean().default(false),
  /** La ranura donde va por defecto. `null` en lo que no se equipa. */
  slot: equipSlotSchema.optional(),
});

/**
 * Coherencia entre el tipo y sus datos. **Se comprueba en el esquema y no en el servicio**
 * porque es forma, no negocio: un arma sin dado de daño no puede tirar, y una armadura sin CA
 * no puede calcular nada — las dos serían filas que la pantalla pinta y el motor ignora.
 */
function comprobarCoherencia(
  valor: {
    kind: ItemKind;
    weapon?: WeaponData;
    armor?: ArmorData;
  },
  ctx: z.RefinementCtx,
): void {
  if (valor.kind === "WEAPON" && !valor.weapon) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["weapon"],
      message: "Un arma necesita su dado de daño y su tipo de daño.",
    });
  }
  if ((valor.kind === "ARMOR" || valor.kind === "SHIELD") && !valor.armor) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["armor"],
      message: "Una armadura o un escudo necesitan su Clase de Armadura.",
    });
  }
  if (valor.kind === "SHIELD" && valor.armor && valor.armor.category !== "SHIELD") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["armor", "category"],
      message: "Un escudo se declara con la categoría SHIELD.",
    });
  }
  if (valor.kind === "ARMOR" && valor.armor && valor.armor.category === "SHIELD") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["armor", "category"],
      message: "Una armadura de cuerpo no puede tener la categoría SHIELD.",
    });
  }
  // **La categoría manda sobre el tope de Destreza** (M2B-7). Eran dos controles independientes:
  // el DM marcaba «Pesada» y, si no tocaba el otro, su armadura sumaba **toda** la Destreza —
  // «un `undefined` mal puesto da una CA silenciosamente alta», como avisa el comentario de
  // `armorDataSchema`, y la pantalla lo ponía por defecto. El SRD no las separa: la categoría
  // **determina** el tope (ligera sin tope, media +2, pesada nada).
  if (valor.armor) {
    const esperado = TOPE_DE_DESTREZA_POR_CATEGORIA[valor.armor.category];
    if (valor.armor.dexCap !== esperado) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["armor", "dexCap"],
        message:
          valor.armor.category === "LIGHT"
            ? "Una armadura ligera no tiene tope de Destreza."
            : valor.armor.category === "MEDIUM"
              ? "Una armadura media tiene el tope de Destreza en 2."
              : valor.armor.category === "HEAVY"
                ? "Una armadura pesada no deja sumar la Destreza: su tope es 0."
                : "Un escudo no tiene tope de Destreza: es una suma plana.",
      });
    }
  }

  if (
    valor.weapon &&
    valor.weapon.versatileDice &&
    !valor.weapon.properties.includes("VERSATILE")
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["weapon", "versatileDice"],
      message: "Solo un arma versátil tiene dado a dos manos.",
    });
  }
}

export const createCampaignItemSchema = itemFieldsSchema
  .extend({
    /**
     * Un objeto propio nace **visible para la mesa**. Si el DM lo está preparando, lo pone
     * `DM_ONLY` a mano — y entonces no se le puede dar a un jugador sin subirle la visibilidad,
     * que es exactamente lo que evita que la preparación se convierta en una filtración.
     */
    visibility: visibilitySchema.default("PLAYERS"),
    specificPlayerIds: z.array(z.string()).max(50).optional(),
  })
  .superRefine(comprobarCoherencia);
export type CreateCampaignItemInput = z.infer<typeof createCampaignItemSchema>;

export const updateCampaignItemSchema = itemFieldsSchema
  .extend({
    visibility: visibilitySchema,
    specificPlayerIds: z.array(z.string()).max(50).optional(),
  })
  .partial()
  .superRefine((valor, ctx) => {
    // En una edición parcial solo se comprueba lo que llega: un `PATCH` que solo cambia el
    // nombre no puede exigir que se reenvíe el arma entera.
    if (valor.kind !== undefined) {
      comprobarCoherencia({ kind: valor.kind, weapon: valor.weapon, armor: valor.armor }, ctx);
    }
  });
export type UpdateCampaignItemInput = z.infer<typeof updateCampaignItemSchema>;

/**
 * Un objeto ya resuelto —venga del SRD o de la campaña—, tal y como lo consumen el motor y la
 * pantalla. **El motor no puede saber de dónde salió**, y por eso las dos ramas aterrizan aquí.
 */
export const resolvedItemSchema = itemFieldsSchema.extend({
  /** `SRD:long-sword` o `CAMPAIGN:<cuid>`. Estable, y es lo que va en la traza. */
  ref: z.string().min(1),
  source: z.enum(["SRD", "CAMPAIGN"]),
});
export type ResolvedItem = z.infer<typeof resolvedItemSchema>;
