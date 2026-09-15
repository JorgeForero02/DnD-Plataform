import { z } from "zod";
import {
  activacionSchema,
  actividadSchema,
  duracionSchema,
  materialesSchema,
  rangoSchema,
} from "./activity.schema";
import { origenSchema } from "./origen.schema";
import { resourceResetSchema } from "./character-state.schema";

// Tarea 3A.1 (T1) — la forma del catálogo GENERADO por `scripts/convertir-catalogo.mjs`.
//
// **Por qué Zod al cargar y no TS generado (E-3A1-6).** `tsconfig.base.json` es `commonjs` sin
// `resolveJsonModule`: el conversor escribe JSON, y el cargador (`apps/api/src/rules/catalog/
// generado/index.ts`) lo lee con `readFileSync` + `JSON.parse` + `schema.parse` una sola vez.
// Un JSON no puede colar código; estos esquemas son la barrera, igual que con `GameEvent.payload`.
//
// **Ninguna fórmula evaluable llega aquí (constraints.md, Global Constraints).** Cada `@` de
// Foundry ya se tradujo a una forma cerrada de `Origen` antes de escribir el JSON — ver el
// `refine` al final de este fichero, que comprueba que ningún `@` sobrevivió dentro de
// `actividades`.

/** Las ocho escuelas de magia del SRD 5.1, con la clave que ya usa Foundry. */
export const spellSchoolSchema = z.enum(["abj", "con", "div", "enc", "evo", "ill", "nec", "trs"]);
export type SpellSchool = z.infer<typeof spellSchoolSchema>;

/**
 * Componentes de un conjuro. `materials` solo aparece cuando hay un componente material con
 * texto propio (`materialesSchema`, ya definido en `activity.schema.ts` para el mismo propósito).
 */
export const spellComponentsSchema = z
  .object({
    v: z.boolean(),
    s: z.boolean(),
    m: z.boolean(),
    materials: materialesSchema.optional(),
  })
  .strict();
export type SpellComponents = z.infer<typeof spellComponentsSchema>;

/**
 * Un conjuro del SRD 5.1, convertido. **Nombres y prosa solo del SRD español oficial**
 * (constraints.md): sin correspondencia, `nameEs`/`textEs` son `null` y `sinTraduccion: true`,
 * pero el inglés se conserva siempre.
 */
export const srdSpellSchema = z
  .object({
    key: z.string().min(1).max(120),
    nameEn: z.string().min(1).max(200),
    nameEs: z.string().min(1).max(200).nullable(),
    sinTraduccion: z.boolean(),
    level: z.number().int().min(0).max(9),
    school: spellSchoolSchema,
    castingTime: activacionSchema,
    range: rangoSchema,
    components: spellComponentsSchema,
    duration: duracionSchema,
    ritual: z.boolean(),
    concentration: z.boolean(),
    textEn: z.string().min(1).max(4000),
    textEs: z.string().min(1).max(4000).nullable(),
    higherLevelsEn: z.string().min(1).max(2000).optional(),
    higherLevelsEs: z.string().min(1).max(2000).optional(),
    /** Claves de clase de nuestro catálogo (`wizard`, `cleric`…) — E-3A1-3, viene del SRD español. */
    classes: z.array(z.string().min(1).max(60)),
    actividades: z.array(actividadSchema),
    /** Tipos de actividad de Foundry que este conjuro tenía y que no entran en A (E-3A1-12/constraints). */
    fueraDeA: z.array(z.string().min(1).max(40)),
    /** Cuántos `ActiveEffects` de Foundry traía el ítem, sin convertir (E-3A1-12). */
    efectosPasivos: z.number().int().min(0),
  })
  .strict();
export type SrdSpell = z.infer<typeof srdSpellSchema>;

const usosDeAptitudSchema = z
  .object({
    max: origenSchema,
    resetOn: resourceResetSchema,
  })
  .strict();

