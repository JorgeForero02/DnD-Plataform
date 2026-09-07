import { z } from "zod";
import { costeSchema } from "./action-economy.schema";
import { origenSchema } from "./origen.schema";
import { applyConditionSchema, type ApplyConditionInput } from "./character-state.schema";

// Tarea A5 (paso 2) — la forma común de una actividad.
//
// **El espinazo del plan.** La economía (A1) sostiene la actividad y la actividad sostiene la
// ejecución (A6 en adelante): si esta forma sale mal, se pierden las tareas que van encima.
//
// Se copian los nombres de campo de Foundry (`module/data/activity/base-activity.mjs`) donde
// significan lo mismo: cuesta cero y hace del paso 3 un mapeo en vez de un remodelado. Se copia
// el nombre, nunca la implementación — donde su forma es peor (las fórmulas en texto) se usa la
// nuestra, y aquí queda escrito por qué.
//
// El borrador del plan traía ocho campos. La tarea 0 mapeó diez conjuros del SRD a mano contra
// ese borrador y ocho no cabían: tres campos salieron corregidos y uno nuevo. El razonamiento
// completo, conjuro a conjuro, está en
// `.superpowers/sdd/2026-09-06-tanda-paso2-y-botin/briefs/esquema-corregido.md`, sección 2, que
// manda sobre el texto del plan.
//
// **Vuelta de arreglo 1 (revisión de calidad):** dos críticos y varios menores, todos con su
// mutación medida. Quedan citados en el sitio exacto que corrigen, para que no se repitan.

/**
 * Qué cuesta activar la actividad. **Es una unión, no solo un `Coste`.**
 *
 * `Coste` (los cinco de la tarea A1) es la economía **del turno** y no se toca aquí: una hora de
 * ritual no es un coste de turno, y fundir las dos cosas habría roto la tarea A2. Cuando la
 * activación se mide en tiempo (un ritual de un minuto, un conjuro de una hora) se usa la otra
 * mitad de la unión.
 *
 * `condicion` es el disparador escrito de una reacción — SRD 5.1, `shield`: *«which you take
 * when you are hit by an attack or targeted by the magic missile spell»*. Una reacción sin su
 * condición no se puede usar en la mesa.
 *
 * **Lo que no se copia de Foundry:** en sus datos la activación vive en DOS niveles y se
 * contradicen — en `shield`, el objeto dice `reaction` y la actividad dice `action`, con
 * `override: false` (hereda del objeto). Aquí solo hay un sitio, y por eso cada rama de la unión
 * es estricta: mezclar `coste` y `tiempo` en el mismo objeto no es una activación válida, es la
 * misma ambigüedad de Foundry colada por otra puerta.
 *
 * **Medido contra el SRD completo** (revisión de calidad, vuelta 1): 319 conjuros, sus
 * activaciones se reparten `action` 242, `minute` 46, `bonus` 14, `hour` 13, `reaction` 4 — esta
 * unión las acepta todas sin dejar ninguna fuera y sin aceptar nada de más.
 */
export const activacionSchema = z.union([
  z
    .object({
      coste: costeSchema,
      condicion: z.string().max(300).optional(),
    })
    .strict(),
  z
    .object({
      tiempo: z.object({
        valor: z.number().int().positive(),
        unidad: z.enum(["minuto", "hora"]),
      }),
      condicion: z.string().max(300).optional(),
    })
    .strict(),
]);
export type Activacion = z.infer<typeof activacionSchema>;

/**
 * Qué gasta usar la actividad: un espacio de conjuro, un uso, una carga.
 *
 * `recurso` es la **clave** de un `CharacterResource` (`apps/api/prisma/schema.prisma`), nunca
 * una tabla nueva — ver la nota grande más abajo sobre `uses`. Acotada como cualquier otra clave
 * del proyecto (`origenSchema.escala`, `SET_FLAG.key`): vacía no identifica nada, y sin tope
 * cabría un texto que no es una clave.
 */
