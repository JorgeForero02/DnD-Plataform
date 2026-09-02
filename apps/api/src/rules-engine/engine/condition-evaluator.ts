import type { RuleCondition, RuleTrigger } from "@dnd/shared";
import type { ConditionEvaluation, WorldSnapshot } from "./types";

// Las ocho condiciones del vocabulario cerrado (§3 del diseño). Cada una solo *lee* el mundo
// inyectado — nunca lo muta, y nunca consulta nada por fuera de él.

/** El identificador de ficha que trae el suceso, si trae alguno. Varias condiciones ("la
 * ficha del suceso tiene la etiqueta X") hablan del sujeto del disparo, no de un objetivo fijo
 * de la regla. */
function subjectEntityId(event: RuleTrigger): string | undefined {
  return "entityId" in event ? event.entityId : undefined;
}

interface ConditionOutcome {
  result: boolean;
  /** El dato del mundo que decidió el resultado — punto 5 de la autoridad: la traza no solo
   * dice "se cumplió", dice **con qué**. */
  observed: unknown;
}

function computeCondition(
  condition: RuleCondition,
  event: RuleTrigger,
  world: WorldSnapshot,
  ruleId: string,
): ConditionOutcome {
  switch (condition.kind) {
    case "FLAG_IS": {
      const observed = world.flags[condition.key] ?? false;
      return { result: observed === condition.value, observed };
    }

    case "SET_SIZE_AT_LEAST": {
      const observed = world.sets[condition.setKey]?.length ?? 0;
      return { result: observed >= condition.count, observed };
    }

    case "IS_IN_SET": {
      const observed = (world.sets[condition.setKey] ?? []).some(
        (m) => m.memberType === condition.memberType && m.memberId === condition.memberId,
      );
      return { result: observed, observed };
    }

    case "ALL_PLAYERS_PRESENT":
      return { result: world.allPlayersPresent, observed: world.allPlayersPresent };

    case "SUBJECT_HAS_TAG": {
      const entityId = subjectEntityId(event);
      const tags = entityId ? (world.entityTags[entityId] ?? []) : [];
      return { result: entityId !== undefined && tags.includes(condition.tag), observed: tags };
    }

    case "REVEALED_WITH_TAG_AT_LEAST": {
      const matching = world.revealedEntityIds.filter((id) =>
        (world.entityTags[id] ?? []).includes(condition.tag),
      );
      return { result: matching.length >= condition.count, observed: matching };
    }

    case "SESSION_NUMBER_AT_LEAST": {
      const observed = world.sessionNumber;
      return { result: observed !== null && observed >= condition.count, observed };
    }

    case "NEVER_FIRED": {
      const observed = world.ruleFireCounts[ruleId] ?? 0;
      return { result: observed === 0, observed };
    }

    default:
      // Unión discriminada cerrada: si TypeScript deja pasar esto es que se añadió un tipo
      // de condición sin actualizar el motor, y es preferible reventar aquí a fallar en
      // silencio en producción.
      return ((): never => {
        throw new Error(`Condición sin evaluador: ${JSON.stringify(condition)}`);
      })();
  }
}

export function evaluateCondition(
  condition: RuleCondition,
  event: RuleTrigger,
  world: WorldSnapshot,
  ruleId: string,
): boolean {
  return computeCondition(condition, event, world, ruleId).result;
}

/** La misma evaluación, pero con el dato observado adjunto — lo que exige la traza (punto 5 de
 * la autoridad): no solo si la condición se cumplió, sino con qué del mundo se decidió. */
export function evaluateConditionDetailed(
  condition: RuleCondition,
  event: RuleTrigger,
  world: WorldSnapshot,
  ruleId: string,
): ConditionEvaluation {
  const { result, observed } = computeCondition(condition, event, world, ruleId);
  return { condition, result, observed };
}
