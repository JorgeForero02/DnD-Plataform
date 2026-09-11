import { z } from "zod";

// Tarea 2A.2 — la forma de la traza de derivación.
//
// **La traza es la funcionalidad, no un adorno.** Es lo que hace que un jugador deje de
// preguntar de dónde sale el número y pueda leerlo:
//
//     CA 18 = 14 cota de malla + 2 escudo + 2 Destreza
//
// Vive en `@dnd/shared` porque **la web la pinta** y la forma de los datos vive una sola vez
// (`docs/01-arquitectura.md`).

/**
 * Qué hace un paso al valor. **Existe porque no todo suma**, y esa es la trampa principal de
 * este cálculo: la cota de malla no es «14 más Destreza», **sustituye** la fórmula base y
 * **anula** la aportación de Destreza. Un modelo puramente aditivo daría 24 y sería un error
 * silencioso que nadie nota hasta que un personaje es inmortal.
 */
export const traceOpSchema = z.enum(["base", "add", "override", "cap"]);
export type TraceOp = z.infer<typeof traceOpSchema>;

/** De dónde viene un paso. Sirve para agrupar y para explicar, no para calcular. */
export const traceSourceTypeSchema = z.enum([
  "base",
  "ability",
  "race",
  "subrace",
  "class",
  "level",
  "item",
  "proficiency",
  "manual",
  /**
   * El statblock de un PNJ **dice** el valor y no lo deriva de nada: la CA de un monstruo es un
   * numero escrito en el libro, no una formula de armadura. Fase 2D.
   */
  "statblock",
  /** El valor de desafio, de donde sale el bonificador de competencia de un PNJ. Fase 2D. */
  "challenge",
  /**
   * **Un modificador temporal con caducidad** (plan 13, ficha M8): «+2 a Fuerza durante una hora».
   *
   * Tiene su propio tipo y no entra como `item` ni como `manual` porque **no es ninguno de los
   * dos**: no viene de un objeto equipado ni de una anulacion del DM, y la traza tiene que poder
   * decir «esto se va a ir». Su `sourceKey` es el id de la fila y su `labelKey` lleva el motivo.
   */
  "temporary",
]);
export type TraceSourceType = z.infer<typeof traceSourceTypeSchema>;

export const traceStepSchema = z.object({
  op: traceOpSchema,
  /** Con signo. En un `cap`, lo que se recortó (negativo o cero). */
  amount: z.number().int(),
  sourceType: traceSourceTypeSchema,
  /** Clave estable del origen: `"chain-mail"`, `"dex"`, `"dwarf-hill"`, `"barbarian"`. */
  sourceKey: z.string().min(1),
  /**
   * Clave estable del texto. **El motor nunca devuelve prosa en español**: es la norma del
   * proyecto (código en inglés, interfaz en español) y además permite que la misma traza sirva
   * a otra interfaz. El español sale del catálogo, en la capa de presentación.
   */
  labelKey: z.string().min(1),
  /**
   * Ticket J7 (2026-09-11) — **el motivo que el DM escribió al fijar una anulación.** Solo lo
   * lleva un paso `override` que venga de `modificadoresDeAnulacion` con `reason` guardado.
   *
   * **No es la excepción de "el motor nunca devuelve prosa en español" que dice el comentario
   * de `labelKey` — es otro campo.** `labelKey` sigue siendo una clave estable que traduce el
   * catálogo; `reason` es exactamente lo contrario: son las palabras del DM, tal cual las
   * escribió, y no hay clave que traducir porque no hay vocabulario cerrado que las contenga.
   */
  reason: z.string().max(280).optional(),
});
export type TraceStep = z.infer<typeof traceStepSchema>;

export const derivedValueSchema = z.object({
  /** `"ac"`, `"maxHp"`, `"save.dex"`, `"skill.stealth"`, `"attack.melee"`, `"spellSaveDc"`. */
  key: z.string().min(1),
  total: z.number().int(),
  steps: z.array(traceStepSchema),
});
export type DerivedValue = z.infer<typeof derivedValueSchema>;

/**
 * Un aviso no es un error: el cálculo salió, pero hay algo que la mesa querría saber.
 * Por ejemplo, la fórmula de CA que **no** se eligió: *«con armadura de cuero tendrías 13»*.
 * Es barato de producir y muy útil en la mesa.
 */
export const derivationWarningSchema = z.object({
  code: z.string().min(1),
  /** A qué valor derivado se refiere, si se refiere a alguno. */
  key: z.string().optional(),
  /** Datos para componer la frase en la web. Nunca la frase. */
  data: z.record(z.union([z.string(), z.number()])).optional(),
});
export type DerivationWarning = z.infer<typeof derivationWarningSchema>;

export const derivationResultSchema = z.object({
  /** Indexado por `key` para que la pantalla no tenga que buscar en un array. */
  derived: z.record(derivedValueSchema),
  warnings: z.array(derivationWarningSchema),
});
export type DerivationResult = z.infer<typeof derivationResultSchema>;

export const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;
export const abilityKeySchema = z.enum(ABILITY_KEYS);
export type AbilityKey = z.infer<typeof abilityKeySchema>;

/**
 * **Cuatro estados, no un booleano ni tres.** Es una de las decisiones de forma que se tomaron
 * el 2026-09-02 precisamente para no tener que migrar filas después:
 *
 * - `expertise` **duplica** el bonificador de competencia; un `boolean` no puede representarla,
 *   y por eso el enum nació con tres estados.
 * - `half` suma **la mitad, redondeando hacia abajo**. Se añadió el mismo día, al descubrir que
 *   el enum de tres se había quedado corto: **dos clases del SRD ya transcritas la usan** —
 *   «Aprendiz de todo» del bardo (nivel 2) y «Atleta excepcional» del campeón (nivel 7)—, así
 *   que la hoja las anunciaba y no las aplicaba.
 *
 * El orden importa y es `none < half < proficient < expertise`: cuando dos fuentes conceden la
 * misma habilidad, **gana la mejor y no se suman**.
 */
export const proficiencyLevelSchema = z.enum(["none", "half", "proficient", "expertise"]);
export type ProficiencyLevel = z.infer<typeof proficiencyLevelSchema>;

/** Las dieciocho del SRD 5.1, con la característica de la que cuelga cada una. */
export const SKILLS = {
  acrobatics: "dex",
  "animal-handling": "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  "sleight-of-hand": "dex",
  stealth: "dex",
  survival: "wis",
} as const satisfies Record<string, AbilityKey>;

export type SkillKey = keyof typeof SKILLS;
