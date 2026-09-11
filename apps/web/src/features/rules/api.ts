import type {
  CreateRuleInput,
  ListTracesQuery,
  ResolveProposalInput,
  RuleCondition,
  RuleEffect,
  RuleMode,
  RuleStatus,
  RuleTraceStatus,
  RuleTrigger,
  UpdateRuleInput,
} from "@dnd/shared";
import { apiFetch } from "../../lib/api";

// Tarea 2A.17 — el cliente HTTP de la pantalla de reglas. `apiFetch` es el único que habla HTTP
// (docs/04-convenciones.md), y este fichero es la única puerta de esta feature hacia los
// endpoints que construyó 2A.16 (`apps/api/src/rules-engine/rules-engine.controller.ts`).
//
// **La API no se toca.** Los tipos de abajo son la forma del JSON tal y como lo devuelve ese
// controlador, calcada a mano — igual que `features/character-sheet/api.ts` hace con la hoja —
// porque `EngineTraceEntry`, `EffectApplication` y `TraceEffectsPayload` viven en
// `apps/api/src/rules-engine/**` y la web no puede (ni debe) importar de `apps/api`.

/** Una fila de `Rule` tal y como la devuelve el controlador, con `triggerReachableToday`. */
export interface RuleRow {
  id: string;
  campaignId: string;
  name: string;
  createdById: string;
  mode: RuleMode;
  status: RuleStatus;
  version: number;
  trigger: RuleTrigger;
  conditions: RuleCondition[];
  effects: RuleEffect[];
  maxFires: number | null;
  fireCount: number;
  lastFiredAt: string | null;
  brokenReason: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * Lo calcula el servidor (`isTriggerReachableToday`, `trace-payload.ts`): cuatro disparadores
   * del vocabulario cerrado no tienen todavía quién los emita. **La pantalla no lo recalcula**
   * — reimplementar esa lista aquí sería copiar una regla del servidor al navegador.
   */
  triggerReachableToday: boolean;
}

/** Antes y después de un efecto concreto, tal y como lo guarda la traza. */
export interface AplicacionDeEfecto {
  effect: RuleEffect;
  before?: unknown;
  after?: unknown;
  chainEvent?: RuleTrigger;
  canView?: { applicable: boolean; checkedUserId?: string; role?: string | null; result?: boolean };
}

export interface EvaluacionDeCondicion {
  condition: RuleCondition;
  result: boolean;
  observed?: unknown;
}

/** Lo que `RuleTrace.effects` guarda: el paquete completo de 2A.16 (`TraceEffectsPayload`). */
export interface PaqueteDeTraza {
  conditions: EvaluacionDeCondicion[];
  effects: AplicacionDeEfecto[];
}

export interface RuleTraceRow {
  id: string;
  campaignId: string;
  ruleId: string;
  ruleVersion: number;
  triggeredByUserId: string;
  delegatedByUserId: string;
  depth: number;
  chainId: string;
  status: RuleTraceStatus;
  /** `Json` en Postgres: llega sin forma garantizada. Se interpreta con `leerPaquete`. */
  effects: unknown;
  reason: string | null;
  createdAt: string;
}

export interface PaginaDeTrazas {
  traces: RuleTraceRow[];
  nextCursor: string | null;
}

/**
 * Interpreta el `Json` de `RuleTrace.effects` de forma defensiva. Tolera la forma antigua (un
 * array plano de efectos), igual que hace `parseTraceEffectsPayload` en el servidor. **No
 * decide nada**: solo lee la estructura para poder pintarla.
 */
export function leerPaquete(effects: unknown): PaqueteDeTraza {
  if (Array.isArray(effects)) {
    return { conditions: [], effects: effects as AplicacionDeEfecto[] };
  }
  if (effects && typeof effects === "object") {
    const objeto = effects as Partial<PaqueteDeTraza>;
    return {
      conditions: Array.isArray(objeto.conditions) ? objeto.conditions : [],
      effects: Array.isArray(objeto.effects) ? objeto.effects : [],
    };
  }
  return { conditions: [], effects: [] };
}