export const consumoSchema = z.object({
  recurso: z.string().min(1).max(60),
  /** Positiva: consumir cero o menos no es consumir nada, es un dato mal puesto. */
  cantidad: z.number().int().positive(),
});
export type Consumo = z.infer<typeof consumoSchema>;

/**
 * A quién o a qué alcanza. **`cantidad` corregido en la vuelta 1 (C1).**
 *
 * `bless` (SRD 5.1, `spells/1st-level/bless.yml`) declara sus objetivos como
 * `'@item.level + 2'` — una **suma**, no un origen puro. La primera versión de este campo
 * aceptaba `cantidad: { tipo: "nivelDeEspacio" }` y lo resolvía a 1 objetivo con un espacio de
 * nivel 1, cuando `bless` afecta a 3: el conjuro importado quedaba silenciosamente mal, que es
 * peor que quedar fuera. Ningún `Origen` por sí solo puede decir «nivel de espacio más dos», así
 * que la variante compuesta lleva su propio `mas` — `{ origen: { tipo: "nivelDeEspacio" }, mas: 2 }`
 * es la forma literal de `bless`.
 *
 * **`tipo` sin `punto` ni `area`, y sin valor por defecto (vuelta 1, I6 y M8).** Los datos del
 * SRD no traen esos dos valores en `target.affects.type` de las actividades: lo que Foundry llama
 * plantilla de área vive en `target.template`, no aquí, y ese campo es de mapa (fase 3, fuera de
 * alcance). Y un valor por defecto de `"criatura"` inventaría significado de dominio donde el
 * dato de origen no dice nada: 105 de los 319 conjuros del SRD traen `affects.type` vacío
 * (medido), y forzarlos a «criatura» sería una afirmación que la fuente no hace.
 */
export const objetivoSchema = z.object({
  tipo: z.enum(["personal", "criatura", "objeto"]).optional(),
  /** Ausente = un solo objetivo. Nunca una cadena: es un entero fijo o un `Origen`, con o sin suma. */
  cantidad: z
    .union([
      z.number().int().positive(),
      z
        .object({
          origen: origenSchema,
          /** El «+2» de `bless`. `0` = sin suma, el origen solo. */
          mas: z.number().int().default(0),
        })
        .strict(),
    ])
    .optional(),
});
export type Objetivo = z.infer<typeof objetivoSchema>;

/**
 * Distancia. **Unión discriminada por `unidad` (vuelta 1, M9)**: un `z.object` suelto dejaba
 * escribir `unidad: "pies"` sin `distanciaFt`, que no significa nada — «a pies, pero ¿a cuántos?».
 *
 * **`"especial"` añadido en la vuelta 1 (I6).** Medido sobre los 319 conjuros del SRD:
 * `range.units` trae `mi` (millas) 3 veces y `spec` (especial, con su propio texto) 2 veces. Las
 * millas **no** entran como unidad propia — este proyecto guarda toda distancia en pies, el mismo
 * principio que las onzas y los cobres (D-2B-4) — así que una milla se convierte a 5280 pies al
 * importar en el paso 3, y aquí solo hace falta la unidad que ya usamos. `spec` sí necesita hueco
 * propio: esas dos son alcances que no se miden en pies ni son toque/personal/ilimitado, y su
 * texto va en `description` porque no hay un número que capturar.
 */
export const rangoSchema = z.discriminatedUnion("unidad", [
  z.object({ unidad: z.literal("pies"), distanciaFt: z.number().int().positive() }).strict(),
  z.object({ unidad: z.literal("toque") }).strict(),
  z.object({ unidad: z.literal("personal") }).strict(),
  z.object({ unidad: z.literal("ilimitado") }).strict(),
  z.object({ unidad: z.literal("especial") }).strict(),
]);
export type Rango = z.infer<typeof rangoSchema>;

