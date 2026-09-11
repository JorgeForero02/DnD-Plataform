import { z } from "zod";

// Tareas 2A.8 y 2A.12 — recursos consumibles, descansos, y condiciones.

/**
 * Un recurso consumible. **Inspiración, furia, ki, dados de golpe y espacios de conjuro son el
 * mismo mecanismo**: un contador con máximo que un descanso repone. Por eso son una tabla y no
 * cinco funcionalidades.
 */
export const resourceResetSchema = z.enum(["NONE", "SHORT_REST", "LONG_REST"]);
/** El tipo, para que la pantalla no vuelva a escribir los tres valores a mano. */
export type ResourceReset = z.infer<typeof resourceResetSchema>;

/**
 * Quién puede subirlo. Es el **caso estrecho** de permisos por campo que 2A sí necesita —la
 * inspiración la concede el DM, la furia la gasta y la recupera su dueño—, y el único: los
 * permisos por campo generales quedan fuera de 2A.
 */
export const resourceGrantorSchema = z.enum(["DM_ONLY", "OWNER"]);

export const upsertResourceSchema = z.object({
  key: z.string().min(1).max(60),
  label: z.string().min(1).max(120),
  current: z.number().int().min(0).max(9999),
  max: z.number().int().min(0).max(9999).nullable().optional(),
  resetOn: resourceResetSchema.default("NONE"),
  grantedBy: resourceGrantorSchema.default("OWNER"),
});
export type UpsertResourceInput = z.infer<typeof upsertResourceSchema>;

/** Gastar o reponer. **Delta y no valor absoluto**, por el mismo motivo que los PG. */
export const spendResourceSchema = z.object({
  amount: z.number().int().min(1).max(9999),
  reason: z.string().max(280).optional(),
});
export type SpendResourceInput = z.infer<typeof spendResourceSchema>;

/**
 * **Regalar un recurso a otro personaje de la mesa** (plan 08, ficha I8).
 *
 * Del SRD, sobre la inspiración: *«you can give it to another player»*. No es un gasto seguido de
 * una reposición —eso serían dos peticiones y un momento en que la inspiracion esta en los dos o
 * en ninguno—, es **un solo gesto** que el servidor resuelve en una transaccion.
 */
export const giveResourceSchema = z.object({
  toCharacterId: z.string().min(1),
  amount: z.number().int().min(1).max(9999).default(1),
  reason: z.string().max(280).optional(),
});
export type GiveResourceInput = z.infer<typeof giveResourceSchema>;

/**
 * Declarar un descanso.
 *
 * **Corto**: repone lo marcado `SHORT_REST` y permite gastar dados de golpe para curarse.
 * **Largo**: repone todo lo consumible, devuelve los PG al máximo, recupera **la mitad de los
 * dados de golpe redondeando hacia arriba, mínimo uno** —no todos, que es el error clásico— y
 * baja un nivel de agotamiento.
 */
export const declareRestSchema = z.object({
  kind: z.enum(["SHORT", "LONG"]),
  /** Dados de golpe que se gastan en un descanso corto, con su curación. Solo en el corto. */
  spendHitDice: z.number().int().min(0).max(20).optional(),
  /**
   * **El descanso se interrumpió, y lo declara el DM** (2C.3, hueco H-2C-2).
   *
   * El SRD dice que una hora de actividad agotadora —andar, luchar, lanzar conjuros— obliga a
   * **empezar el descanso otra vez**: <https://5thsrd.org/adventuring/resting/>. La máquina **no
   * puede detectarlo** —no sabe que os atacaron a la tercera hora—, así que lo honesto es que lo
   * diga quien arbitra: «este descanso se interrumpió». La máquina ejecuta, el DM arbitra.
   *
   * **Y entonces no da nada**, que es lo que dice la fuente y no lo que decía nuestro plan. El
   * plan de 2C prometía «con una hora hecha, se cobran los beneficios de un corto»: eso **no está
   * en el SRD 5.1** —es un arbitraje de mesa, razonable pero de la casa—, y aquí manda la fuente.
   * Un DM que quiera darles el corto lo tiene a un botón: declarar un descanso corto.
   */
  interrupted: z.boolean().optional(),
  reason: z.string().max(280).optional(),
});
export type DeclareRestInput = z.infer<typeof declareRestSchema>;

