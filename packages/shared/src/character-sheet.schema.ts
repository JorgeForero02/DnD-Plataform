import { z } from "zod";
import {
  abilityScoresSchema,
  characterChoicesSchema,
  contentRefSchema,
} from "./character-build.schema";
import { damageTypeSchema } from "./item.schema";

// Tareas 2A.6 y 2A.7 — la hoja persistida y su estado mutable.
//
// **Se guarda lo decidido; se calcula lo derivado.** Características base, raza, subraza, clase,
// nivel, elecciones resueltas, PG actuales, PG temporales y anulaciones manuales **se guardan**.
// Modificadores, bonificador de competencia, CA, **PG máximos**, CD de conjuro, bonos de ataque
// y competencias heredadas **se calculan siempre y nunca se persisten**.
//
// El motivo, textual de la especificación: guardar lo calculado significa que el día que se
// corrija una fórmula habrá mil filas mintiendo sin forma de saber cuáles.

/** Lo que se escribe en la hoja. Todo opcional: una hoja se rellena a trozos, no de golpe. */
export const updateCharacterSheetSchema = z.object({
  abilities: abilityScoresSchema.partial().optional(),
  race: contentRefSchema.optional(),
  subrace: contentRefSchema.nullable().optional(),
  class: contentRefSchema.optional(),
  /**
   * `null` limpia la subclase elegida, igual que `subrace`. **El servicio la limpia también al
   * cambiar de clase**, en la misma escritura: una subclase que se queda de la clase anterior es
   * exactamente el dato caduco que `resolveBuild` tolera pero que aquí es barato no crear.
   */
  subclass: contentRefSchema.nullable().optional(),
  level: z.number().int().min(1).max(20).optional(),
  choices: characterChoicesSchema.optional(),
});
export type UpdateCharacterSheetInput = z.infer<typeof updateCharacterSheetSchema>;

/**
 * Un cambio **relativo** de PG: el caso normal de la mesa.
 *
 * En la mesa nadie dice «tengo 12»: dice «recibo 5». El servidor aplica el delta dentro de una
 * transacción, así que **dos jugadores aplicando −5 y −3 aterrizan los dos**. No hay conflicto
 * que resolver porque no hay nada que sobrescribir — y perder una curación porque dos personas
 * escribieron a la vez es el fallo que nadie reproduce y todo el mundo recuerda.
 */
export const changeHpSchema = z.object({
  delta: z.number().int().min(-9999).max(9999),
  /**
   * Si el golpe fue crítico. **Existe desde el principio a propósito, aunque hoy solo lo use una
   * regla:** recibir daño estando a 0 PG suma **un** fracaso de salvación de muerte, y **dos** si
   * el golpe fue crítico. Sin este campo, esa segunda mitad no se puede aplicar — y añadirlo
   * después es migrar el payload del evento que más veces se escribe en una sesión.
   */
  critical: z.boolean().optional(),
  /**
   * Tarea 2.5.1. **Opcional**: un delta positivo (curación) o un ajuste del DM no tienen tipo
   * de daño. Cuando viene con un delta negativo, la pieza C lo usa para reducir el daño por
   * resistencia o vulnerabilidad **antes** de aplicarlo, y queda escrito en el `HP_CHANGED`.
   */
  damageType: damageTypeSchema.optional(),
  /**
   * Tarea 2.5.4. **De qué tirada sale este daño.** *«¿De qué murió Elara?»* (hueco M15) no se
   * puede responder con solo el tipo: hace falta la tirada de verdad, no una afirmación del
   * cuerpo de la petición. **Opcional**: un ajuste manual del DM, o una curación, no cuelgan de
   * ninguna tirada.
   */
  rollEventId: z.string().min(1).optional(),
  reason: z.string().max(280).optional(),
});
export type ChangeHpInput = z.infer<typeof changeHpSchema>;

/**
 * Un cambio **absoluto**: la corrección del DM, y ahí sí hace falta un conflicto.
 *
 * Concurrencia optimista: si `version` ya no es la que se envió, **409** con el valor actual.
 * Es la única forma honesta — un DM corrigiendo a mano **quiere** pisar, pero quiere saber qué
 * pisa.
 */
export const setHpSchema = z.object({
  currentHp: z.number().int().min(0).max(9999).optional(),
  tempHp: z.number().int().min(0).max(9999).optional(),
  /**
   * **Cual de los dos monton de PG temporales se queda** (ficha C6-4, plan 14).
   *
   * SRD 5.1: *«Healing can't restore temporary hit points, and they can't be added together. If you
   * have temporary hit points and receive more of them, you decide whether to keep the ones you
   * have or to gain the new ones.»*
   *
   * **La regla NO es «gana el mayor»**, es «lo decides tu». El servidor se quedaba con el mayor por
   * su cuenta, que acierta casi siempre y **quita la decision que el SRD da al jugador**: hay
   * efectos que interesa cambiar por otros mas pequenos —porque duran mas, o porque el nuevo trae
   * algo aparte—, y con el maximo automatico eso era imposible.
   *
   * Sin este campo se conserva el comportamiento de siempre —el mayor—, para que ninguna pantalla
   * que ya llamaba cambie de significado sin pedirlo.
   */
  tempHpEleccion: z.enum(["mayor", "los-nuevos"]).optional(),
  expectedVersion: z.number().int().min(0),
  reason: z.string().max(280).optional(),
});
export type SetHpInput = z.infer<typeof setHpSchema>;

