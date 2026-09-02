import { MAX_RULE_CHAIN_DEPTH, type RuleTrigger } from "@dnd/shared";
import { evaluateConditionDetailed } from "./condition-evaluator";
import { applyEffect, effectTargetEntityId } from "./effect-applier";
import { matchesTrigger } from "./matching";
import { resolveSpecificity } from "./specificity";
import type {
  ConditionEvaluation,
  EffectApplication,
  EngineRule,
  EngineTraceEntry,
  EvaluationOutcome,
  WorldSnapshot,
} from "./types";

// Tarea 2A.16 — el núcleo del motor de reglas. Puro: nada de Postgres, nada de reloj, nada de
// aleatoriedad. Dadas unas reglas ya armadas, un suceso de entrada y un mundo, decide qué
// reglas disparan, con qué efectos, y por qué se cortó lo que se cortó.
//
// El algoritmo es una cola de sucesos por procesar (BFS), no una recursión: el primer suceso
// es el salto 1, y cada efecto que encadena (§2.1) mete en la cola el suyo con `depth + 1`.
// Cuando la cola saca un suceso con `depth` por encima de `MAX_RULE_CHAIN_DEPTH`, esa rama se
// corta y queda escrito en la traza — nunca en silencio.

/**
 * Evalúa un suceso y toda la cascada que produzca contra el conjunto de reglas de una campaña.
 *
 * `rules` debe traer **todas** las reglas de la campaña, con independencia de su `status`: el
 * núcleo decide por sí mismo cuáles son candidatas (solo las `ARMED`, y solo si el mundo no las
 * ha desarmado a mitad de cascada con `SET_RULE_ARMED`).
 */
