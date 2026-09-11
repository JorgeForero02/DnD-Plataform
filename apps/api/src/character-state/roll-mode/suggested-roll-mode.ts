import { ABILITY_KEYS, CLAVE_AYUDA, CLAVE_MUY_CARGADO } from "@dnd/shared";
import type {
  AbilityKey,
  RollKind,
  RollModeReason,
  RollSuggestions,
  SuggestedRollMode,
} from "@dnd/shared";

// Tarea 2.5.5, hueco M16 — **la ventaja y la desventaja que salen de las condiciones**.
//
// Hermano de `../speed/effective-speed.ts` y de `../common/agotamiento.ts`, y con su misma forma:
// **puro** —sin Nest, sin Prisma, sin HTTP—, entra la lista de condiciones ya vivas más qué se
// está tirando, y sale el resultado **con todas sus causas nombradas**, no solo la primera.
//
// **Sugiere, no impone.** El porqué está escrito entero en `roll-suggestion.schema.ts`
// (`@dnd/shared`): media tabla del SRD depende de circunstancias que el servidor no conoce —si la
// fuente del miedo está a la vista, si el atacante te ve, a qué distancia está—, así que el modo
// lo sigue eligiendo quien tira y esto es el aviso que evita el olvido.
//
// ## Las cifras, del SRD 5.1 (verificadas en inglés contra `dnd5eapi.co`, 2026-09-04)
//
// Solo entran los efectos sobre **las tiradas de quien tiene la condición**. Los que hablan de
// las tiradas del rival —«Attack rolls **against** the creature have advantage»— quedan fuera a
// propósito: esta función responde «¿cómo tiro yo?», y quien ataca a un ciego no tiene por qué
// estar mirando la hoja del ciego.
//
// | Condición | Cita literal | Aquí |
// |---|---|---|
// | `blinded` | *"the creature's attack rolls have disadvantage"* | ataque: desventaja |
// | `frightened` | *"has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight"* | prueba y ataque: desventaja |
// | `invisible` | *"the creature's attack rolls have advantage"* | ataque: **ventaja** |
// | `poisoned` | *"has disadvantage on attack rolls and ability checks"* | prueba y ataque: desventaja |
// | `prone` | *"The creature has disadvantage on attack rolls"* | ataque: desventaja |
// | `restrained` | *"the creature's attack rolls have disadvantage"* + *"has disadvantage on Dexterity saving throws"* | ataque: desventaja; salvación de Destreza: desventaja |
// | `paralyzed`, `petrified`, `stunned`, `unconscious` | *"It automatically fails Strength and Dexterity saving throws"* | salvación de Fuerza y de Destreza: **fallo automático** |
// | `exhaustion` 1 | *"Disadvantage on ability checks"* | prueba: desventaja |
// | `exhaustion` 3 | *"Disadvantage on attack rolls and saving throws"* | ataque y **toda** salvación: desventaja |
//
// **Los niveles de agotamiento se acumulan**: *"a character suffers the effect of its current
// level of exhaustion as well as all lower levels"*. Por eso el nivel 3 sigue penalizando las
// pruebas (efecto del 1), y por eso el `>=` de abajo no es un `===`.
//
// `charmed`, `deafened`, `grappled` e `incapacitated` **no cambian ninguna tirada propia**, y no
// estar en la tabla es la forma de decirlo. Una clave libre que el motor no conoce
// —«concentrándose en Bendición»— tampoco calcula nada, igual que en la velocidad efectiva.
//
// ## Dos reglas del SRD que se dejan fuera a propósito, y por qué
//
//  · **El fallo automático de `blinded`** (*"automatically fails any ability check that requires
//    sight"*) **no entra**, porque su condición es *that requires sight* y el servidor no sabe si
//    esta prueba concreta la requiere: Percepción sí, Atletismo no. Afirmarlo siempre convertiría
//    una regla condicional en una mentira la mitad de las veces.
//  · **Una salvación sin característica** (`ability` sin decir) recibe solo las reglas que no
//    dependen de ella —hoy, el agotamiento 3—. Es el mismo criterio: `restrained` penaliza las de
//    Destreza, y aplicarlo a una salvación desconocida sería inventar cuál es.

/** Lo que hace falta de una fila de `CharacterCondition` para este cálculo. */
export interface SuggestedRollModeCondition {
  key: string;
  /** Solo lo usa el agotamiento. */
  level?: number | null;
}

/** Qué se está tirando. La característica solo cuenta en las salvaciones. */
export interface RollBeingMade {
  kind: RollKind;
  ability?: AbilityKey;
}

