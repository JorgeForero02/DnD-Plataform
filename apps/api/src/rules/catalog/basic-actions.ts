import type { Actividad } from "@dnd/shared";

// Tarea 1 del plan 3A.3 (T21) — las ocho acciones básicas del combate del SRD 5.1, que hoy no
// tenían ninguna representación en el catálogo: no son un conjuro ni un rasgo de clase, así que
// ni `SRD_SPELL_POR_KEY` ni `SRD_CLASSES` traían nada por su clave. `GET …/actions` las enseña
// SIEMPRE (D-CF-49) y `ActivitiesModule` las resuelve por su clave `basic:<key>` para que
// `usar()` escriba el mismo `ACTIVITY_USED kind: "FEATURE"` que cualquier otra aptitud — Ayudar es
// la única excepción: tiene su propia puerta (`AyudarA`, `POST …/help`) porque afecta a otro
// personaje, y esta lista la enseña pero `usar()` la rechaza a propósito (ver `activities.module.ts`).
//
// **Coste ACTION para las ocho, Ayudar incluida (D-N-2).** El SRD 5.1 no declara ninguna de las
// ocho como acción adicional: Ayudar consume la acción de quien ayuda igual que Esquivar consume
// la de quien esquiva — lo que cambia es A QUIÉN beneficia, no lo que cuesta.
//
// Cada cita es literal del SRD 5.1, *Actions in Combat* (documento oficial, CC BY 4.0:
// <https://media.wizards.com/2023/downloads/dnd/SRD_CC_v5.1.pdf>, «Actions in Combat», p. 92-93;
// ola post-revisión de 3A.3 — el enlace anterior apuntaba a las *free rules* de 2024, que no son
// la fuente declarada del proyecto aunque el texto citado sí fuera el de 5.1).

export const BASIC_ACTION_KEYS = [
  "dodge",
  "help",
  "hide",
  "disengage",
  "dash",
  "ready",
  "search",
  "use-object",
] as const;
export type BasicActionKey = (typeof BASIC_ACTION_KEYS)[number];

/** Una acción básica del SRD, tal como la enseña `GET …/actions`: solo nombre y prosa — sin
 * mecánica automatizada (son la mesa arbitrando, no un número que el motor calcule). */
interface BasicAction {
  name: string;
  actividad: Actividad;
}

function utilidad(description: string): Actividad {
  return {
    tipo: "utilidad",
    activation: { coste: "ACTION" },
    consumption: [],
    effects: [],
    duration: { unidad: "instantanea", concentracion: false },
    description,
  };
}

export const BASIC_ACTIONS: Record<BasicActionKey, BasicAction> = {
  dodge: {
    name: "Esquivar",
    actividad: utilidad(
      'SRD 5.1, Dodge: "Until the start of your next turn, any attack roll made against you has ' +
        "disadvantage if you can see the attacker, and you make Dexterity saving throws with " +
        "advantage. You lose this benefit if you're incapacitated or if your speed drops to 0.\"",
    ),
  },
  help: {
    name: "Ayudar",
    actividad: utilidad(
      'SRD 5.1, Help: "When you take the Help action, you can lend your aid to another creature ' +
        "in the completion of a task [...] Alternatively, you can aid a friendly creature in " +
        "attacking a creature within 5 feet of you [...] the first attack roll is made with " +
        'advantage." Va por su propia puerta (`POST …/help`): afecta a otro personaje.',
    ),
  },
  hide: {
    name: "Esconderse",
    actividad: utilidad(
      'SRD 5.1, Hide: "When you take the Hide action, you make a Dexterity (Stealth) check in ' +
        'an attempt to hide [...] While hidden, you benefit from not being seen."',
    ),
  },
  disengage: {
    name: "Destrabarse",
    actividad: utilidad(
      "SRD 5.1, Disengage: \"If you take the Disengage action, your movement doesn't provoke " +
        'opportunity attacks for the rest of the turn."',
    ),
  },
  dash: {
    name: "Correr",
    actividad: utilidad(
      'SRD 5.1, Dash: "When you take this action, you gain extra movement for the current turn. ' +
        "The increase equals your speed, after applying any modifiers. With a speed of 30 feet, " +
        'for example, you can move up to 60 feet on your turn if you take this action."',
    ),
  },
  ready: {
    name: "Preparar",
    actividad: utilidad(
      'SRD 5.1, Ready: "you take an action now and then take a reaction later, before the start ' +
        "of your next turn, in response to a trigger that you define [...] You can ready a spell " +
        "by casting it [...] then waiting to release the spell's magic until you use your reaction.\"",
    ),
  },
  search: {
    name: "Buscar",
    actividad: utilidad(
      'SRD 5.1, Search: "When you take the Search action, you devote your attention to finding ' +
        "something. Depending on the nature of your search, the DM might have you make a Wisdom " +
        '(Perception) check or an Intelligence (Investigation) check."',
    ),
  },
  "use-object": {
    name: "Usar un objeto",
    actividad: utilidad(
      'SRD 5.1, Use an Object: "when you want to interact with more than one object on your ' +
        "turn, you use this action [...] this action is also useful when you want to interact " +
        'with an object that requires your action for its use."',
    ),
  },
};

/** El nombre visible de una clave `basic:<key>`, o `undefined` si no es una de las ocho. */
export function nombreDeBasica(key: string): string | undefined {
  const clave = key.startsWith("basic:") ? key.slice("basic:".length) : key;
  return (BASIC_ACTIONS as Record<string, BasicAction | undefined>)[clave]?.name;
}