export function runEngine(
  rules: EngineRule[],
  initialEvent: RuleTrigger,
  world: WorldSnapshot,
): EvaluationOutcome {
  const traces: EngineTraceEntry[] = [];
  const brokenRules: EvaluationOutcome["brokenRules"] = [];
  const fireCountDeltas: Record<string, number> = {};
  let currentWorld = world;

  // Contención (punto 6 de la autoridad): el interruptor general de campaña. Se comprueba una
  // sola vez, al principio: si está apagado, nada se evalúa y queda dicho por qué.
  if (!currentWorld.rulesEnabled) {
    traces.push({
      status: "STOPPED",
      depth: 0,
      event: initialEvent,
      reason: "El interruptor de reglas de la campaña está apagado.",
    });
    return { traces, brokenRules, world: currentWorld, fireCountDeltas };
  }

  // Cada elemento de la cola recuerda qué regla produjo el suceso que lleva dentro (ausente
  // solo en el suceso inicial) — así, si la cascada se corta aquí, la traza puede seguir
  // apuntando a una regla real: `RuleTrace.ruleId` es una clave foránea obligatoria, y un corte
  // "de nadie" no tendría dónde aterrizar en Postgres.
  const queue: Array<{
    event: RuleTrigger;
    depth: number;
    producedByRuleId?: string;
    producedByRuleVersion?: number;
  }> = [{ event: initialEvent, depth: 1 }];

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    const { event, depth, producedByRuleId, producedByRuleVersion } = item;

    if (depth > MAX_RULE_CHAIN_DEPTH) {
      traces.push({
        status: "STOPPED",
        depth,
        event,
        ruleId: producedByRuleId,
        ruleVersion: producedByRuleVersion,
        reason: `Se alcanzó el tope de ${MAX_RULE_CHAIN_DEPTH} saltos de encadenamiento.`,
      });
      continue;
    }

    // Se guarda el detalle de cada condición evaluada (regla, resultado y el dato del mundo
    // que lo decidió) para que la traza pueda responder "con qué" y no solo "si" — punto 5 de
    // la autoridad. Se calcula una sola vez por regla candidata y se reutiliza abajo.
    const conditionResultsByRuleId = new Map<string, ConditionEvaluation[]>();
    const candidates = rules.filter((rule) => {
      if (rule.status !== "ARMED") return false;
      // `SET_RULE_ARMED` puede haber desarmado la regla a mitad de esta misma cascada.
      if (currentWorld.ruleArmed[rule.id] === false) return false;
      if (!matchesTrigger(rule.trigger, event)) return false;
      const fired = currentWorld.ruleFireCounts[rule.id] ?? 0;
      if (rule.maxFires !== null && fired >= rule.maxFires) return false;
      const results = rule.conditions.map((c) =>
        evaluateConditionDetailed(c, event, currentWorld, rule.id),
      );
      conditionResultsByRuleId.set(rule.id, results);
      return results.every((r) => r.result);
    });

    const { winner, conflicting } = resolveSpecificity(candidates);

    if (conflicting.length > 1) {
      // §2.6: el sistema no adivina. Ninguna de las empatadas se aplica.
      traces.push({
        status: "CONFLICT",
        depth,
        event,
        conflictingRuleIds: conflicting.map((r) => r.id),
        conflictingConditions: Object.fromEntries(
          conflicting.map((r) => [r.id, conditionResultsByRuleId.get(r.id) ?? []]),
        ),
        reason:
          `${conflicting.length} reglas empatan en especificidad ` +
          `(${conflicting[0].conditions.length} condiciones) para el mismo suceso.`,
      });
      continue;
    }

    if (!winner) continue; // ninguna regla matchea, o ninguna pasa sus condiciones: silencio legítimo

    const winnerConditions = conditionResultsByRuleId.get(winner.id) ?? [];

    // Regla de autoridad #6: si el objetivo de algún efecto ya no existe, la regla entera queda
    // BROKEN y no se aplica nada — todo o nada, y nunca en silencio.
    let missingEntityId: string | undefined;
    for (const effect of winner.effects) {
      const targetId = effectTargetEntityId(effect);
      if (targetId !== undefined && currentWorld.entityExists[targetId] === false) {
        missingEntityId = targetId;
        break;
      }
    }

    if (missingEntityId !== undefined) {
      brokenRules.push({
        ruleId: winner.id,
        reason: `El objetivo «${missingEntityId}» ya no existe.`,
      });
      traces.push({
        status: "STOPPED",
        depth,
        event,
        ruleId: winner.id,
        ruleVersion: winner.version,
        conditions: winnerConditions,
        reason: `Regla marcada BROKEN: el objetivo «${missingEntityId}» ya no existe.`,
      });
      continue;
    }

    // El disparo cuenta tanto en modo automático como en propuesta: el tope de disparos es
    // contención contra un jugador que repite el disparador, no solo contra la aplicación.
    fireCountDeltas[winner.id] = (fireCountDeltas[winner.id] ?? 0) + 1;
    currentWorld = {
      ...currentWorld,
      ruleFireCounts: {
        ...currentWorld.ruleFireCounts,
        [winner.id]: (currentWorld.ruleFireCounts[winner.id] ?? 0) + 1,
      },
    };

    if (winner.mode === "PROPOSAL") {
      // §2.8, la batuta marca, no toca: se calcula qué pasaría — con su antes y su después —
      // pero el mundo no se muta y la cascada no continúa. No ha ocurrido nada todavía.
      const applications = winner.effects.map(
        (effect) => applyEffect(effect, currentWorld).application,
      );
      traces.push({
        status: "PROPOSED",
        depth,
        event,
        ruleId: winner.id,
        ruleVersion: winner.version,
        conditions: winnerConditions,
        effects: applications,
      });
      continue;
    }

    const applications: EffectApplication[] = [];
    for (const effect of winner.effects) {
      const { world: nextWorld, application } = applyEffect(effect, currentWorld);
      currentWorld = nextWorld;
      applications.push(application);
      if (application.chainEvent) {
        queue.push({
          event: application.chainEvent,
          depth: depth + 1,
          producedByRuleId: winner.id,
          producedByRuleVersion: winner.version,
        });
      }
    }

    traces.push({
      status: "APPLIED",
      depth,
      event,
      ruleId: winner.id,
      ruleVersion: winner.version,
      conditions: winnerConditions,
      effects: applications,
    });
  }

  return { traces, brokenRules, world: currentWorld, fireCountDeltas };
}