/** Las que fallan automáticamente las salvaciones de Fuerza y de Destreza. */
const CONDICIONES_DE_FALLO_AUTOMATICO = new Set([
  "paralyzed",
  "petrified",
  "stunned",
  "unconscious",
]);
const SALVACIONES_QUE_SE_FALLAN_SOLAS: readonly AbilityKey[] = ["str", "dex"];

/** Desventaja en el ataque **de quien la tiene**. */
const DESVENTAJA_EN_ATAQUE = new Set(["blinded", "frightened", "poisoned", "prone", "restrained"]);

/** Desventaja en las pruebas de característica. */
const DESVENTAJA_EN_PRUEBAS = new Set(["frightened", "poisoned"]);

/**
 * Ventaja en el ataque de quien la tiene.
 *
 * `invisible` es del SRD. **`helped` no es una condición del SRD**: es la marca que deja la acción
 * Ayudar (plan 08, ficha I8), y el motor la entiende a propósito —*«the first attack roll is made
 * with advantage»*—. Se guarda en la misma tabla porque tiene la misma forma: una clave sobre un
 * personaje, con origen y con vencimiento.
 *
 * **Y sigue siendo una sugerencia**, como todo lo de aquí: la cercanía que el SRD exige —el enemigo
 * a cinco pies de quien ayuda— **no se puede comprobar sin distancias**, así que quien tira sigue
 * decidiendo. Lo que esto evita es el olvido.
 */
const VENTAJA_EN_ATAQUE = new Set(["invisible", CLAVE_AYUDA]);

/** El nivel a partir del cual el agotamiento penaliza las pruebas de característica. */
export const NIVEL_DE_AGOTAMIENTO_CON_DESVENTAJA_EN_PRUEBAS = 1;
/** El nivel a partir del cual penaliza los ataques y **todas** las salvaciones. */
export const NIVEL_DE_AGOTAMIENTO_CON_DESVENTAJA_EN_ATAQUES_Y_SALVACIONES = 3;

const ETIQUETAS = {
  ADVANTAGE: "rollMode.condition.advantage",
  DISADVANTAGE: "rollMode.condition.disadvantage",
  AUTO_FAIL: "rollMode.condition.autoFail",
} as const;

/**
 * La sugerencia de modo para una tirada, dadas las condiciones **ya vivas** del personaje.
 *
 * Quien llama filtra por `condicionesActivas` (`../conditions/vencimiento.ts`) antes de entrar
 * aquí, exactamente igual que hace la velocidad efectiva: una condición vencida sigue en la hoja
 * y no calcula nada, y esa regla vive en un solo sitio.
 *
 * **Ventaja y desventaja se anulan, y no se acumulan.** SRD 5.1: *"If circumstances cause a roll
 * to have both advantage and disadvantage, you are considered to have neither of them, and you
 * roll one d20"*, y *"If multiple situations affect a roll and each one grants advantage or
 * imposes disadvantage on it, you don't roll more than one additional d20"*. Por eso el cálculo
 * mira **si hay** causas de cada signo y no cuántas: contarlas —dos desventajas contra una
 * ventaja— inventaría una regla de mayorías que la 5.ª edición no tiene.
 */