/**
 * Cuánto dura lo que la actividad deja. **Corregido tras la tarea 0** (concentración) **y
 * ampliado en la vuelta 1 (I6)**.
 *
 * En los datos de Foundry la concentración vive en `properties` **del objeto**
 * (`spells/1st-level/bless.yml`: `properties: [concentration]`), y no en
 * `duration.concentration` de la actividad, que en `bless` vale `false`. Copiar el sitio
 * equivocado daría un `bless` sin concentración. Aquí la concentración vive en la propia
 * duración, que es de donde depende de verdad.
 *
 * **`"hastaQueSeDisipe"` y `"especial"` añadidos en la vuelta 1.** Medido sobre los 319 conjuros
 * del SRD: `duration.units` trae `disp` («hasta que se disipe») 10 veces y `dstr` («hasta que se
 * disipe o se dispare») 2 veces — las dos se recogen en `"hastaQueSeDisipe"`, porque la diferencia
 * entre «se disipa» y «se disipa o se dispara» es un matiz que hoy no automatizamos, no un
 * vocabulario distinto — y `spec` (duración con su propio texto) 2 veces, en `"especial"`. Sin
 * este hueco, esos 14 conjuros se importarían como `"instantanea"` en el paso 3, que es mentira:
 * la lección exacta que `character-state.schema.ts` ya declaró para «hasta el próximo descanso
 * largo» (no es una duración que se pueda contar en segundos) vale igual aquí.
 */
export const duracionSchema = z.object({
  /** Ausente = instantánea. */
  valor: z.number().int().positive().optional(),
  unidad: z.enum([
    "instantanea",
    "asalto",
    "minuto",
    "hora",
    "dia",
    "hastaQueSeDisipe",
    "especial",
  ]),
  concentracion: z.boolean().default(false),
});
export type Duracion = z.infer<typeof duracionSchema>;

/**
 * Componentes materiales con coste. **Nuevo tras la tarea 0**: no estaba en el borrador y hace
 * falta. `spells/3rd-level/revivify.yml` lo trae: `{ value: 'Diamonds worth 300gp…',
 * consumed: true, cost: 100 }` — sus propios datos discrepan de su propio texto (300 gp escrito,
 * 100 declarado), que es el argumento entero de por qué se copian los nombres y nunca los
 * valores.
 */
export const materialesSchema = z.object({
  texto: z.string().min(1).max(300),
  consumido: z.boolean().default(false),
  /** En cobres, como todo el dinero del proyecto (D-2B-4). `0` = sin coste. */
  costeCp: z.number().int().min(0).default(0),
});
export type Materiales = z.infer<typeof materialesSchema>;

/**
 * La forma común a **toda** actividad, **sin la invariante aplicada (vuelta 1, C2)**.
 *
 * Es el objeto que A6 extiende: `actividadBaseObjectSchema.extend({ tipo: z.literal("ataque"),
 * ... }).superRefine(actividadTieneMecanicaOTexto)`. La primera versión de este fichero solo
 * exportaba `actividadBaseSchema` ya envuelta en `.refine(...)`, es decir un `ZodEffects` —
 * medido en ejecución: su `.extend` y su `.merge` son `undefined`, y `z.discriminatedUnion` no lo
 * admite —, así que A6 no tenía más remedio que `z.intersection` o volver a declarar los nueve
 * campos: el remodelado que esta tarea existía para evitar, y una segunda copia de una forma que
 * ya se dijo que vive una sola vez.
 *
 * **`uses` no aparece como campo, y es a propósito.** `uses` **es** `CharacterResource`
 * (`apps/api/prisma/schema.prisma`), que ya tiene `current`, `max`, `resetOn` y `grantedBy`: es
 * el `uses` de Foundry, ya construido y probado. Cuando una actividad tiene sus propios usos (la
 * Furia del bárbaro), lo que se escribe aquí es su `consumption` apuntando a la **clave** de ese
 * `CharacterResource` — nunca una tabla nueva ni un campo `uses` paralelo. Que nadie lo
 * reconstruya dentro de seis meses: si hace falta un contador, ya existe uno.
 *
 * **`effects` reutiliza `applyConditionSchema` de `character-state.schema.ts`, literalmente —
 * no una copia traducida (vuelta 1, I4).** La primera versión declaraba su propia forma con los
 * mismos tres campos y otros nombres (`clave`/`nivel`/`duracionSegundos` en vez de
 * `key`/`level`/`durationSeconds`), sin `note` y con el literal `31_536_000` repetido a mano: el
 * vocabulario paralelo exacto contra el que avisa este mismo comentario en su versión anterior.
 *
 * **Y esto es un recorte deliberado, no una equivalencia.** Los `effects` de Foundry no son solo
 * condiciones: los de `shield` y `bless` son cambios numéricos (`system.attributes.ac.bonus` en
 * el primero, `system.bonuses.abilities.save` y los cuatro `system.bonuses.*wak.attack` en el
 * segundo). Quedarnos con las condiciones del motor cubre «qué estado aplica» y dice explícitamente
 * que **no** cubre «qué número cambia»: ese es un tipo de efecto que esta tarea no construye, y
 * cuando haga falta importar `bless` de verdad, su +1d4 va en la actividad `dados`/`salvacion` de
 * A6, no aquí.
 *
 * **`.strict()` en la raíz (vuelta 1, I5).** Medido: sin ella,
 * `{ activation: {...}, description: "x", uses: { max: 3 } }` se aceptaba y `uses` se descartaba
 * en silencio — exactamente el campo que este comentario pide que nadie reconstruya, tirado sin
 * avisar a quien lo mandó. Con la raíz estricta, cualquier clave que este esquema no declara
 * (`uses`, o un `descripcion` mal escrito en vez de `description` en el paso 3) revienta el parse
 * en vez de desaparecer.
 */