/** Un rasgo de clase (o subclase) del SRD 5.1, convertido. */
export const srdFeatureSchema = z
  .object({
    key: z.string().min(1).max(120),
    class: z.string().min(1).max(60),
    subclass: z.string().min(1).max(60).optional(),
    level: z.number().int().min(1).max(20),
    nameEn: z.string().min(1).max(200),
    nameEs: z.string().min(1).max(200).nullable(),
    sinTraduccion: z.boolean(),
    textEn: z.string().min(1).max(4000),
    textEs: z.string().min(1).max(4000).nullable(),
    usos: usosDeAptitudSchema.optional(),
    actividades: z.array(actividadSchema),
    fueraDeA: z.array(z.string().min(1).max(40)),
    efectosPasivos: z.number().int().min(0),
  })
  .strict();
export type SrdFeature = z.infer<typeof srdFeatureSchema>;

/**
 * Un rasgo de raza (o subraza) del SRD 5.1, convertido (tarea 3A.1, T3). Misma forma que
 * `srdFeatureSchema` a propósito — simétrica, sin `class`/`level`/`usos` porque una raza no los
 * tiene.
 */
export const raceFeatureSchema = z
  .object({
    key: z.string().min(1).max(120),
    race: z.string().min(1).max(60),
    subrace: z.string().min(1).max(60).optional(),
    nameEn: z.string().min(1).max(200),
    nameEs: z.string().min(1).max(200).nullable(),
    sinTraduccion: z.boolean(),
    textEn: z.string().min(1).max(4000),
    textEs: z.string().min(1).max(4000).nullable(),
    actividades: z.array(actividadSchema),
    fueraDeA: z.array(z.string().min(1).max(40)),
    efectosPasivos: z.number().int().min(0),
  })
  .strict();
export type RaceFeature = z.infer<typeof raceFeatureSchema>;

/**
 * Ningún `@` de Foundry puede sobrevivir dentro de `actividades`: es la frontera final antes de
 * que el catálogo llegue al servidor (constraints.md, «Ninguna fórmula evaluable llega al
 * catálogo»). `JSON.stringify` recorre la estructura entera; buscar `"@"` en el texto serializado
 * es más barato y más completo que recorrer campo a campo.
 */
function sinArrobasEnActividades(actividades: unknown, ctx: z.RefinementCtx): void {
  if (JSON.stringify(actividades).includes("@")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Una `@` de Foundry sobrevivió dentro de `actividades`: eso es una fórmula, no un Origen.",
    });
  }
}

export const spellsCatalogSchema = z.array(srdSpellSchema).superRefine((spells, ctx) =>
  sinArrobasEnActividades(
    spells.map((s) => s.actividades),
    ctx,
  ),
);
export type SpellsCatalog = z.infer<typeof spellsCatalogSchema>;

export const classFeaturesCatalogSchema = z.array(srdFeatureSchema).superRefine((features, ctx) =>
  sinArrobasEnActividades(
    features.map((f) => f.actividades),
    ctx,
  ),
);
export type ClassFeaturesCatalog = z.infer<typeof classFeaturesCatalogSchema>;

// Tarea 3A.1 (T3) — el envoltorio en array que le faltaba a `raceFeatureSchema`: ya se
// convierten rasgos de raza (`race-features-srd.json`), la misma forma que `classFeaturesCatalogSchema`
// le da a las aptitudes de clase.
export const raceFeaturesCatalogSchema = z.array(raceFeatureSchema).superRefine((features, ctx) =>
  sinArrobasEnActividades(
    features.map((f) => f.actividades),
    ctx,
  ),
);
export type RaceFeaturesCatalog = z.infer<typeof raceFeaturesCatalogSchema>;

/**
 * Un tramo de tabla de escala inlinado (tarea 3A.1, T3 — Step 3). Misma forma que
 * `ScaleStep` de `apps/api/src/rules/catalog/types.ts` (`{ desde, valor }`): no se declara una
 * segunda, se valida aquí y se reexporta con su tipo tal cual desde el catálogo.
 */
const scaleStepSchema = z
  .object({ desde: z.number().int().min(1).max(20), valor: z.number() })
  .strict();

/**
 * `class-scales-srd.json`: por clave de clase, un `Record<"<clase>-<identificador>",
 * ScaleStep[]>` — la forma que `SrdClass.scales` ya usa en `classes.ts` para `barbarian-rages`.
 */
export const classScalesCatalogSchema = z.record(
  z.string().min(1).max(60),
  z.record(z.string().min(1).max(80), z.array(scaleStepSchema).min(1)),
);
export type ClassScalesCatalog = z.infer<typeof classScalesCatalogSchema>;
