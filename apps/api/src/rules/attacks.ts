import {
  HAND_SLOTS,
  type AbilityKey,
  type DamageType,
  type DerivationWarning,
  type DerivedValue,
  type ResolvedItem,
  type TraceStep,
  type WeaponProperty,
} from "@dnd/shared";

// Carril A5 (fase 2C) — el cuadro de ataques. **Puro**: sin Nest, sin Prisma, sin dados de
// verdad. Entra qué hay equipado más lo que ya derivó el motor (modificadores y bono de
// competencia); sale, por cada arma, el bono de ataque **con su traza** y la expresión de daño
// que el evaluador de `dice.ts` sabe leer.
//
// **Por qué no vive en `engine.ts`.** El motor no conoce objetos: recibe modificadores ya
// resueltos (comentario de cabecera de `engine.ts`). Un ataque depende de qué arma hay en la
// mano, y eso es justo la frontera que separa «calcular con lo que ya se sabe» de «traducir un
// objeto a algo que el motor entiende». Mezclar los dos volvería a juntar catálogo y motor, que
// es la separación que 2A ya declaró (comentario de cabecera del propio `engine.ts`).

export interface AttackDamage {
  expression: string;
  dice: string;
  modifier: number;
  type: DamageType;
}

export interface Attack {
  /** Clave estable para pedir la tirada: la `ref` del objeto más la mano, si hace falta. */
  key: string;
  name: string;
  ref: string;
  /** Con qué característica se ataca, ya decidida. */
  ability: AbilityKey;
  /** El bono al ataque **con su traza**: modificador + competencia. */
  attackBonus: DerivedValue;
  /** La expresión que se tirará, ya montada por el servidor: `1d8+3`. */
  damage: AttackDamage;
  /** Lo mismo a dos manos, solo en un arma versátil. */
  versatileDamage?: AttackDamage;
  properties: WeaponProperty[];
  rangeNormalFt?: number;
  rangeLongFt?: number;
  /** Si el personaje tiene competencia con esta arma. Sin ella **no suma el bonificador**. */
  proficient: boolean;
}

export interface BuildAttacksInput {
  /** Solo lo EQUIPADO llega aquí; esta función no filtra por estado. */
  items: ResolvedItem[];
  abilityMods: Record<AbilityKey, number>;
  proficiencyBonus: number;
  /** De la clase: `"simple"`, `"martial"`, o claves sueltas del arma (`"long-sword"`). */
  weaponProficiencies: string[];
}

export interface BuildAttacksResult {
  attacks: Attack[];
  warnings: DerivationWarning[];
}

/** El conjunto de manos, para saber si hace falta desambiguar la clave por mano. */
const HAND_SLOT_SET = new Set<string>(HAND_SLOTS);

export function buildAttacks(input: BuildAttacksInput): BuildAttacksResult {
  const attacks: Attack[] = [];
  const warnings: DerivationWarning[] = [];

  const proficienciasNormalizadas = new Set(
    input.weaponProficiencies.map((p) => p.trim().toLowerCase()),
  );

  for (const item of input.items) {
    if (item.kind !== "WEAPON" || !item.weapon) continue;
    const weapon = item.weapon;

    const {
      ability,
      modifier,
      step: stepCaracteristica,
    } = decidirCaracteristica(weapon.range, weapon.properties, input.abilityMods);

    const proficient = tieneCompetencia(item.ref, weapon.category, proficienciasNormalizadas);

    const steps: TraceStep[] = [stepCaracteristica];
    let total = modifier;
    if (proficient) {
      steps.push(paso("add", input.proficiencyBonus, "proficiency", "weapon", "proficiencyBonus"));
      total += input.proficiencyBonus;
    } else {
      warnings.push({
        code: "attack_not_proficient",
        key: `attack.${claveDeArma(item)}`,
        data: { ref: item.ref, name: item.name },
      });
    }

    const key = claveDeArma(item);
    const attackBonus: DerivedValue = { key: `attack.${key}`, total, steps };

    const attack: Attack = {
      key,
      name: item.name,
      ref: item.ref,
      ability,
      attackBonus,
      damage: montarDano(weapon.damageDice, modifier, weapon.damageType),
      properties: weapon.properties,
      rangeNormalFt: weapon.rangeNormalFt,
      rangeLongFt: weapon.rangeLongFt,
      proficient,
    };

    // `TWO_HANDED` no es versátil: no lleva variante (regla explícita del encargo).
    if (weapon.properties.includes("VERSATILE") && weapon.versatileDice) {
      attack.versatileDamage = montarDano(weapon.versatileDice, modifier, weapon.damageType);
    }

    attacks.push(attack);
  }

  return { attacks, warnings };
}

/**
 * Cuerpo a cuerpo → Fuerza. A distancia → Destreza. `FINESSE` → la mejor de las dos, sea cual
 * sea el signo. `THROWN` sin `FINESSE` → Fuerza aunque se lance: el alcance del arma no cambia
 * quién la sostiene.
 */
function decidirCaracteristica(
  range: "MELEE" | "RANGED",
  properties: WeaponProperty[],
  abilityMods: Record<AbilityKey, number>,
): { ability: AbilityKey; modifier: number; step: TraceStep } {
  if (properties.includes("FINESSE")) {
    const ability: AbilityKey = abilityMods.dex >= abilityMods.str ? "dex" : "str";
    const modifier = abilityMods[ability];
    return { ability, modifier, step: pasoCaracteristica(ability, modifier) };
  }

  const ability: AbilityKey = range === "RANGED" ? "dex" : "str";
  const modifier = abilityMods[ability];
  return { ability, modifier, step: pasoCaracteristica(ability, modifier) };
}

function pasoCaracteristica(ability: AbilityKey, modifier: number): TraceStep {
  return paso("base", modifier, "ability", ability, `abilityMod.${ability}`);
}

/** Competencia por categoría (`simple`/`martial`) o por la clave suelta del arma. */
function tieneCompetencia(
  ref: string,
  category: "SIMPLE" | "MARTIAL",
  proficienciasNormalizadas: Set<string>,
): boolean {
  if (proficienciasNormalizadas.has(category.toLowerCase())) return true;
  const clave = ref.includes(":") ? ref.slice(ref.indexOf(":") + 1) : ref;
  return proficienciasNormalizadas.has(clave.trim().toLowerCase());
}

/** `1d8+3`, `1d8-1`, y **sin `+0`**: modificador cero es el dado a secas. */
function montarDano(dice: string, modifier: number, type: DamageType): AttackDamage {
  return { expression: montarExpresion(dice, modifier), dice, modifier, type };
}

function montarExpresion(dice: string, modifier: number): string {
  if (modifier === 0) return dice;
  return modifier > 0 ? `${dice}+${modifier}` : `${dice}${modifier}`;
}

/** `ref`, y si el objeto está en una mano concreta, la mano — para dos armas iguales a la vez. */
function claveDeArma(item: ResolvedItem): string {
  if (item.slot && HAND_SLOT_SET.has(item.slot)) return `${item.ref}:${item.slot}`;
  return item.ref;
}

function paso(
  op: TraceStep["op"],
  amount: number,
  sourceType: TraceStep["sourceType"],
  sourceKey: string,
  labelKey: string,
): TraceStep {
  return { op, amount, sourceType, sourceKey, labelKey };
}
