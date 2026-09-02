import type {
  RuleCondition,
  RuleEffect,
  RuleMode,
  RuleStatus,
  RuleTraceStatus,
  RuleTrigger,
  Visibility,
} from "@dnd/shared";

// Tarea 2A.16 — tipos del núcleo, puro y sin base de datos.
//
// Todo lo que entra aquí es un dato inyectado por quien llama (el "mundo" y las reglas ya
// armadas); todo lo que sale es una decisión, nunca un efecto secundario. El servicio
// (`rules-engine.service.ts`) es quien lee de Postgres, arma este mundo, llama al núcleo, y
// traduce la decisión en escrituras reales — así el núcleo se prueba con sucesos de mentira,
// sin Docker ni Postgres.

/**
 * Una regla tal y como el núcleo la necesita: ya validada, ya cargada. El servicio la arma a
 * partir de la fila de `Rule` (con `trigger`/`conditions`/`effects` ya interpretados por Zod).
 */
export interface EngineRule {
  id: string;
  version: number;
  name: string;
  /** El DM que la armó — la autoridad con la que corre el efecto (regla de autoridad #2). */
  createdById: string;
  mode: RuleMode;
  status: RuleStatus;
  trigger: RuleTrigger;
  conditions: RuleCondition[];
  effects: RuleEffect[];
  maxFires: number | null;
}

/**
 * El "mundo" inyectado: todo lo que una condición puede necesitar consultar. Es una
 * fotografía, no una conexión — el núcleo nunca vuelve a preguntarle nada a la base de datos.
 * Todas las colecciones son inmutables desde fuera; el núcleo trabaja sobre copias.
 */
export interface WorldSnapshot {
  /** Interruptor general de campaña (contención, punto 6). Si es falso, el núcleo no dispara
   * nada y lo dice en el resultado — nunca se descarta en silencio. */
  rulesEnabled: boolean;
  /** Número de la sesión actual, o `null` si no hay sesión en curso. */
  sessionNumber: number | null;
  /** Si están todos los jugadores presentes en la sesión en curso. */
  allPlayersPresent: boolean;
  /** Marcas de campaña: clave → puesta/no puesta. */
  flags: Record<string, boolean>;
  /** Conjuntos con nombre: clave → miembros. */
  sets: Record<string, Array<{ memberType: string; memberId: string }>>;
  /** Etiquetas de cada ficha, por identificador — para `SUBJECT_HAS_TAG` y para contar
   * revelaciones por etiqueta. */
  entityTags: Record<string, string[]>;
  /** Qué fichas existen todavía — un efecto que apunta a una que no está aquí deja la regla
   * `BROKEN` en vez de aplicarse (regla de autoridad #6). */
  entityExists: Record<string, boolean>;
  /** Visibilidad actual de cada ficha conocida. La muta `REVEAL_ENTITY`/`HIDE_ENTITY`. */
  entityVisibility: Record<string, Visibility>;
  /** Fichas que ya se han revelado en algún momento — para `REVEALED_WITH_TAG_AT_LEAST`. */
  revealedEntityIds: string[];
  /** Notas de la sesión en curso — declarativo, no un registro incremental (§2.5). */
  sessionNotes: string[];
  /** Si cada regla está armada en este instante (arrancado por `Rule.status === "ARMED"`,
   * y mutable dentro de la misma ejecución por `SET_RULE_ARMED`). */
  ruleArmed: Record<string, boolean>;
  /** Cuántas veces se ha disparado cada regla hasta ahora (arrancado desde `Rule.fireCount`). */
  ruleFireCounts: Record<string, number>;
}

/**
 * Una condición ya evaluada, con el dato del mundo que se miró para decidir — no solo que se
 * cumplió, sino **con qué**. Es la mitad que le faltaba a la traza según el punto 5 de la
 * autoridad ("la condición evaluada, con sus datos"): sin `observed`, "se cumplió" no se puede
 * auditar seis meses después contra qué estaba pasando en el mundo en ese instante.
 */
export interface ConditionEvaluation {
  condition: RuleCondition;
  result: boolean;
  /** El valor del mundo que decidió el resultado — p. ej. el tamaño real del conjunto para
   * `SET_SIZE_AT_LEAST`, o si la marca estaba puesta para `FLAG_IS`. */
  observed: unknown;
}

/** Antes y después de un efecto concreto — sin esto no se puede deshacer nada. */
export interface EffectApplication {
  effect: RuleEffect;
  before: unknown;
  after: unknown;
  /** El suceso que este efecto produce para encadenar, si produce alguno (§2.1: solo
   * `REVEAL_ENTITY`, `SET_FLAG` y `RAISE_SIGNAL` encadenan). */
  chainEvent?: RuleTrigger;
}

/**
 * Por qué se cortó una rama de la cascada, o por qué dos reglas empataron. Reusa
 * `RuleTraceStatus` de `@dnd/shared` en vez de declarar su propio enum — dos copias del mismo
 * conjunto de valores es justo la deriva que este proyecto evita a propósito. El núcleo nunca
 * produce `"REJECTED"`: ese estado nace después, cuando el DM rechaza una propuesta.
 */
export type TraceStatus = Exclude<RuleTraceStatus, "REJECTED">;

/** Una entrada de traza que el núcleo produce. El servicio le pone el identificador y la
 * persiste — el núcleo no sabe nada de Postgres. */
export interface EngineTraceEntry {
  status: TraceStatus;
  depth: number;
  event: RuleTrigger;
  /** Ausente en un `STOPPED` que no llegó a evaluar ninguna regla (p. ej. interruptor apagado). */
  ruleId?: string;
  ruleVersion?: number;
  /** Qué condiciones se evaluaron para esta regla y con qué dato del mundo — punto 5 de la
   * autoridad. Ausente cuando no hubo regla que evaluar (interruptor apagado, tope de saltos). */
  conditions?: ConditionEvaluation[];
  effects?: EffectApplication[];
  reason?: string;
  /** Solo en `CONFLICT`: las reglas empatadas en especificidad. */
  conflictingRuleIds?: string[];
  /** Solo en `CONFLICT`: las condiciones de cada regla empatada, por si el servicio necesita
   * escribir una fila de traza por regla (punto 5 de la autoridad, también en el conflicto). */
  conflictingConditions?: Record<string, ConditionEvaluation[]>;
}

/** Una regla que quedó rota porque su objetivo ya no existe (regla de autoridad #6). Nunca se
 * descarta en silencio: el servicio la persiste como `Rule.status = "BROKEN"`. */
export interface BrokenRuleOutcome {
  ruleId: string;
  reason: string;
}

/** Lo que decide el núcleo entero para un suceso de entrada y su cascada. */
export interface EvaluationOutcome {
  traces: EngineTraceEntry[];
  brokenRules: BrokenRuleOutcome[];
  /** El mundo tal y como queda tras aplicar todo lo que se pudo aplicar en modo automático.
   * Las reglas en modo propuesta NO tocan el mundo — por eso el que llama nunca ve sus
   * efectos reflejados aquí, solo en `traces` con `status: "PROPOSED"`. */
  world: WorldSnapshot;
  /** Cuántas veces se disparó cada regla en esta ejecución, para que el servicio sepa cuánto
   * sumar a `Rule.fireCount`. */
  fireCountDeltas: Record<string, number>;
}