/**
 * Las quince condiciones del SRD 5.1 que **el motor entiende**.
 *
 * La clave de la tabla es **libre**, no este enum: cualquier otra —«concentrándose en
 * Bendición»— se guarda, se enseña y no calcula nada. El informe de huecos avisó de que un enum
 * cerrado deja la concentración fuera y añadirla después es una migración; esta lista dice qué
 * se automatiza, no qué se puede escribir.
 */
export const SRD_CONDITIONS = [
  "blinded",
  "charmed",
  "deafened",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
  "exhaustion",
] as const;
export const srdConditionSchema = z.enum(SRD_CONDITIONS);
export type SrdCondition = z.infer<typeof srdConditionSchema>;

/**
 * **La marca que deja la accion Ayudar** (plan 08, ficha I8).
 *
 * **No es una condicion del SRD**, y por eso no esta en la lista de arriba: las quince de esa lista
 * son estados de la criatura, y esto es el rastro de una accion que alguien hizo por ti. Se guarda
 * en la misma tabla porque **es exactamente la misma forma** —una clave sobre un personaje, con
 * origen y con vencimiento (2C.4)—, y montar una tabla aparte para una fila con las mismas cuatro
 * columnas habria sido duplicar el mecanismo.
 *
 * SRD 5.1, accion Ayudar: *«you can aid a friendly creature in attacking a creature within 5 feet
 * of you... the first attack roll is made with advantage»*. **Da ventaja, no un +1d4** —el +1d4 es
 * `Bless`, que es un conjuro—, dura **una sola tirada** y **caduca al principio de tu siguiente
 * turno**.
 *
 * El motor SI la entiende, a diferencia de una clave libre cualquiera: entra en la sugerencia de
 * ventaja del ataque (`suggested-roll-mode.ts`). Esta escrita aqui, en `shared`, porque la usan el
 * servidor y la pantalla y una clave copiada en dos sitios acaba escrita de dos formas.
 */
/**
 * **En que BORDE de turno se corta una condicion** (paso 1, tarea 4, 2026-09-06).
 *
 * Foundry separa dos cosas que aqui estaban fundidas (`module/data/shared/duration-field.mjs` de
 * `Mine/referencia-foundry-dnd5e`): **cuanto dura** y **en que borde de turno se corta**. El
 * segundo es un vocabulario cerrado de cuatro, cruce de quien x que borde
 * (`module/documents/active-effect.mjs`).
 *
 * Lo que NO se copia de ahi: su vencimiento es un calculo vivo en el cliente que ejecuta el GM
 * activo, y resuelve una concurrencia entre navegadores **que un servidor no tiene**.
 *
 * `sourceStart` es el de la accion Ayudar: SRD 5.1, *«the first attack roll is made with
 * advantage»* y dura hasta **el principio del siguiente turno de quien ayuda**. Los otros tres
 * estan escritos porque el vocabulario es el que es —no se inventa uno de uno— y porque un enum
 * de PostgreSQL se anade pero no se edita.
 */
export const BORDES_DE_CADUCIDAD = [
  "sourceStart",
  "sourceEnd",
  "targetStart",
  "targetEnd",
] as const;
export const bordeDeCaducidadSchema = z.enum(BORDES_DE_CADUCIDAD);
export type BordeDeCaducidad = (typeof BORDES_DE_CADUCIDAD)[number];

export const CLAVE_AYUDA = "helped";

/**
 * **La marca que deja la Furia del bárbaro al usarse** (paso 2, tarea A11). Vive aquí, junto a
 * `CLAVE_AYUDA`, y no en `apps/api/src/rules/catalog/classes.ts` —donde se declaró primero—
 * porque `esClaveReservada` (más abajo) tiene que reconocerla, y `shared` no puede importar de
 * `apps/api`. `classes.ts` importa esta constante en vez de declarar su propia cadena: dos
 * literales `"raging"` en dos ficheros es exactamente cómo una clave reservada deja de estarlo el
 * día que uno de los dos cambia y el otro no se entera.
 */
export const CLAVE_FURIA_ACTIVA = "raging";