export function suggestedRollMode(
  conditions: SuggestedRollModeCondition[],
  roll: RollBeingMade,
): SuggestedRollMode {
  const reasons: RollModeReason[] = [];

  const anota = (effect: RollModeReason["effect"], sourceKey: string) => {
    reasons.push({ effect, sourceKey, labelKey: ETIQUETAS[effect] });
  };

  for (const condition of conditions) {
    if (condition.key === "exhaustion") {
      const nivel = condition.level ?? 0;
      const clave = `exhaustion:${nivel}`;
      if (roll.kind === "CHECK" && nivel >= NIVEL_DE_AGOTAMIENTO_CON_DESVENTAJA_EN_PRUEBAS) {
        anota("DISADVANTAGE", clave);
      }
      if (
        (roll.kind === "ATTACK" || roll.kind === "SAVE") &&
        nivel >= NIVEL_DE_AGOTAMIENTO_CON_DESVENTAJA_EN_ATAQUES_Y_SALVACIONES
      ) {
        anota("DISADVANTAGE", clave);
      }
      continue;
    }

    // Migración 6 (D-CF-16) — SRD 5.1, Variant: Encumbrance: *"disadvantage on ability checks,
    // attack rolls, and saving throws that use Strength, Dexterity, or Constitution"*. No es una
    // de las quince condiciones del SRD ni se guarda en `CharacterCondition`:
    // `character-sheet.service.ts` añade esta clave a la lista de condiciones vivas solo cuando
    // la variante de campaña está encendida y el peso llevado supera 10×Fuerza.
    //
    // **Fix round 1 (ALTA-2).** La primera versión anotaba el ataque Y la prueba sin mirar la
    // característica, como el agotamiento — pero el agotamiento SÍ penaliza las dieciocho
    // pruebas sin distinción (*"Disadvantage on ability checks"*, sin más), y esta regla NO: el
    // SRD nombra tres de las seis. El ataque en 5.ª edición siempre es de Fuerza o Destreza (una
    // de las tres), así que ahí sí vale la comparación con el agotamiento; la prueba y la
    // salvación se miran igual, con `roll.ability`, y sin él no se anota nada — el mismo criterio
    // que ya usa la salvación de más abajo, y el que exige `rollSuggestionsFor` para calcular
    // `checks` (una por característica, igual que `saves`) además del `check` genérico que
    // siguen usando `frightened`/`poisoned`/el agotamiento (esas sí son ability-agnostic de
    // verdad).
    if (condition.key === CLAVE_MUY_CARGADO) {
      if (roll.kind === "ATTACK") {
        anota("DISADVANTAGE", condition.key);
      } else if (
        roll.ability !== undefined &&
        (["str", "dex", "con"] as AbilityKey[]).includes(roll.ability)
      ) {
        anota("DISADVANTAGE", condition.key);
      }
      continue;
    }

    if (roll.kind === "ATTACK") {
      if (VENTAJA_EN_ATAQUE.has(condition.key)) anota("ADVANTAGE", condition.key);
      else if (DESVENTAJA_EN_ATAQUE.has(condition.key)) anota("DISADVANTAGE", condition.key);
      continue;
    }

    if (roll.kind === "CHECK") {
      if (DESVENTAJA_EN_PRUEBAS.has(condition.key)) anota("DISADVANTAGE", condition.key);
      continue;
    }

    // SAVE. Las dos reglas que quedan dependen de la característica, así que sin ella no se
    // aplica ninguna: ver la cabecera.
    if (roll.ability === undefined) continue;
    if (
      CONDICIONES_DE_FALLO_AUTOMATICO.has(condition.key) &&
      SALVACIONES_QUE_SE_FALLAN_SOLAS.includes(roll.ability)
    ) {
      anota("AUTO_FAIL", condition.key);
    } else if (condition.key === "restrained" && roll.ability === "dex") {
      anota("DISADVANTAGE", condition.key);
    }
  }

  const hayVentaja = reasons.some((r) => r.effect === "ADVANTAGE");
  const hayDesventaja = reasons.some((r) => r.effect === "DISADVANTAGE");
  const cancelled = hayVentaja && hayDesventaja;
  const mode: SuggestedRollMode["mode"] = cancelled
    ? "NORMAL"
    : hayVentaja
      ? "ADVANTAGE"
      : hayDesventaja
        ? "DISADVANTAGE"
        : "NORMAL";

  return {
    kind: roll.kind,
    ...(roll.ability !== undefined ? { ability: roll.ability } : {}),
    mode,
    cancelled,
    autoFail: reasons.some((r) => r.effect === "AUTO_FAIL"),
    reasons,
  };
}

/**
 * Las sugerencias que publica la hoja: el ataque, la prueba y **una salvación por
 * característica**.
 *
 * Las seis salvaciones se calculan porque las reglas que quedan **distinguen la característica**
 * —`restrained` solo penaliza Destreza, el fallo automático solo alcanza Fuerza y Destreza—, así
 * que una sola entrada «salvación» tendría que elegir entre mentir en cuatro o callarse en dos.
 * Son ocho llamadas a una función pura sobre una lista de dos o tres elementos: no hay nada que
 * optimizar aquí.
 */
export function rollSuggestionsFor(conditions: SuggestedRollModeCondition[]): RollSuggestions {
  const saves = {} as Record<AbilityKey, SuggestedRollMode>;
  // Fix round 1 (ALTA-2) — **una prueba por característica, igual que las salvaciones**, porque
  // ahora hay una regla («muy cargado») que distingue característica en la prueba y no solo en
  // la salvación: una sola entrada `check` tendría que elegir entre mentir en las que el SRD no
  // nombra o callarse en las que sí. `check` (sin característica) se queda para lo que de
  // verdad no distingue — `frightened`, `poisoned`, el agotamiento — y una pantalla que enlaza
  // una habilidad concreta (Percepción, Atletismo…) usa `checks[esaCaracterística]`.
  const checks = {} as Record<AbilityKey, SuggestedRollMode>;
  for (const ability of ABILITY_KEYS) {
    saves[ability] = suggestedRollMode(conditions, { kind: "SAVE", ability });
    checks[ability] = suggestedRollMode(conditions, { kind: "CHECK", ability });
  }
  return {
    attack: suggestedRollMode(conditions, { kind: "ATTACK" }),
    check: suggestedRollMode(conditions, { kind: "CHECK" }),
    checks,
    saves,
  };
}
