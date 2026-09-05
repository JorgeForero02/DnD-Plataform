import type { GameEventPayload, RuleTrigger } from "@dnd/shared";

// El puente entre el log de la partida y el vocabulario del motor.
//
// **Por qué es una función pura y con su prueba, y no dos líneas dentro del oyente.** Traducir un
// suceso a un disparador tiene una regla que se hace mal por defecto —la de abajo, la de las
// tiradas— y meterla en un `@OnEvent` la deja sin poder probarse sin base de datos.

export interface SucesoRegistrado {
  type: GameEventPayload["type"];
  subjectType: string;
  subjectId: string;
  payload: GameEventPayload;
}

/**
 * Los disparadores que produce un suceso del log. **Devuelve una lista, no uno solo**, y ese es
 * el punto entero de esta función.
 *
 * Una tirada puede ser **dos cosas a la vez**: un 20 natural que no llega a la CD es un
 * `NATURAL_TWENTY` **y** un `FAILURE`. El diseño lo dice desde el principio —«los cuatro
 * resultados, no solo el éxito»— y guardarlos como dos hechos distintos en el evento no sirve de
 * nada si al traducirlo se elige uno. Una regla armada sobre el 20 natural y otra sobre el fallo
 * **tienen que dispararse las dos**.
 *
 * Un suceso que el vocabulario no cubre devuelve lista vacía: no es un error, es que ese hecho
 * todavía no le interesa a ninguna regla.
 */
export function triggersDe(suceso: SucesoRegistrado): RuleTrigger[] {
  const p = suceso.payload;
  switch (p.type) {
    case "SESSION_STARTED":
      return [{ kind: "SESSION_STARTED" }];
    case "SESSION_CLOSED":
      return [{ kind: "SESSION_CLOSED" }];
    case "ENTITY_OPENED":
      return [{ kind: "ENTITY_OPENED", entityId: suceso.subjectId }];
    case "ENTITY_REVEALED":
      return [{ kind: "ENTITY_REVEALED", entityId: suceso.subjectId }];
    // Ola 3: los dos que el editor ofrecia y el motor no podia cumplir, porque no existian como
    // suceso. Ahora los escribe su gesto — comentar una ficha, y entrar por una invitacion.
    case "ENTITY_COMMENTED":
      return [{ kind: "ENTITY_COMMENTED", entityId: p.entityId }];
    // I19 — **la batuta.** `entityId` sale del payload y no del sujeto: el sujeto es la campana,
    // porque ejecutar es un gesto de direccion y no un cambio en la ficha. Mismo patron que
    // `ENTITY_COMMENTED`.
    case "DM_EXECUTED":
      return [{ kind: "DM_EXECUTED", entityId: p.entityId }];
    // I20 — **«cuando ataquen a este personaje»**, que es lo que `ENTITY_ATTACKED` prometia y no
    // podia cumplir: se atacan criaturas, no fichas del mundo. **No hace falta suceso nuevo**:
    // `ATTACK_RESOLVED` se escribe desde 2.5.3 y su SUJETO es el objetivo, asi que la clave sale
    // de `subjectId` — como en `ENTITY_OPENED`, y no del payload, donde solo esta el atacante.
    case "ATTACK_RESOLVED":
      return [{ kind: "CHARACTER_ATTACKED", characterId: suceso.subjectId }];
    case "MEMBER_JOINED":
      return [{ kind: "MEMBER_JOINED" }];
    case "ENTITY_LINKED":
      return [
        {
          kind: "ENTITY_LINKED",
          fromId: p.fromId,
          toId: p.toId,
          ...(p.label ? { label: p.label } : {}),
        },
      ];
    case "FLAG_SET":
      return [{ kind: "FLAG_SET", key: p.key }];
    case "SIGNAL_RAISED":
      return [{ kind: "SIGNAL_RAISED", key: p.key }];
    case "ABILITY_ROLL": {
      const disparadores: RuleTrigger[] = [];
      const skill = p.reason ? { skill: p.reason } : {};
      // Primero lo natural, si lo hubo: es lo que la mesa canta antes que el resultado.
      if (p.natural === "TWENTY")
        disparadores.push({ kind: "ABILITY_ROLL", ...skill, outcome: "NATURAL_TWENTY" });
      if (p.natural === "ONE")
        disparadores.push({ kind: "ABILITY_ROLL", ...skill, outcome: "NATURAL_ONE" });
      // Y el resultado contra la CD, que es un hecho **distinto** y puede coexistir con el
      // anterior. Sin CD no hay ni éxito ni fallo que disparar.
      if (p.outcome === "SUCCESS")
        disparadores.push({ kind: "ABILITY_ROLL", ...skill, outcome: "SUCCESS" });
      if (p.outcome === "FAILURE")
        disparadores.push({ kind: "ABILITY_ROLL", ...skill, outcome: "FAILURE" });
      return disparadores;
    }
    default:
      // `HP_CHANGED`, `REST_DECLARED`, `DEATH_SAVE`, `CONDITION_*`, `SET_CHANGED`… El motor no
      // los escucha todavía, y decirlo con una lista vacía es más honesto que inventarles un
      // disparador que el vocabulario cerrado no tiene.
      return [];
  }
}