/**
 * **La marca de que un personaje a 0 PG dejó de tirar salvaciones de muerte** (Tarea 16, H1b).
 * Vive junto a `CLAVE_AYUDA` y `CLAVE_FURIA_ACTIVA` por el mismo motivo: `esClaveReservada`
 * (más abajo) tiene que reconocerla, y `character-sheet.service.ts` la usa para no repetir el
 * literal `"stable"` en dos sitios.
 *
 * SRD 5.1, «Stabilizing a Creature»: *«A stable creature doesn't make death saving throws, even
 * though it has 0 hit points, but it does remain unconscious. The creature stops being stable,
 * and must start making death saving throws again, if it takes any damage. A stable creature
 * that isn't healed regains 1 hit point after 1d4 hours.»*
 *
 * **Por qué es una condición reservada y no una columna nueva.** Hasta la Tarea 16, `estabilizado`
 * ponía los contadores de salvación a cero y no dejaba ningún rastro: un `GET` posterior no podía
 * distinguir «está estable» de «acaba de caer a 0 PG y todavía no ha tirado nada» — los dos casos
 * tienen `successes: 0, failures: 0`. `CharacterCondition` ya es donde vive un estado que dura
 * hasta que algo lo quita, y una clave libre la escribiría cualquier jugador sobre sí mismo sin
 * pasar por las tres tiradas que el SRD exige — la misma reincidencia que ya cerraron `helped` y
 * `raging`.
 */
export const CLAVE_ESTABLE = "stable";

/**
 * **¿Esta clave la INTERPRETA el servidor?** (paso 1, tarea 1).
 *
 * Las quince del SRD cambian el modo de tirada sugerido y la velocidad efectiva; `helped` concede
 * ventaja en el ataque. Ninguna de las dos cosas puede escribirse por la puerta generica de
 * condiciones sin mirar quien llama: la clave es texto libre y sin `durationSeconds` la condicion
 * es indefinida, asi que un jugador podia concederse **ventaja permanente y renovable** sobre si
 * mismo.
 *
 * Lo que esto NO dice es que la clave este prohibida: dice que **hay que preguntar quien llama**.
 * El DM sigue envenenando a la mesa por esta ruta, que es como se juega.
 *
 * **Lo que deja fuera a proposito, y no es un olvido:** la concentracion, que el motor lee por
 * PREFIJO (`CONCENTRATION_KEY_PREFIX`, `apps/api/src/character-state/concentration/`) y no por
 * igualdad. Un jugador que lanza un conjuro tiene que poder marcar que se concentra sobre si
 * mismo: es lo que hace, no algo que se concede. La contrapartida esta escrita donde toca —
 * recibir dano le pide la salvacion.
 *
 * **Compara por igualdad exacta, y eso es correcto porque los motores tambien.**
 * `suggested-roll-mode.ts`, `effective-speed.ts` y `modo-contra-objetivo.ts` comparan la clave
 * tal cual, y el esquema no recorta ni normaliza, asi que `"Helped"` o `"prone "` no los lee
 * nadie y no hay nada que reservar. **Si algun dia un motor normaliza la clave, esta funcion
 * tiene que normalizarla igual**, o la reserva se rodea escribiendo una mayuscula.
 *
 * Vive en `shared` y no en la API porque describe el contrato de los datos, que es lo que
 * `shared` guarda; **hoy solo la usa el servidor** y la pantalla todavia ofrece las quince a
 * cualquiera (ficha en `docs/06-pendientes.md`).
 *
 * **`raging` entró en la ronda de arreglo 1 de la tarea A11, y es la reincidencia exacta del
 * agujero que esta función cierra para `helped`.** `bonoDeFuria`
 * (`apps/api/src/characters/character-sheet.service.ts`) sube el daño cuerpo a cuerpo con Fuerza
 * mientras exista una `CharacterCondition` con esta clave — es, letra por letra, «una condición
 * que el servidor interpreta», la categoría que el párrafo de arriba describe. Sin esta línea,
 * `ConditionsService.apply` dejaba escribir `{ key: "raging" }` sobre el propio personaje a
 * cualquier jugador (`requireOwnerOrDM` pasa: es su ficha) y se llevaba +2 permanente al daño sin
 * gastar la acción adicional ni un uso de la Furia — la vía entera que `usar()` existe para
 * cerrar, abierta por la puerta de al lado.
 */
export function esClaveReservada(key: string): boolean {
  return (
    key === CLAVE_AYUDA ||
    key === CLAVE_FURIA_ACTIVA ||
    key === CLAVE_ESTABLE ||
    (SRD_CONDITIONS as readonly string[]).includes(key)
  );
}

