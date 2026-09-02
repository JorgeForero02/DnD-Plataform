import type { RuleCondition, RuleEffect, RuleMode, RuleTrigger } from "@dnd/shared";
import type { RuleRow } from "./api";

// Tarea 2A.17 — los valores de partida de cada pieza de la frase.
//
// Es la parte del formulario que no tiene nada de visual y sí mucho de equivocable: cada
// variante del vocabulario cerrado tiene sus propios campos, y elegir otra clase de suceso no
// puede dejar los campos de la anterior colgando (un `key` sobrante en un `SESSION_STARTED`
// hace que el esquema del servidor lo rechace entero). Cambiar de clase **reconstruye** el
// objeto desde cero en vez de fusionarlo.
//
// Un `entityId` vacío no es un valor válido — `ruleTriggerSchema` exige un cuid — y eso es
// deliberado: el formulario arranca incompleto y `createRuleSchema` lo bloquea hasta que el DM
// elija una ficha de verdad. Nada de inventar un identificador por defecto.

export function disparadorPorDefecto(kind: RuleTrigger["kind"]): RuleTrigger {
  switch (kind) {
    case "SESSION_STARTED":
    case "SESSION_CLOSED":
    case "MEMBER_JOINED":
      return { kind };
    case "ENTITY_OPENED":
    case "ENTITY_COMMENTED":
    case "ENTITY_REVEALED":
    case "DM_EXECUTED":
    case "ENTITY_ATTACKED":
      return { kind, entityId: "" };
    case "FLAG_SET":
    case "SIGNAL_RAISED":
      return { kind, key: "" };
    case "ENTITY_LINKED":
      return { kind, fromId: "", toId: "" };
    case "ABILITY_ROLL":
      return { kind, outcome: "SUCCESS" };
  }
}

export function condicionPorDefecto(kind: RuleCondition["kind"]): RuleCondition {
  switch (kind) {
    case "FLAG_IS":
      return { kind, key: "", value: true };
    case "SET_SIZE_AT_LEAST":
      return { kind, setKey: "", count: 1 };
    case "IS_IN_SET":
      return { kind, setKey: "", memberType: "user", memberId: "" };
    case "ALL_PLAYERS_PRESENT":
    case "NEVER_FIRED":
      return { kind };
    case "SUBJECT_HAS_TAG":
      return { kind, tag: "" };
    case "REVEALED_WITH_TAG_AT_LEAST":
      return { kind, tag: "", count: 1 };
    case "SESSION_NUMBER_AT_LEAST":
      return { kind, count: 1 };
  }
}

export function efectoPorDefecto(kind: RuleEffect["kind"]): RuleEffect {
  switch (kind) {
    case "REVEAL_ENTITY":
      return { kind, entityId: "", visibility: "PLAYERS" };
    case "HIDE_ENTITY":
      return { kind, entityId: "", visibility: "DM_ONLY" };
    case "SET_FLAG":
      return { kind, key: "", value: true };
    case "CHANGE_SET_MEMBER":
      return { kind, setKey: "", action: "ADD", memberType: "user", memberId: "" };
    case "RAISE_SIGNAL":
      return { kind, key: "" };
    case "NOTIFY":
      return { kind, audience: "PLAYERS", message: "" };
    case "ADD_SESSION_NOTE":
      return { kind, note: "" };
    case "SET_RULE_ARMED":
      return { kind, ruleId: "", armed: true };
  }
}

/** Los cinco niveles de visibilidad, en el orden del esquema compartido. */
export const NIVELES_DE_VISIBILIDAD = [
  "PUBLIC",
  "PLAYERS",
  "SPECIFIC_PLAYERS",
  "OWNER_DM",
  "DM_ONLY",
] as const;

/** Los cuatro resultados de tirada que admite `ABILITY_ROLL`. */
export const RESULTADOS_DE_TIRADA = [
  "FAILURE",
  "SUCCESS",
  "NATURAL_ONE",
  "NATURAL_TWENTY",
] as const;

/** Los tres tipos de miembro de un conjunto. */
export const TIPOS_DE_MIEMBRO = ["user", "character", "entity"] as const;

/** El borrador que edita `EditorDeRegla`: una regla a medio escribir, todavía sin validar. */
export interface BorradorDeRegla {
  name: string;
  trigger: RuleTrigger;
  conditions: RuleCondition[];
  effects: RuleEffect[];
  mode: RuleMode;
  maxFires: number | null;
}

/** Sin regla, un borrador nuevo; con regla, el borrador que la reproduce tal y como está. */
export function borradorDesde(regla?: RuleRow): BorradorDeRegla {
  if (!regla) {
    return {
      name: "",
      trigger: disparadorPorDefecto("SESSION_STARTED"),
      conditions: [],
      effects: [efectoPorDefecto("REVEAL_ENTITY")],
      mode: "AUTOMATIC",
      maxFires: null,
    };
  }
  return {
    name: regla.name,
    trigger: regla.trigger,
    conditions: regla.conditions ?? [],
    effects: regla.effects ?? [],
    mode: regla.mode,
    maxFires: regla.maxFires,
  };
}
