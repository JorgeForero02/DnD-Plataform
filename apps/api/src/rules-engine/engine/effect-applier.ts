import type { RuleEffect, RuleTrigger } from "@dnd/shared";
import type { EffectApplication, WorldSnapshot } from "./types";

// Los nueve efectos del vocabulario cerrado (§3). Cada uno es **declarativo** (§2.5): dice en
// qué queda algo, nunca cuánto cambia — por eso aplicar el mismo efecto dos veces sobre el
// mismo mundo dado dos veces produce exactamente el mismo `after`. Esa es la prueba de
// idempotencia del núcleo.
//
// Solo tres efectos producen un suceso para encadenar (§2.1): `REVEAL_ENTITY` → `ENTITY_REVEALED`,
// `SET_FLAG` → `FLAG_SET`, `RAISE_SIGNAL` → `SIGNAL_RAISED`. Los demás son terminales: cambian
// el mundo (o piden un envío externo, como `NOTIFY`) pero no reabren la cascada.

/** El identificador de ficha al que apunta un efecto, si apunta a alguna — para que el motor
 * pueda comprobar antes de aplicar que el objetivo sigue existiendo (regla de autoridad #6). */
export function effectTargetEntityId(effect: RuleEffect): string | undefined {
  if (effect.kind === "REVEAL_ENTITY" || effect.kind === "HIDE_ENTITY") return effect.entityId;
  return undefined;
}

/** Copia superficial de las colecciones del mundo que un efecto puede tocar — nunca se muta el
 * mundo que entra, siempre se devuelve uno nuevo. */
function cloneWorld(world: WorldSnapshot): WorldSnapshot {
  return {
    ...world,
    flags: { ...world.flags },
    sets: Object.fromEntries(Object.entries(world.sets).map(([k, v]) => [k, [...v]])),
    entityTags: { ...world.entityTags },
    entityExists: { ...world.entityExists },
    entityVisibility: { ...world.entityVisibility },
    revealedEntityIds: [...world.revealedEntityIds],
    sessionNotes: [...world.sessionNotes],
    ruleArmed: { ...world.ruleArmed },
    ruleFireCounts: { ...world.ruleFireCounts },
  };
}

export function applyEffect(
  effect: RuleEffect,
  world: WorldSnapshot,
): { world: WorldSnapshot; application: EffectApplication } {
  const next = cloneWorld(world);

  switch (effect.kind) {
    case "REVEAL_ENTITY": {
      const before = world.entityVisibility[effect.entityId] ?? null;
      next.entityVisibility[effect.entityId] = effect.visibility;
      if (!next.revealedEntityIds.includes(effect.entityId)) {
        next.revealedEntityIds.push(effect.entityId);
      }
      const chainEvent: RuleTrigger = { kind: "ENTITY_REVEALED", entityId: effect.entityId };
      return {
        world: next,
        application: { effect, before, after: effect.visibility, chainEvent },
      };
    }

    case "HIDE_ENTITY": {
      const before = world.entityVisibility[effect.entityId] ?? null;
      next.entityVisibility[effect.entityId] = effect.visibility;
      // No encadena: "ocultar" no está en la lista de efectos que producen suceso (§2.1).
      return { world: next, application: { effect, before, after: effect.visibility } };
    }

    case "SET_FLAG": {
      const before = world.flags[effect.key] ?? false;
      next.flags[effect.key] = effect.value;
      const chainEvent: RuleTrigger = { kind: "FLAG_SET", key: effect.key };
      return { world: next, application: { effect, before, after: effect.value, chainEvent } };
    }

    case "CHANGE_SET_MEMBER": {
      const current = world.sets[effect.setKey] ?? [];
      const before = [...current];
      const exists = current.some(
        (m) => m.memberType === effect.memberType && m.memberId === effect.memberId,
      );
      let after = current;
      if (effect.action === "ADD" && !exists) {
        after = [...current, { memberType: effect.memberType, memberId: effect.memberId }];
      } else if (effect.action === "REMOVE" && exists) {
        after = current.filter(
          (m) => !(m.memberType === effect.memberType && m.memberId === effect.memberId),
        );
      }
      next.sets[effect.setKey] = after;
      return { world: next, application: { effect, before, after } };
    }

    case "RAISE_SIGNAL": {
      // La señal no guarda estado propio en el mundo — es un anuncio, no una marca. El radio y
      // el origen se guardan y se enseñan (§8), pero no alcanzan a nadie hasta que haya mapa.
      const chainEvent: RuleTrigger = { kind: "SIGNAL_RAISED", key: effect.key };
      return {
        world: next,
        application: { effect, before: null, after: { key: effect.key }, chainEvent },
      };
    }

    case "NOTIFY": {
      // Puramente informativo: el envío real lo hace el servicio (`NotificationsService`).
      // No hay estado del mundo que cambie, así que el par antes/después es el propio mensaje.
      return {
        world: next,
        application: {
          effect,
          before: null,
          after: { audience: effect.audience, message: effect.message },
        },
      };
    }

    case "ADD_SESSION_NOTE": {
      // Declarativo también aquí (§2.5): "la nota está presente", no "se añade una más". Así
      // una cascada que pasa dos veces por el mismo efecto no duplica la anotación.
      const before = [...world.sessionNotes];
      if (!next.sessionNotes.includes(effect.note)) next.sessionNotes.push(effect.note);
      return { world: next, application: { effect, before, after: [...next.sessionNotes] } };
    }

    case "SET_RULE_ARMED": {
      const before = world.ruleArmed[effect.ruleId] ?? true;
      next.ruleArmed[effect.ruleId] = effect.armed;
      return { world: next, application: { effect, before, after: effect.armed } };
    }

    default:
      return ((): never => {
        throw new Error(`Efecto sin aplicador: ${JSON.stringify(effect)}`);
      })();
  }
}
