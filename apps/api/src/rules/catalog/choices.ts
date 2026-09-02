// Tarea 2A.4 — elecciones sin resolver: *«+1 a dos características a tu elección»*, *«elige
// cuatro habilidades»*.
//
// **No son casos especiales por raza: son el mismo mecanismo.** Lo que evita esto es una rama
// `if (race === "half-elf")` en el motor; añadir una raza propia en 2B pasa a ser añadir datos
// y no código (§3 del plan de 2A).
//
// Tres reglas, y las tres tienen prueba:
//
// 1. **Sin elección, no se aplica nada** y sale un aviso `unresolved_choice`. Ni medio bono, ni
//    un valor por defecto: la hoja dice qué falta.
// 2. **Una elección incompleta tampoco aplica nada.** Aplicar la mitad daría una ficha con
//    pinta de terminada y números mal; el aviso dice cuántas faltan.
// 3. **Una elección inválida es un error, no un aviso**, y el que la valida es el servidor.
//    Elegir cinco habilidades donde tocan cuatro, repetir una, salirse de la lista o elegir lo
//    que `excluding` prohíbe: las cuatro son `InvalidChoiceError`.
//
// **Aviso honesto sobre el código de estado.** Estas excepciones **todavía no son un 400**: hoy
// no hay endpoint que las provoque y la API no registra ningún filtro de excepciones, así que
// si alguna escapara Nest devolvería 500. Traducirlas es trabajo de 2A.6, cuando exista el
// borde que las pueda producir, y está declarado en `docs/06-pendientes.md`. Lo dice aquí
// porque el comentario anterior afirmaba que ya lo eran, y la revisión lo cazó: cuando el texto
// y el código discrepan, el que miente es el texto.

import type { AbilityChoiceGrant, SkillChoiceGrant } from "./types";

export type ChoiceGrant = AbilityChoiceGrant | SkillChoiceGrant;

/** Lo que el jugador ha decidido, por clave de concesión. Es una fila de datos, no código. */
export type CharacterChoices = Record<string, string[]>;

export type InvalidChoiceCode =
  "TOO_MANY" | "DUPLICATE" | "NOT_IN_LIST" | "EXCLUDED" | "UNKNOWN_GRANT";

/**
 * Una elección que el catálogo rechaza. **Deberá traducirse a 400 en el borde** (2A.6): el
 * cuerpo venía mal, el servidor está bien.
 */
export class InvalidChoiceError extends Error {
  constructor(
    readonly code: InvalidChoiceCode,
    readonly grantId: string,
    /** La elección que sobra o no vale. **Vacío en `TOO_MANY`**, que no señala a ninguna. */
    readonly pick?: string,
  ) {
    super(`Elección inválida (${code}) en «${grantId}»${pick ? `: «${pick}»` : ""}`);
    this.name = "InvalidChoiceError";
  }
}

export interface ValidatedChoice {
  picks: string[];
  /** `true` solo si hay exactamente las que la concesión pide. */
  complete: boolean;
}

/**
 * Valida lo elegido contra la concesión. **Devuelve lo que hay; no rellena nada.**
 *
 * Elegir de menos **no es un error**: es una ficha a medio hacer, que es un estado normal
 * mientras alguien la construye. Elegir de más sí lo es: no hay forma de saber cuál sobra, y
 * adivinarlo sería inventarse la ficha de otro.
 */
export function validatePicks(grant: ChoiceGrant, picks: string[] | undefined): ValidatedChoice {
  const elegidas = picks ?? [];

  // `pick` se deja vacío a propósito: en los otros códigos señala **la elección ofensiva**, y
  // meter aquí un recuento haría que quien lea el error viera un número donde espera una clave.
  if (elegidas.length > grant.choose) throw new InvalidChoiceError("TOO_MANY", grant.id);

  const vistas = new Set<string>();
  const excluidas = new Set<string>(grant.kind === "abilityChoice" ? (grant.excluding ?? []) : []);
  const permitidas = new Set<string>(grant.from as readonly string[]);

  for (const pick of elegidas) {
    if (vistas.has(pick)) throw new InvalidChoiceError("DUPLICATE", grant.id, pick);
    vistas.add(pick);
    if (!permitidas.has(pick)) throw new InvalidChoiceError("NOT_IN_LIST", grant.id, pick);
    // `excluding` va **después** de la lista: el semielfo tiene Carisma en `from` porque el
    // mecanismo es genérico, y es su +2 fijo el que lo prohíbe. Un mensaje que dijera «no está
    // en la lista» sería falso y mandaría a buscar el error donde no está.
    if (excluidas.has(pick)) throw new InvalidChoiceError("EXCLUDED", grant.id, pick);
  }

  return { picks: elegidas, complete: elegidas.length === grant.choose };
}

/**
 * Comprueba que toda elección enviada apunta a una concesión que esta ficha tiene de verdad.
 *
 * Sin esto, una elección con la clave mal escrita —o la de otra raza— **se ignoraría en
 * silencio** y el jugador vería su bono desaparecer sin explicación. Es el fallo que no se
 * reproduce y todo el mundo recuerda.
 */
export function assertNoUnknownChoices(choices: CharacterChoices, conocidas: Set<string>): void {
  for (const grantId of Object.keys(choices))
    if (!conocidas.has(grantId)) throw new InvalidChoiceError("UNKNOWN_GRANT", grantId);
}