/**
 * Ayudar a alguien de la mesa.
 *
 * **Lo unico que se declara es a quien**, porque es lo unico que el servidor puede saber. El SRD
 * exige ademas que el enemigo este **a 5 pies de quien ayuda**, y eso son distancias: no las
 * tenemos, no se comprueban, y **la pantalla lo dice** en vez de fingir que si.
 */
export const helpSchema = z.object({
  targetCharacterId: z.string().min(1),
});
export type HelpInput = z.infer<typeof helpSchema>;

export const applyConditionSchema = z.object({
  key: z.string().min(1).max(60),
  /** Solo el agotamiento tiene nivel, de 1 a 6. */
  level: z.number().int().min(1).max(6).optional(),
  note: z.string().max(280).optional(),
  /**
   * **Cuánto dura, en segundos de juego** (2C.4). Sin esto la condición es indefinida y la quita
   * el DM a mano, que es como funcionaba hasta 2C y sigue siendo lo correcto para «envenenado
   * hasta que alguien te cure».
   *
   * **Segundos y no un vocabulario cerrado de duraciones**, y eso se decidió mirando la fuente:
   * las duraciones del SRD son 1 asalto, 1 minuto, 10 minutos, 1 hora, 8 horas, 24 horas, 7 días,
   * 10 días y 30 días — nueve valores que son todos **múltiplos de segundos** del mismo reloj. Un
   * enum con esos nueve obligaría a migrarlo el día que un objeto dure 3 días, y la pantalla
   * puede ofrecer los nueve botones igual.
   *
   * Lo que **no** entra aquí es «hasta el próximo descanso largo» ni «mientras te concentres»:
   * esas no son duraciones, son sucesos, y modelarlas como un número sería mentir. Están
   * declaradas como pendientes.
   *
   * El tope es un año, el mismo del reloj: más que eso no es una condición, es un cambio de
   * personaje.
   */
  durationSeconds: z.number().int().positive().max(31_536_000).optional(),
});
export type ApplyConditionInput = z.infer<typeof applyConditionSchema>;

/**
 * **A que puede apuntar un modificador temporal** (plan 13, ficha M8). **Vocabulario CERRADO**, no
 * texto libre: libre llegaria a la pantalla sin traducir y al motor sin significado.
 *
 * Son **las seis caracteristicas, la CA y las cinco velocidades**, y ni una mas: es exactamente lo
 * que la hoja ya sabe derivar, y **un modificador a algo que la hoja no calcula es un numero
 * decorativo**. Las claves son las mismas que usa la traza (`ability.str`, `ac`, `speed.walk`), no
 * unas paralelas: dos vocabularios para lo mismo acaban discrepando.
 */
export const TEMPORARY_MODIFIER_TARGETS = [
  "ability.str",
  "ability.dex",
  "ability.con",
  "ability.int",
  "ability.wis",
  "ability.cha",
  "ac",
  "speed.walk",
  "speed.climb",
  "speed.swim",
  "speed.fly",
  "speed.burrow",
] as const;
export const temporaryModifierTargetSchema = z.enum(TEMPORARY_MODIFIER_TARGETS);
export type TemporaryModifierTarget = z.infer<typeof temporaryModifierTargetSchema>;

/**
 * Conceder un modificador temporal.
 *
 * **`durationSeconds` es del reloj de CAMPANA** (2C.3), no de pared: «una hora» son 3600 segundos
 * de la partida. Sin el, el modificador dura **hasta que alguien lo quite** — hay efectos que duran
 * «hasta que el DM lo diga», y fingir una duracion habria sido inventarse una regla.
 */
export const grantTemporaryModifierSchema = z.object({
  target: temporaryModifierTargetSchema,
  /** **Con signo**: los jugadores pidieron subidas Y bajadas. Cero no es un modificador. */
  amount: z
    .number()
    .int()
    .min(-20)
    .max(20)
    .refine((n) => n !== 0, "Un modificador de cero no hace nada."),
  reason: z.string().min(1).max(160),
  durationSeconds: z.number().int().min(1).max(31536000).optional(),
});
export type GrantTemporaryModifierInput = z.infer<typeof grantTemporaryModifierSchema>;