/** Una entrada de traza que el ensayo en seco devuelve — el mismo `EngineTraceEntry` del núcleo. */
export interface EntradaDeEnsayo {
  // El ensayo NO usa los mismos estados que una traza real: `APPLIED`/`PROPOSED` se reescriben a
  // `WOULD_APPLY`/`WOULD_PROPOSE` en el servidor, porque en una simulación nada se aplicó. Por eso
  // es `string` y no `RuleTraceStatus`.
  status: string;
  depth: number;
  event: RuleTrigger;
  ruleId?: string;
  ruleVersion?: number;
  conditions?: EvaluacionDeCondicion[];
  effects?: AplicacionDeEfecto[];
  reason?: string;
  conflictingRuleIds?: string[];
}

/** La respuesta de `POST :ruleId/dry-run`: la decisión, sin ninguna escritura. */
export interface ResultadoDeEnsayo {
  /** Siempre `true`: lo devuelve `dry-run` para que nadie confunda su respuesta con una real. */
  simulated?: boolean;
  traces: EntradaDeEnsayo[];
  brokenRules: { ruleId: string; reason: string }[];
  fireCountDeltas: Record<string, number>;
  triggerReachableToday: boolean;
}

const raiz = (campaignId: string) => `/campaigns/${campaignId}/rules`;

export function fetchRules(campaignId: string): Promise<RuleRow[]> {
  return apiFetch<RuleRow[]>(raiz(campaignId));
}

export function createRule(campaignId: string, input: CreateRuleInput): Promise<RuleRow> {
  return apiFetch<RuleRow>(raiz(campaignId), { method: "POST", body: JSON.stringify(input) });
}

export function updateRule(
  campaignId: string,
  ruleId: string,
  input: UpdateRuleInput,
): Promise<RuleRow> {
  return apiFetch<RuleRow>(`${raiz(campaignId)}/${ruleId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteRule(campaignId: string, ruleId: string): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(`${raiz(campaignId)}/${ruleId}`, {
    method: "DELETE",
    // `apiFetch` siempre manda `Content-Type: application/json`, y Fastify rechaza esa cabecera
    // con un cuerpo de verdad vacío (mismo comentario en `features/entities/api.ts`).
    body: JSON.stringify({}),
  });
}

/** El ensayo en seco. **No escribe nada**: ni traza, ni disparo, ni efecto real. */
export function dryRunRule(
  campaignId: string,
  ruleId: string,
  trigger: RuleTrigger,
): Promise<ResultadoDeEnsayo> {
  return apiFetch<ResultadoDeEnsayo>(`${raiz(campaignId)}/${ruleId}/dry-run`, {
    method: "POST",
    body: JSON.stringify({ trigger }),
  });
}

/**
 * Una propuesta es una traza `PROPOSED` **con el nombre de su regla dentro** (ficha N4). Lo pone el
 * servidor con un `include`; la pantalla no lo cruza contra la lista de reglas — el «regla borrada»
 * que hacía de respaldo no podía darse, porque la traza se borra con su regla.
 */
export type PropuestaRow = RuleTraceRow & { ruleName: string };

export function fetchProposals(campaignId: string): Promise<PropuestaRow[]> {
  return apiFetch<PropuestaRow[]>(`${raiz(campaignId)}/proposals`);
}

export function resolveProposal(
  campaignId: string,
  traceId: string,
  input: ResolveProposalInput,
): Promise<RuleTraceRow> {
  return apiFetch<RuleTraceRow>(`${raiz(campaignId)}/traces/${traceId}/resolve`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchTraces(
  campaignId: string,
  opciones: Partial<ListTracesQuery> = {},
): Promise<PaginaDeTrazas> {
  const params = new URLSearchParams();
  if (opciones.limit !== undefined) params.set("limit", String(opciones.limit));
  if (opciones.cursor) params.set("cursor", opciones.cursor);
  const cadena = params.toString();
  return apiFetch<PaginaDeTrazas>(`${raiz(campaignId)}/traces${cadena ? `?${cadena}` : ""}`);
}
