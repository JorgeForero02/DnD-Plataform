import { createRuleSchema, type CreateRuleInput } from "@dnd/shared";
import type { RuleCondition, RuleEffect, RuleMode, RuleTrigger } from "@dnd/shared";
import type { RuleRow } from "./api";
import { CARRIL_DE_PARTE, nombreDePieza } from "./vocabulario";

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

/**
 * El borrador que edita `EditorDeRegla`: una regla a medio escribir, todavía sin validar.
 *
 * **Tarea R1: el suceso puede faltar, y los efectos pueden ser cero.** Antes el borrador
 * arrancaba con un suceso y un efecto ya puestos, porque los tres desplegables no sabían
 * representar el vacío. Con carriles sí: un carril vacío es un hueco dibujado que dice qué
 * pide. Y un borrador que arranca vacío es honesto — nadie ha elegido «Empieza una sesión»
 * todavía, y presentarlo como elegido es justo el tipo de mentira que hacía el editor
 * incomprensible.
 */
export interface BorradorDeRegla {
  name: string;
  trigger: RuleTrigger | null;
  conditions: RuleCondition[];
  effects: RuleEffect[];
  mode: RuleMode;
  maxFires: number | null;
}

/** Sin regla, un borrador nuevo y **vacío**; con regla, el borrador que la reproduce. */
export function borradorDesde(regla?: RuleRow): BorradorDeRegla {
  if (!regla) {
    return {
      name: "",
      trigger: null,
      conditions: [],
      effects: [],
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

// ---------------------------------------------------------------------------------------------
// Tarea R1 — qué le falta a la regla, contado en español y por carriles
// ---------------------------------------------------------------------------------------------
//
// La versión anterior enseñaba los mensajes crudos de Zod («trigger.entityId: Invalid cuid»).
// Eso es exactamente lo que el DM de la mesa no entendió. Aquí cada problema se cuenta con el
// carril donde está, la caja que lo tiene y el hueco que falta.
//
// **Esto no valida nada por su cuenta.** Quien decide si la regla vale es `createRuleSchema`,
// el mismo esquema que corre en la API; esta función solo traduce sus quejas y añade las dos
// que un carril vacío produce antes de que el esquema tenga nada que mirar.

/** Cómo se llama en pantalla el hueco que falta dentro de una caja. */
const HUECO: Record<string, string> = {
  entityId: "la entrada del mundo",
  fromId: "la entrada de origen",
  toId: "la entrada de destino",
  key: "el nombre de la marca o de la señal",
  setKey: "el nombre del conjunto",
  memberId: "el identificador del miembro",
  memberType: "el tipo de miembro",
  tag: "la etiqueta",
  count: "el número",
  message: "el mensaje",
  note: "la nota",
  ruleId: "la regla a la que apunta",
  skill: "la habilidad",
  outcome: "el resultado de la tirada",
  visibility: "la visibilidad",
  audience: "a quién se avisa",
  value: "si queda puesta o quitada",
  action: "la acción sobre el conjunto",
  armed: "si queda armada o desarmada",
  name: "el nombre de la regla",
  maxFires: "el tope de disparos",
};

function huecoLegible(campo: string | undefined): string {
  if (!campo) return "algo";
  return HUECO[campo] ?? `«${campo}»`;
}

/**
 * El resultado de mirar un borrador: los problemas en español y, si no hay ninguno, la entrada
 * ya validada y lista para mandar.
 */
export interface RevisionDelBorrador {
  problemas: string[];
  entrada?: CreateRuleInput;
}

export function revisarBorrador(borrador: BorradorDeRegla): RevisionDelBorrador {
  const problemas: string[] = [];

  if (borrador.trigger === null) {
    problemas.push(
      `El carril «${CARRIL_DE_PARTE.SUCESO}» está vacío: toda regla escucha un suceso, y sin él no hay nada que la despierte.`,
    );
  }
  if (borrador.effects.length === 0) {
    problemas.push(
      `El carril «${CARRIL_DE_PARTE.ACCION}» está vacío: una regla que no hace nada no es una regla.`,
    );
  }
  if (problemas.length > 0) return { problemas };

  const analisis = createRuleSchema.safeParse(borrador);
  if (analisis.success) return { problemas: [], entrada: analisis.data };

  for (const issue of analisis.error.issues) {
    const [raiz, segundo, tercero] = issue.path as (string | number)[];
    if (raiz === "trigger") {
      const caja = borrador.trigger ? nombreDePieza(borrador.trigger.kind) : "el suceso";
      problemas.push(
        `Carril «${CARRIL_DE_PARTE.SUCESO}», caja «${caja}»: falta ${huecoLegible(segundo as string)}.`,
      );
    } else if (raiz === "conditions") {
      const condicion = borrador.conditions[segundo as number];
      const caja = condicion ? nombreDePieza(condicion.kind) : "una condición";
      problemas.push(
        `Carril «${CARRIL_DE_PARTE.ESTADO}», caja «${caja}»: falta ${huecoLegible(tercero as string)}.`,
      );
    } else if (raiz === "effects") {
      const efecto = borrador.effects[segundo as number];
      const caja = efecto ? nombreDePieza(efecto.kind) : "un efecto";
      problemas.push(
        `Carril «${CARRIL_DE_PARTE.ACCION}», caja «${caja}»: falta ${huecoLegible(tercero as string)}.`,
      );
    } else if (raiz === "name") {
      problemas.push("La regla necesita un nombre: es como la vas a reconocer en la lista.");
    } else {
      problemas.push(`Falta ${huecoLegible(raiz as string)}.`);
    }
  }

  // Dos cajas iguales con el mismo hueco vacío producen la misma frase; se dice una sola vez.
  return { problemas: [...new Set(problemas)] };
}
