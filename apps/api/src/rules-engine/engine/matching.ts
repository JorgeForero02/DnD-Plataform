import type { RuleTrigger } from "@dnd/shared";

// Compara el "CUANDO" de una regla contra un suceso real. Ambos tienen la misma forma
// (`RuleTrigger`): un efecto que encadena produce exactamente el mismo tipo de dato que un
// suceso de entrada, y por eso el motor no necesita traducir nada entre los dos (§2.1).

/**
 * ¿Este suceso satisface este disparador? Compara primero el tipo (`kind`) y después los
 * campos que ese tipo concreto declara — un disparador sin `skill` en `ABILITY_ROLL` acepta
 * cualquier habilidad, por ejemplo.
 */
export function matchesTrigger(trigger: RuleTrigger, event: RuleTrigger): boolean {
  if (trigger.kind !== event.kind) return false;

  switch (trigger.kind) {
    case "SESSION_STARTED":
    case "SESSION_CLOSED":
    case "MEMBER_JOINED":
      return true;
    case "ENTITY_OPENED":
    case "ENTITY_COMMENTED":
    case "ENTITY_REVEALED":
    case "DM_EXECUTED":
    case "ENTITY_ATTACKED": {
      const ev = event as Extract<RuleTrigger, { entityId: string }>;
      return trigger.entityId === ev.entityId;
    }
    case "FLAG_SET":
    case "SIGNAL_RAISED": {
      const ev = event as Extract<RuleTrigger, { key: string }>;
      return trigger.key === ev.key;
    }
    case "ENTITY_LINKED": {
      const ev = event as Extract<RuleTrigger, { kind: "ENTITY_LINKED" }>;
      if (trigger.fromId !== ev.fromId || trigger.toId !== ev.toId) return false;
      // Sin etiqueta en el disparador, cualquier etiqueta del enlace vale.
      if (trigger.label === undefined) return true;
      return trigger.label === ev.label;
    }
    case "CHARACTER_ATTACKED": {
      const ev = event as Extract<RuleTrigger, { kind: "CHARACTER_ATTACKED" }>;
      return trigger.characterId === ev.characterId;
    }
    case "ABILITY_ROLL": {
      const ev = event as Extract<RuleTrigger, { kind: "ABILITY_ROLL" }>;
      if (trigger.outcome !== ev.outcome) return false;
      if (trigger.skill === undefined) return true;
      return trigger.skill === ev.skill;
    }
    default: {
      // **Un disparador nuevo sin `case` aquí NO coincide nunca, y antes lo hacía en silencio.**
      // Pasó con `CHARACTER_ATTACKED` (plan 09, I20): el vocabulario lo admitía, el editor lo
      // ofrecía, el motor lo recibía... y esta función devolvía `false` sin que nada avisara. El
      // `never` convierte ese olvido en un error de compilación, que es donde tiene que doler.
      const nunca: never = trigger;
      void nunca;
      return false;
    }
  }
}