export const actividadBaseObjectSchema = z
  .object({
    activation: activacionSchema,
    consumption: z.array(consumoSchema).default([]),
    target: objetivoSchema.optional(),
    range: rangoSchema.optional(),
    duration: duracionSchema.default({ unidad: "instantanea", concentracion: false }),
    effects: z.array(applyConditionSchema).default([]),
    /**
     * **`.trim()` antes de `.min(1)` (vuelta 1, M7).** Sin él, `"   "` pasaba la validación del
     * campo y satisfacía la invariante de más abajo con una cadena que no dice nada.
     */
    description: z.string().trim().min(1).max(2000).optional(),
    materiales: materialesSchema.optional(),
  })
  .strict();
export type ActividadBaseObjeto = z.infer<typeof actividadBaseObjectSchema>;

/**
 * La invariante que salva el paso 3, **exportada aparte de la forma (vuelta 1, C2)** para que
 * cada actividad concreta de A6 pueda aplicarla con `.superRefine` sobre su propia extensión, en
 * vez de que esta tarea decida por adelantado cómo se compone.
 *
 * Una actividad sin descripción y sin mecánica (nada que consuma, ningún efecto que deje) no
 * importa nada: no queda nada que hacer con ella. Un conjuro importado sin mecánica automatizada
 * tiene que traer al menos su texto, o se pierde por completo al pasar por este esquema.
 *
 * **Sin `path` fijo (vuelta 1, M11).** La primera versión clavaba el error en `["description"]`
 * siempre, aunque el motivo real pudiera ser la falta de mecánica y no la falta de texto — habría
 * señalado el campo equivocado la mitad de las veces. El error queda en la raíz: dice qué falta
 * en su mensaje, no en un campo que puede ser el que sí está.
 */
export function actividadTieneMecanicaOTexto(
  actividad: {
    description?: string;
    consumption: Consumo[];
    effects: ApplyConditionInput[];
  },
  ctx: z.RefinementCtx,
): void {
  const tieneDescripcion = actividad.description !== undefined;
  const tieneMecanica = actividad.consumption.length > 0 || actividad.effects.length > 0;
  if (!tieneDescripcion && !tieneMecanica) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Una actividad sin descripción y sin mecánica no importa nada: no queda nada que hacer con ella.",
    });
  }
}

/** La forma común, completa y lista para usar directamente (no para extender: para eso está
 * `actividadBaseObjectSchema`). */
export const actividadBaseSchema = actividadBaseObjectSchema.superRefine(
  actividadTieneMecanicaOTexto,
);
export type ActividadBase = z.infer<typeof actividadBaseSchema>;
