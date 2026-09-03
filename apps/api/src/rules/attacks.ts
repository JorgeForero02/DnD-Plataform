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
  // Qué hay en la mano izquierda decide si un arma versátil puede empuñarse a dos manos. La
  // ranura llega de la fila del inventario, no del catálogo (ver `equipoEquipado`).
  const manoIzquierdaOcupada = input.items.some((i) => i.slot === "OFF_HAND");

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

    // **El arma mágica.** Un `+1` al ataque y al daño son dos efectos del propio objeto
    // (`weaponAttack`/`weaponDamage`), y se aplican **solo al arma que los lleva**: es el objeto
    // más común del juego después de la armadura, y hasta la auditoría de mecánica de 2B no
    // había forma de representarlo — el DM entregaba la espada +1 y el cuadro seguía diciendo
    // lo mismo.
    const bonoAtaque = sumaDeEfecto(item, "weaponAttack");
    const bonoDano = sumaDeEfecto(item, "weaponDamage");

    const steps: TraceStep[] = [stepCaracteristica];
    let total = modifier;
    if (bonoAtaque !== 0) {
      steps.push(paso("add", bonoAtaque, "item", item.ref, `item.${item.ref}`));
      total += bonoAtaque;
    }
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
      damage: montarDano(weapon.damageDice, modifier + bonoDano, weapon.damageType),
      properties: weapon.properties,
      rangeNormalFt: weapon.rangeNormalFt,
      rangeLongFt: weapon.rangeLongFt,
      proficient,
    };

    // `TWO_HANDED` no es versátil: no lleva variante (regla explícita del encargo).
    //
    // **Y versátil significa «empuñada con las dos manos», que con la izquierda ocupada es
    // imposible.** Ofrecerlo igual regalaba +1 de daño medio por asalto a un guerrero que
    // conserva su escudo y su CA: la auditoría de mecánica de 2B lo midió así. Cuando la otra
    // mano está ocupada no se emite la variante y sale un aviso, que es más honesto que
    // esconderla sin decir por qué.
    if (weapon.properties.includes("VERSATILE") && weapon.versatileDice) {
      if (manoIzquierdaOcupada) {
        warnings.push({
          code: "versatile_needs_both_hands",
          key: `attack.${key}`,
          data: { ref: item.ref, name: item.name },
        });
      } else {
        attack.versatileDamage = montarDano(
          weapon.versatileDice,
          modifier + bonoDano,
          weapon.damageType,
        );
      }
    }

    // **El ataque con la otra mano no suma el modificador al daño** (SRD 5.1, combate con dos
    // armas) — **salvo que el modificador sea negativo**, y el estilo de combate «Combate con dos
    // armas» levanta la restricción entera. Comprobado contra la fuente el 2026-09-03: una
    // versión anterior de este comentario decía «salvo dote», y eso es otra cosa (la dote del
    // SRD da +1 a la CA y permite armas no ligeras, no el modificador).
    //
    // Además **solo aplica al ataque adicional de acción adicional**, y esta ficha no modela los
    // ataques de un turno: es una fila por arma equipada. Así que el número no se toca y se
    // avisa — la máquina ejecuta, el DM arbitra.
    if (item.slot === "OFF_HAND" && weapon.properties.includes("LIGHT")) {
      warnings.push({
        code: "two_weapon_offhand_damage",
        key: `attack.${key}`,
        data: { ref: item.ref, name: item.name },
      });
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

/**
 * Lo que suman los efectos de un tipo concreto **de este objeto**. Los objetos mágicos del SRD
 * no se copian (`NOTICE.md`); lo que esta función hace posible es que el DM escriba los suyos.
 */
function sumaDeEfecto(item: ResolvedItem, kind: "weaponAttack" | "weaponDamage"): number {
  return item.effects.reduce(
    (suma, efecto) => (efecto.kind === kind ? suma + efecto.amount : suma),
    0,
  );
}
