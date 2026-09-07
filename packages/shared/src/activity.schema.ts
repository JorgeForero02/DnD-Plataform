import { z } from "zod";
import { costeSchema } from "./action-economy.schema";
import { origenSchema } from "./origen.schema";
import { applyConditionSchema, type ApplyConditionInput } from "./character-state.schema";
import { abilityKeySchema } from "./rules/trace.schema";
import { damageTypeSchema } from "./item.schema";

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
 * ... })`, sin refinar todavía — la invariante se cuelga una sola vez sobre la unión completa de
 * las cinco (ver `actividadSchema`, más abajo), no en cada rama; `z.discriminatedUnion` necesita
 * el `.shape` de cada opción y un `ZodEffects` no lo tiene. La primera versión de este fichero
 * solo exportaba `actividadBaseSchema` ya envuelta en `.refine(...)`, es decir un `ZodEffects` —
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
 * `actividadBaseSchema` la aplique directamente sobre el objeto base, y para que `actividadSchema`
 * (tarea A6, más abajo) la cuelgue **una sola vez sobre la unión ya construida** — no sobre cada
 * rama por separado; ver el porqué en el comentario de `actividadSchema`.
 *
 * Una actividad sin descripción y sin mecánica (nada que consuma, ningún efecto que deje) no
 * importa nada: no queda nada que hacer con ella. Un conjuro importado sin mecánica automatizada
 * tiene que traer al menos su texto, o se pierde por completo al pasar por este esquema.
 *
 * **`tipo` es opcional y cuenta como mecánica por sí solo, salvo `utilidad` (vuelta de arreglo 1
 * de A6, crítico de la revisión).** `actividadBaseObjectSchema` no tiene `tipo`, así que sobre él
 * este parámetro llega `undefined` y el comportamiento es el de siempre: solo cuentan
 * `consumption` y `effects`. Pero una vez que la actividad es una de las cinco de A6, `ataque`,
 * `salvacion`, `dados` y `prueba` traen su propio campo obligatorio (`ataque.bono`,
 * `salvacion.{ability,cd,siSalva}`, `dados.{n,caras,bonus,signo}`, `prueba.{ability,cd}`), y esa
 * es su mecánica — exigir además un `consumption` o un `effects` habría rechazado un ataque de
 * arma real: **una espada no consume nada, no deja efectos y no necesita texto**, y antes de este
 * arreglo el esquema la rechazaba igual que rechazaría una actividad vacía. Solo `utilidad` no
 * trae un campo propio, así que sigue dependiendo de `consumption`/`effects`/`description` como
 * antes.
 *
 * **Sin `path` fijo (vuelta 1, M11).** La primera versión clavaba el error en `["description"]`
 * siempre, aunque el motivo real pudiera ser la falta de mecánica y no la falta de texto — habría
 * señalado el campo equivocado la mitad de las veces. El error queda en la raíz: dice qué falta
 * en su mensaje, no en un campo que puede ser el que sí está.
 */
export function actividadTieneMecanicaOTexto(
  actividad: {
    tipo?: TipoDeActividad;
    description?: string;
    consumption: Consumo[];
    effects: ApplyConditionInput[];
  },
  ctx: z.RefinementCtx,
): void {
  const tieneDescripcion = actividad.description !== undefined;
  const tieneMecanicaBase = actividad.consumption.length > 0 || actividad.effects.length > 0;
  const tieneMecanicaPropia = actividad.tipo !== undefined && actividad.tipo !== "utilidad";
  if (!tieneDescripcion && !tieneMecanicaBase && !tieneMecanicaPropia) {
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

// ---------------------------------------------------------------------------------------------
// Tarea A6 (paso 2) — las cinco actividades.
//
// Decisión del autor del 2026-09-06, que no se reabre: cinco actividades y ninguna más. `prueba`
// y `salvacion` no se funden aunque las dos sean «alguien tira contra una CD» — el SRD las
// distingue y fundir vocabulario cerrado es difícil de deshacer. `summon`, `teleport`,
// `transform`, `enchant`, `forward`, `order`, `cast` y `check` quedan fuera: piden tablero o
// criaturas nuevas, que es la fase 3. Esos conjuros se importan igual, con su texto, como
// `utilidad` — comprobado con `conjure-animals`. Ver
// `.superpowers/sdd/2026-09-06-tanda-paso2-y-botin/briefs/esquema-corregido.md`, sección 3.

/** Los cinco tipos de actividad, y ninguno más. */
export const TIPOS_DE_ACTIVIDAD = ["ataque", "salvacion", "dados", "utilidad", "prueba"] as const;
export type TipoDeActividad = (typeof TIPOS_DE_ACTIVIDAD)[number];

const carasDeDadoSchema = z.union([
  z.literal(4),
  z.literal(6),
  z.literal(8),
  z.literal(10),
  z.literal(12),
  z.literal(20),
  z.literal(100),
]);
const carasDeDadoDeEscaladoSchema = z.union([
  z.literal(4),
  z.literal(6),
  z.literal(8),
  z.literal(10),
  z.literal(12),
]);

/**
 * Una expresión de dados. Funde daño y curación: no es una simplificación nuestra, es literal
 * en Foundry (`module/data/shared/heal-data.mjs`, `healing: new DamageField()` — el mismo campo
 * que el daño). Lo distingue `signo`: `1` cura, `-1` daña.
 *
 * **Cero dados es un caso real (tarea 0).** `spells/3rd-level/revivify.yml` cura exactamente 1
 * punto: `healing: { number: null, denomination: null, custom: { formula: '1' } }`. Con `n` y
 * `caras` obligatorios esa forma no cabe, así que los dos son opcionales y una expresión sin
 * dados es solo su `bonus`. Lo que no puede pasar es que falten los dos: una expresión vacía no
 * existe, y el `superRefine` de abajo lo comprueba.
 *
 * **`bonus` es un `Origen`, nunca una cadena.** Es la frontera con Foundry: `simplifyBonus`
 * (`module/utils.mjs`) evalúa texto como `"@mod + 2"` y devuelve 0 en silencio si algo no evalúa.
 * Aquí no hay fórmula que parsear.
 *
 * **`escalado` tiene dos ejes que no se pueden confundir.** `spells/3rd-level/fireball.yml`
 * escala por espacio (+1d6 por nivel de espacio por encima del 3.º); `spells/cantrip/fire-bolt.yml`
 * escala por nivel de personaje. Un solo campo «escala» daría un truco que sube al gastar un
 * espacio de 5.º, que es falso.
 *
 * **Una sola expresión, y en Foundry `damage.parts` es un array (nota para el paso 3).** Aquí
 * `ataque` y `salvacion` solo llevan un `dados?` cada uno, no un array — es la forma más simple
 * que cubre la mayoría, pero **no** cubre el daño mixto: medido sobre el SRD hay 3 conjuros y 2
 * rasgos de monstruo con dos o tres partes de daño de tipos distintos en la misma actividad (por
 * ejemplo, un arma que además quema). El paso 3 va a encontrarlos; que no sea una sorpresa: si
 * hace falta importarlos de verdad, la salida más simple es una segunda actividad `dados` que
 * viaje junto a la principal, no ampliar `dados?` a un array aquí y forzar a las 322 actividades
 * sin daño mixto a tratarlo como una lista de uno.
 */
const expresionDeDadosSchema = z
  .object({
    /** Ausente = sin dados: la expresión es solo su `bonus`. */
    n: z.number().int().min(1).max(100).optional(),
    caras: carasDeDadoSchema.optional(),
    /** NUNCA una cadena. Es un `Origen` o no está. */
    bonus: origenSchema.optional(),
    /** `1` cura, `-1` daña. Es el MISMO campo: en Foundry ya son lo mismo. */
    signo: z.union([z.literal(1), z.literal(-1)]),
    tipoDeDano: damageTypeSchema.optional(),
    escalado: z
      .object({
        por: z.enum(["espacio", "nivelDePersonaje"]),
        n: z.number().int().min(1).max(20),
        caras: carasDeDadoDeEscaladoSchema,
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((expresion, ctx) => {
    const tieneUnDado = expresion.n !== undefined || expresion.caras !== undefined;
    const tieneLosDosDados = expresion.n !== undefined && expresion.caras !== undefined;
    if (tieneUnDado && !tieneLosDosDados) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "n y caras van juntos: no puede haber uno sin el otro.",
      });
      return;
    }
    if (!tieneLosDosDados && expresion.bonus === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Una expresión de dados necesita dados (n y caras juntos) o un bonus: una expresión vacía no existe.",
      });
    }
  });
export type ExpresionDeDados = z.infer<typeof expresionDeDadosSchema>;

/**
 * `ataque` — contra qué CA, con qué bono, y **con sus dados dentro (vuelta de arreglo 1,
 * crítico 1)**. «Contra qué CA» no lleva campo: un ataque es, por definición, contra la CA de
 * quien lo recibe, y esa CA vive en la ficha del objetivo, no en la actividad.
 *
 * **`dados` es opcional y vive AQUÍ, no en una actividad `dados` aparte.** En Foundry una
 * actividad `attack` lleva su propio bloque `damage` — no son dos actividades. Medido sobre los
 * 331 ficheros de `spells/`: de 18 actividades `attack`, 12 llevan `damage.parts` con dados
 * dentro (`fire-bolt`, con su escalado por nivel de personaje, es una de ellas). Partirlas en un
 * `ataque` sin daño y una `dados` sin saber que depende de acertar habría perdido justo lo que
 * las ata — «cabe perdiendo información en silencio», que es peor que no caber.
 */
const ataqueSchema = actividadBaseObjectSchema.extend({
  tipo: z.literal("ataque"),
  ataque: z.object({ bono: origenSchema }).strict(),
  dados: expresionDeDadosSchema.optional(),
});

/**
 * `salvacion` — qué característica, contra qué CD (un `Origen`, nunca un entero: `fireball`
 * declara `save.dc.calculation: spellcasting`, la variante `cdDeConjuro`), qué pasa si el objetivo
 * salva, y **sus dados, si los tiene (vuelta de arreglo 1, crítico 1)**.
 *
 * Misma razón que en `ataque`: en Foundry una actividad `save` lleva su propio `damage` —
 * `fireball` es UNA actividad `save` con `ability: dex`, `dc.calculation: spellcasting`,
 * `damage.parts: [8d6 fire]` y `damage.onSave: half`, no dos actividades separadas. Medido: de
 * 150 actividades `save` del SRD, 69 llevan dados dentro.
 *
 * **`siSalva: "mitad"` solo significa algo si hay daño que reducir a la mitad**: sin `dados`, es
 * una promesa sin nada detrás, y es exactamente la mitad de información que esta corrección
 * existe para rescatar. El `superRefine` de más abajo lo exige.
 *
 * **`ability` se queda con las seis características, sin `"lanzamiento"`** (a diferencia de
 * `prueba`, ver más abajo): una salvación siempre es contra una característica concreta —
 * `fireball` salva por `dex`, no por «la que use quien lanza el ataque». Medido: de las 150
 * actividades `save` del SRD, solo una trae `ability: []` (sin característica declarada); es un
 * caso suelto y se importa a mano en el paso 3, no una segunda variante que este esquema necesite.
 */
const salvacionSchema = actividadBaseObjectSchema.extend({
  tipo: z.literal("salvacion"),
  salvacion: z
    .object({
      ability: abilityKeySchema,
      cd: origenSchema,
      siSalva: z.enum(["ninguno", "mitad"]),
    })
    .strict(),
  dados: expresionDeDadosSchema.optional(),
});

/**
 * `dados` — una expresión con su tipo, positiva o negativa. Daño y curación, fundidas.
 *
 * Es la actividad que usan los conjuros que solo tiran dados sin acertar ni salvar (pocos en el
 * SRD: la mayoría del daño vive dentro de `ataque` o `salvacion`, ver sus comentarios) y las
 * aptitudes que solo curan o dañan sin más mecánica alrededor.
 */
const dadosSchema = actividadBaseObjectSchema.extend({
  tipo: z.literal("dados"),
  dados: expresionDeDadosSchema,
});

/**
 * `utilidad` — nada mecánico: deja un efecto (ya cubierto por `effects` de la base) o un texto
 * (`description`). No añade campo propio porque no hay nada más que declarar.
 */
const utilidadSchema = actividadBaseObjectSchema.extend({
  tipo: z.literal("utilidad"),
});

/**
 * `prueba` — qué característica y contra qué CD.
 *
 * **`ability` acepta también `"lanzamiento"` (vuelta de arreglo 1, crítico 2).** Es el conjuro
 * que motivó esa variante de `Origen` en la tarea A4: `counterspell.yml` trae
 * `check: { ability: spellcasting }`, y un conjuro no puede nombrar una característica concreta
 * porque depende de la clase de quien lo lanza. Medido sobre las 14 actividades `check` del SRD:
 * `ability` vale `spellcasting` 4 veces, una característica concreta solo 2, y vacío las 8
 * restantes (esas 8 se importan como `utilidad` con su texto, no como `prueba` sin característica).
 *
 * **`cd` es opcional.** De esas 14 actividades `check`, 4 traen `dc.calculation` y `dc.formula`
 * vacíos — no hay CD derivable: la de `counterspell` es «10 + el nivel del conjuro lanzado», que
 * no se conoce hasta la mesa y se fija ahí, no en el catálogo. Obligar a inventar una CD aquí
 * sería el mismo fallo que `simplifyBonus` de Foundry: un dato falso pero creíble.
 */
const pruebaSchema = actividadBaseObjectSchema.extend({
  tipo: z.literal("prueba"),
  prueba: z
    .object({
      ability: z.union([abilityKeySchema, z.literal("lanzamiento")]),
      /** Ausente = la CD no se deriva del catálogo: se fija en la mesa (la de `counterspell`). */
      cd: origenSchema.optional(),
    })
    .strict(),
});

/** La unión de las cinco ramas, sin ninguna invariante todavía — el tipo del que parten las dos
 * funciones de más abajo, para no referirse en su firma al alias `Actividad` que depende de ellas
 * mismas (sería una referencia circular). */
type ActividadSinInvariantes =
  | z.infer<typeof ataqueSchema>
  | z.infer<typeof salvacionSchema>
  | z.infer<typeof dadosSchema>
  | z.infer<typeof utilidadSchema>
  | z.infer<typeof pruebaSchema>;

/**
 * `salvacion.siSalva === "mitad"` promete reducir un daño a la mitad — sin `dados` no hay daño
 * que reducir, y la promesa queda vacía (vuelta de arreglo 1, crítico 1). Va como una segunda
 * `superRefine` sobre la unión ya construida, por la misma razón que `actividadTieneMecanicaOTexto`:
 * `z.discriminatedUnion` no admite ramas ya refinadas.
 */
function salvacionMitadTieneDados(actividad: ActividadSinInvariantes, ctx: z.RefinementCtx): void {
  if (
    actividad.tipo === "salvacion" &&
    actividad.salvacion.siSalva === "mitad" &&
    actividad.dados === undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["salvacion", "siSalva"],
      message:
        "'mitad' reduce el daño a la mitad: sin `dados` no hay daño que reducir, y la salvación se queda con una promesa vacía.",
    });
  }
}

/**
 * Las cinco actividades, unión discriminada por `tipo`, y ninguna más.
 *
 * **Las dos invariantes se aplican una sola vez, sobre la unión ya construida, no en cada rama.**
 * El borrador de este fichero (comentario de `actividadBaseObjectSchema` más arriba) proponía
 * `.extend(...).superRefine(actividadTieneMecanicaOTexto)` en cada rama antes de meterla en
 * `z.discriminatedUnion`. **Medido en ejecución: no funciona.** `z.discriminatedUnion` necesita
 * leer `.shape[discriminador]` de cada opción para construir su mapa de dispatch, y un
 * `ZodEffects` (lo que devuelve `.superRefine`) no expone `.shape` — revienta al construir la
 * unión, antes de parsear un solo dato, con `Cannot read properties of undefined (reading
 * 'tipo')`. La unión se construye con los cinco `ZodObject` (que sí tienen `.shape`) y las dos
 * invariantes se cuelgan encima, cada una una sola vez, en vez de declararlas cinco veces.
 */
export const actividadSchema = z
  .discriminatedUnion("tipo", [
    ataqueSchema,
    salvacionSchema,
    dadosSchema,
    utilidadSchema,
    pruebaSchema,
  ])
  .superRefine(actividadTieneMecanicaOTexto)
  .superRefine(salvacionMitadTieneDados);
export type Actividad = z.infer<typeof actividadSchema>;

// ---------------------------------------------------------------------------------------------
// Tarea A7 (paso 2) — el cuerpo de la petición que usa una actividad.
//
// **Nada de la forma de la actividad se toca aquí.** Esto es lo único nuevo: qué manda el cliente
// al pulsar «usar». `objetivos` son ids de `Character` (nunca más de doce, el mismo tope que ya usa
// `createRollRequestSchema.characterIds`, porque una petición de tirada nacida de una actividad de
// salvación reutiliza esa misma cota) y `nivelDeEspacio` solo importa cuando la actividad se paga
// con un espacio de conjuro de nivel superior al mínimo.
export const usarActividadSchema = z.object({
  objetivos: z.array(z.string().cuid()).max(12).optional(),
  nivelDeEspacio: z.number().int().min(1).max(9).optional(),
});
export type UsarActividadInput = z.infer<typeof usarActividadSchema>;

/**
 * Comprobación de tipos, sin coste en tiempo de ejecución: si alguien añade una sexta rama a la
 * unión de `actividadSchema` sin añadir su literal a `TIPOS_DE_ACTIVIDAD` (o al revés), esto deja
 * de compilar. `Equals` es la técnica estándar de igualdad de tipos en TypeScript — una
 * comparación con `extends` sin más se queda corta porque es distributiva sobre uniones y
 * `"a" extends "a" | "b"` da `true` aunque los conjuntos no sean iguales.
 */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type LosTiposDeActividadCoincidenConLaUnion =
  Equals<TipoDeActividad, Actividad["tipo"]> extends true ? true : never;
const _comprobacionDeTipos: LosTiposDeActividadCoincidenConLaUnion = true;
void _comprobacionDeTipos;