/**
 * Una tirada de salvación contra muerte.
 *
 * **Cuatro resultados y no dos**, porque el SRD los distingue: un 20 natural devuelve al
 * personaje a 1 PG y un 1 natural cuenta como **dos** fracasos. Tres éxitos estabilizan; tres
 * fracasos matan. El servidor tira: es una tirada como cualquier otra.
 */
export const deathSaveSchema = z.object({
  visibility: z.enum(["PUBLIC", "PLAYERS", "SPECIFIC_PLAYERS", "OWNER_DM", "DM_ONLY"]).optional(),
});
export type DeathSaveInput = z.infer<typeof deathSaveSchema>;

/** El estado de muerte de una hoja, para que la pantalla no lo deduzca. */
export const deathStateSchema = z.object({
  successes: z.number().int().min(0).max(3),
  failures: z.number().int().min(0).max(3),
  /** `alive` con PG > 0, `dying` a 0, `stable` con tres éxitos, `dead` con tres fracasos. */
  status: z.enum(["alive", "dying", "stable", "dead"]),
});
export type DeathState = z.infer<typeof deathStateSchema>;

// --- Anulaciones manuales del DM sobre valores derivados ---

/**
 * Las claves que se pueden anular a mano. **Cerrada a propósito**: una anulación es la válvula
 * de escape del catálogo, no una puerta abierta a inventar campos derivados. Si falta una,
 * añadirla es una decisión con su ficha.
 *
 * Son las que una mesa necesita corregir de verdad: la CA (un objeto mágico, una regla de la
 * casa), los PG máximos (un don, un PNJ que el DM decide), la iniciativa, la velocidad de
 * caminar y la percepción pasiva.
 */
export const OVERRIDABLE_KEYS = [
  "ac",
  "maxHp",
  "initiative",
  "speed.walk",
  "passivePerception",
] as const;
export const overridableKeySchema = z.enum(OVERRIDABLE_KEYS);
export type OverridableKey = z.infer<typeof overridableKeySchema>;

/**
 * **El rango de cada anulación, y de dónde sale cada número** (ficha P2 de
 * `docs/06-pendientes.md`, cerrada en 2C.2).
 *
 * Hasta 2C.2 había **un solo tope para las cinco**, de −999 a 999. Para unos Puntos de Golpe
 * máximos eso es razonable; para una Clase de Armadura, cuyo rango real de juego va de 5 a 30
 * largos, tres cifras y un signo son un margen absurdo — y una anulación de `-999` en la CA no es
 * una regla de la casa, es un dedo que resbaló.
 *
 * **El tope no sale del rango de la 5.ª edición, sale de «qué cifra ya no puede ser un error de
 * tecleo»**, y esa distinción es la ficha entera: la anulación es **la válvula de escape del
 * catálogo** —un objeto mágico raro, una regla de la casa, un PNJ que el DM decide y punto—, así
 * que apretarla al rango del manual la inutilizaría justo para lo que existe. Cada rango de abajo
 * deja el juego real muy holgado por dentro y corta lo que no puede ser intencionado.
 *
 * Los negativos se admiten **solo donde significan algo**: un modificador de iniciativa puede ser
 * negativo; unos PG máximos, una CA, una velocidad o una Percepción pasiva negativos no existen en
 * ninguna regla, y aceptarlos era dejar que el catálogo produjera un número imposible.
 */
export const RANGO_DE_ANULACION = {
  // La CA más alta del SRD ronda 25 (armadura natural de un dragón antiguo); un personaje con
  // placas y escudo llega a 21, y a 24 largos con objetos. Cincuenta deja el doble.
  ac: { min: 0, max: 50 },
  // El monstruo con más PG del SRD tiene 676. Dos mil deja sitio a un jefe casero y corta el
  // dedo resbalado de cuatro cifras.
  maxHp: { min: 1, max: 2000 },
  // Es un modificador, no una tirada: puede ser negativo (Destreza baja, armadura pesada).
  initiative: { min: -20, max: 50 },
  // En pies. Ninguna criatura del SRD camina a más de 60; **cero es válido** —agarrado,
  // paralizado, sujeto a una regla del DM—, así que el mínimo no puede ser 1.
  "speed.walk": { min: 0, max: 1000 },
  // 10 + modificador + competencia + rasgos: por encima de 30 ya no existe.
  passivePerception: { min: 0, max: 50 },
} as const satisfies Record<OverridableKey, { min: number; max: number }>;

/**
 * Fijar una anulación. **El motivo es opcional**, como en todo este dominio: obligar a
 * explicarse en mitad de una sesión molesta más de lo que documenta.
 *
 * **El rango de aquí es el bordillo, no el tope real.** El tope de verdad depende de QUÉ se
 * anula, y eso viaja en la URL (`PUT overrides/:target`), así que ningún esquema del cuerpo puede
 * expresarlo: lo comprueba el servicio con `RANGO_DE_ANULACION`, igual que comprueba «solo el
 * DM». Esto de aquí sigue existiendo porque es la puerta barata: corta lo que no es un entero
 * antes de tocar la base.
 */
export const setOverrideSchema = z.object({
  value: z.number().int().min(-2000).max(2000),
  reason: z.string().max(280).optional(),
});
export type SetOverrideInput = z.infer<typeof setOverrideSchema>;

/** El mapa guardado: clave derivada → número. */
export const overridesSchema = z.record(overridableKeySchema, z.number().int());
export type Overrides = z.infer<typeof overridesSchema>;
