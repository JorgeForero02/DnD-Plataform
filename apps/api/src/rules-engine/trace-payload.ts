import { elMotorDispara, ruleEffectSchema, ruleTriggerSchema, type RuleTrigger } from "@dnd/shared";
import { z } from "zod";
import type { ConditionEvaluation, EffectApplication } from "./engine";

// Tarea 2A.16 — la forma completa de lo que `RuleTrace.effects` guarda de verdad.
//
// El modelo `RuleTrace` (fuera de esta frontera de tarea) solo tiene una columna `Json` para
// esto, así que aquí se empaqueta **todo** lo que el punto 5 de la autoridad exige por disparo
// y que no cabía en columnas propias: qué condiciones se evaluaron y con qué dato del mundo
// (`conditions`), y si la escritura de cada efecto pasó por `canView` y qué contestó
// (`canView` dentro de cada efecto). Si esto se sube a `@dnd/shared`, esta es la forma
// propuesta — se documenta aquí a propósito para que el orquestador la revise.

/** Si la escritura de un efecto concreto pasó por `canView`, y qué contestó. Solo aplica a los
 * dos efectos que cambian una visibilidad (`REVEAL_ENTITY`, `HIDE_ENTITY`); el resto no toca la
 * matriz de visibilidad y lo dice explícitamente en vez de dejar el campo ambiguo. */
export interface CanViewAudit {
  applicable: boolean;
  checkedUserId?: string;
  role?: string | null;
  result?: boolean;
}

export interface PersistedEffectRecord extends EffectApplication {
  canView: CanViewAudit;
}

export interface TraceEffectsPayload {
  /** Qué condiciones se evaluaron para la regla que produjo esta traza, y con qué dato del
   * mundo — vacío en una `CONFLICT` sin condiciones o en un `STOPPED` sin regla concreta. */
  conditions: ConditionEvaluation[];
  effects: PersistedEffectRecord[];
}

const canViewAuditSchema = z.object({
  applicable: z.boolean(),
  checkedUserId: z.string().optional(),
  role: z.string().nullable().optional(),
  result: z.boolean().optional(),
});

const conditionEvaluationSchema = z.object({
  condition: z.unknown(),
  result: z.boolean(),
  observed: z.unknown(),
});

const persistedEffectSchema = z.object({
  effect: ruleEffectSchema,
  before: z.unknown(),
  after: z.unknown(),
  chainEvent: ruleTriggerSchema.optional(),
  canView: canViewAuditSchema.optional(),
});

const traceEffectsPayloadSchema = z.object({
  conditions: z.array(conditionEvaluationSchema).default([]),
  effects: z.array(persistedEffectSchema).default([]),
});

/** Interpreta `RuleTrace.effects` como el paquete completo. Tolerante con filas antiguas que
 * solo guardaran un array de efectos a secas (forma previa a este ajuste): si no matchea la
 * forma nueva, se intenta como un array plano y se envuelve. */
export function parseTraceEffectsPayload(value: unknown): TraceEffectsPayload {
  const asObject = traceEffectsPayloadSchema.safeParse(value);
  if (asObject.success) {
    return {
      conditions: asObject.data.conditions as ConditionEvaluation[],
      effects: asObject.data.effects.map((e) => ({
        effect: e.effect,
        before: e.before ?? null,
        after: e.after ?? null,
        chainEvent: e.chainEvent,
        canView: e.canView ?? { applicable: false },
      })),
    };
  }
  const asArray = z.array(persistedEffectSchema).safeParse(value);
  if (asArray.success) {
    return {
      conditions: [],
      effects: asArray.data.map((e) => ({
        effect: e.effect,
        before: e.before ?? null,
        after: e.after ?? null,
        chainEvent: e.chainEvent,
        canView: e.canView ?? { applicable: false },
      })),
    };
  }
  return { conditions: [], effects: [] };
}

/** Reduce el paquete persistido a lo que el núcleo necesita para aplicar de verdad (al resolver
 * una propuesta): el `canView` es un dato de auditoría, no algo que el núcleo entienda. */
export function toEffectApplications(payload: TraceEffectsPayload): EffectApplication[] {
  return payload.effects.map((e) => ({
    effect: e.effect,
    before: e.before,
    after: e.after,
    chainEvent: e.chainEvent,
  }));
}

/** Los cuatro disparadores del vocabulario cerrado que ningún servicio de hoy puede producir:
 * no tienen valor correspondiente en el enum `GameEventType` de Prisma (fuera de esta frontera
 * de tarea). La regla se deja crear y quedar utilizable — el vocabulario es cerrado, no a medio
 * armar — pero **no se finge** que va a dispararse: se avisa en cada lectura. */
/**
 * **La lista vive en `@dnd/shared`, no aqui.** Hasta la Ola 3 estaba escrita dos veces —aqui como
 * `UNREACHABLE_TRIGGER_KINDS` y en la web como `DISPARADORES_SIN_MOTOR`—, y dos listas que tienen
 * que coincidir divergen en cuanto una se toca sin la otra. Es la ficha C6-1 y esto la cierra.
 */
export function isTriggerReachableToday(kind: RuleTrigger["kind"]): boolean {
  return elMotorDispara(kind);
}
