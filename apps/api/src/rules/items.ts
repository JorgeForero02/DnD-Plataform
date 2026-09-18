// Carril A2 — de objetos equipados a entrada del motor.
//
// **Puro**: sin Nest, sin Prisma, sin HTTP, sin reloj y sin azar. Traduce la lista cerrada de
// `itemEffectSchema` (`packages/shared/src/item.schema.ts`) a lo que el motor ya sabe comer:
// `Modifier`, `AcFormula` y sumas planas de CA. El motor sigue sin saber qué es un objeto — solo
// ve modificadores con `sourceType: "item"`, exactamente como ve los de raza o clase.
//
// **Quién decide la Clase de Armadura del equipo.** `resolve.ts` traduce dos caminos al mismo
// destino: `build.armor` (referencias SRD sueltas, el camino de 2A) y `build.items` (objetos ya
// resueltos, el camino de esta tarea). Los dos necesitan la misma regla —«una armadura de cuerpo
// es una fórmula candidata, un escudo es una suma plana, y no se puede llevar dos de ninguna»—,
// así que esa regla vive **una sola vez, aquí** (`armorToAcContribution`, `assertValidArmorSet`,
// y el error que lanza, `InvalidEquipmentError`) y `resolve.ts` la importa para `build.armor`.
//
// Vive en este fichero y no en `resolve.ts` **por la dirección de las dependencias**:
// `resolveBuild` necesita llamar a `equipmentToEngineInput` (para traducir `build.items`), así
// que si la regla de armadura-a-CA viviera en `resolve.ts`, este fichero tendría que importar de
// vuelta de `resolve.ts` — un ciclo. Con la regla aquí, `resolve.ts` depende de `items.ts` y
// nunca al revés.

import type {
  AbilityKey,
  DerivationWarning,
  ItemEffect,
  ProficiencyLevel,
  ResolvedItem,
  SkillKey,
} from "@dnd/shared";
import type { AcFormula, EngineInput, Modifier } from "./engine";

/**
 * HP-9a (2026-09-12) — los efectos de un objeto **que cuentan ahora mismo**.
 *
 * SRD 5.1, «Magic Items → Attunement»: un objeto que requiere sintonización solo da sus
 * propiedades mágicas a la criatura sintonizada con él; sin sintonizar, el objeto se comporta
 * como su versión mundana (la espada sigue siendo una espada, la armadura sigue dando su CA
 * base). Por eso esta función filtra **solo `effects`** —lo mágico— y no toca `armor.baseAc`
 * ni `weapon.damageDice`, que son lo mundano y siguen contando.
 *
 * Es la ÚNICA puerta por la que el motor lee `effects` de un objeto equipado: la CA y el resto
 * de efectos pasan por aquí (`equipmentToEngineInput`) y el +N al ataque y al daño también
 * (`attacks.ts`, `sumaDeEfecto`). Antes de HP-9a ninguno de los dos leía `attuned`, y un anillo
 * +1 sin sintonizar daba +1 igual que uno sintonizado.
 */
export function efectosActivos(item: ResolvedItem): ItemEffect[] {
  return [...efectosPropios(item), ...efectosTemporales(item)];
}

/**
 * Los `effects` del propio objeto, ya filtrados por sintonización — la puerta original de HP-9a.
 * Exportada desde la ola de arreglos de 3A.2 (m-5): `attacks.ts` reimplementaba este `if` en
 * `sumaDeEfectoPropio`, y HP-9a existe justo para que el filtro y el aviso no puedan discrepar.
 */
export function efectosPropios(item: ResolvedItem): ItemEffect[] {
  if (item.requiresAttunement && !item.attuned) return [];
  return item.effects;
}

/**
 * T15 (3A.2) — un `TemporaryModifier` sobre esta fila del inventario (*Arma mágica*), traducido
 * al mismo vocabulario que un objeto mágico permanente. **Nunca pasa por la sintonización**: un
 * encantamiento lanzado sobre el arma no es una propiedad del objeto que dependa de llevarlo
 * puesto de cierta forma — es un efecto de conjuro con su propio vencimiento (el reloj, no
 * `attuned`), y `item.temporales` ya llega aquí filtrado a los vivos
 * (`character-sheet.service.ts`, `temporalesPorObjeto`).
 */
export function efectosTemporales(item: ResolvedItem): ItemEffect[] {
  if (!item.temporales) return [];
  return item.temporales.map((t) => ({ kind: t.effect, amount: t.amount }));
}

/**
 * HP-9a (Task 2) — «tenía efectos y la puerta los dejó fuera». Es lo que la hoja avisa como
 * `item_not_attuned` (`character-sheet.service.ts`), y se define AQUÍ, al lado de la puerta y
 * en sus términos, para que el aviso y el filtro no puedan discrepar: si un día la puerta cambia
 * (una excepción, otra condición), el aviso cambia con ella sin tocar el servicio.
 *
 * **Solo mira `efectosPropios` (T15).** Un arma sin sintonizar que además lleva un encantamiento
 * temporal vivo seguía necesitando el aviso «sin sintonizar» antes de esta tarea; con
 * `efectosActivos` a secas (que ya suma los temporales) el aviso se apagaba en cuanto alguien la
 * encantaba, y eso es la fuga exacta que HP-9a cerró para el resto de objetos, abierta por esta
 * puerta nueva.
 */
export function sintonizacionPendiente(item: ResolvedItem): boolean {
  return item.effects.length > 0 && efectosPropios(item).length === 0;
}

/** Equipo que no puede llevarse a la vez. **Se traduce a 400 en el borde** (2A.6). */
export class InvalidEquipmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidEquipmentError";
  }
}

/**
 * `none < half < proficient < expertise`. Cuando dos fuentes conceden la misma habilidad **gana
 * la mejor y no se suman** — la regla de 5.ª edición, y la única que no rompe la media
 * competencia: un bardo competente en Sigilo no gana además la mitad por «Aprendiz de todo».
 *
 * Vive aquí porque tanto los objetos (este fichero) como las concesiones de raza y clase
 * (`resolve.ts`, que la importa) tienen que resolver el mismo empate de la misma manera.
 */
export const ORDEN_COMPETENCIA: Record<ProficiencyLevel, number> = {
  none: 0,
  half: 1,
  proficient: 2,
  expertise: 3,
};

/** Lo mínimo que hace falta de una armadura para traducirla a CA: el dato del SRD y el de un objeto encajan los dos aquí. */
export interface ArmorLike {
  category: "LIGHT" | "MEDIUM" | "HEAVY" | "SHIELD";
  baseAc: number;
  dexCap?: number;
}

/**
 * Un escudo **no es una fórmula candidata**: es una suma plana que se aplica gane la que gane.
 * Meterlo como fórmula haría que «escudo solo» compitiera con «cota de malla» y ganara la peor
 * de las dos.
 */
export function armorToAcContribution(
  armor: ArmorLike,
  key: string,
  labelKey: string,
): { acFormula?: AcFormula; acBonus?: NonNullable<EngineInput["acBonuses"]>[number] } {
  if (armor.category === "SHIELD") {
    return { acBonus: { amount: armor.baseAc, labelKey, sourceType: "item", sourceKey: key } };
  }
  return {
    acFormula: {
      key,
      labelKey,
      base: armor.baseAc,
      // La armadura solo topa la Destreza, y la topa **a ella**: el tope es por característica
      // desde el 2026-09-06, así que esto dice lo mismo que decía y ya no habla por las demás.
      addAbilities: [{ ability: "dex", cap: armor.dexCap }],
      sourceType: "item",
      sourceKey: key,
    },
  };
}

/**
 * Dos armaduras de cuerpo, o dos escudos, no es una ficha rara: es una ficha imposible. Sin
 * esto, dos escudos sumarían **+4**, y dos armaduras dejarían la descartada como un aviso que en
 * pantalla parece una sugerencia en vez de un equipo inválido.
 */
export function assertValidArmorSet(equipo: ArmorLike[]): void {
  if (equipo.filter((a) => a.category !== "SHIELD").length > 1)
    throw new InvalidEquipmentError("Solo se puede llevar una armadura a la vez");
  if (equipo.filter((a) => a.category === "SHIELD").length > 1)
    throw new InvalidEquipmentError("Solo se puede llevar un escudo a la vez");
}

/** Las seis salvaciones, en el orden en que el resto del motor las recorre. */
const LAS_SEIS_SALVACIONES: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

export interface EquipmentEngineInput {
  modifiers: Modifier[];
  acFormulas: AcFormula[];
  acBonuses: NonNullable<EngineInput["acBonuses"]>;
  skillProficiencies: Partial<Record<SkillKey, ProficiencyLevel>>;
  saveProficiencies: AbilityKey[];
  warnings: DerivationWarning[];
}

/**
 * De objetos equipados a entrada del motor.
 *
 * **Segundo parámetro, `strengthScore`, y no solo `items`.** El requisito de Fuerza de una
 * armadura se compara contra la Fuerza del personaje — sin ese número no hay con qué comparar
 * `strengthRequirement`, y esa comparación es justo lo que este carril pide automatizar. Es la
 * puntuación **base** (`build.abilities.str`): un objeto que suba la Fuerza no libra a la mesa
 * de la penalización en la misma derivación que la concede, y esa es una decisión declarada, no
 * un olvido.
 */
export function equipmentToEngineInput(
  items: ResolvedItem[],
  strengthScore: number,
  /**
   * Razas cuya velocidad **no** baja por armadura pesada (SRD 5.1: el enano). El aviso se emite
   * igual —la mesa quiere saber que no llega a la Fuerza que pide la armadura—, pero la
   * penalización de diez pies no se aplica.
   */
  heavyArmorSpeedExempt = false,
  /**
   * Con qué categorías de armadura ("light", "medium", "heavy", "shield") tiene competencia el
   * personaje (`SrdClass.armorProficiencies`, `catalog/types.ts`). **`undefined` y no `[]` por
   * defecto**: los llamadores que todavía no pasan este dato (pruebas antiguas, el camino
   * legado de `build.armor`) no piden el chequeo, y forzar `[]` los habría hecho avisar de una
   * incompetencia que nadie preguntó. Cuando sí llega, es una lista cerrada: lo que no está,
   * avisa (Tarea 15, I6).
   */
  armorProficiencies?: string[],
  /**
   * La variante de sobrecarga de la campaña (migración 6, D-CF-16, `Campaign.encumbranceVariant`),
   * apagada por defecto. SRD 5.1, «Variant: Encumbrance»: *"When you use this variant, ignore the
   * Strength column of the Armor table in chapter 5."* Esa columna es exactamente
   * `strengthRequirement`, y de ella sale la penalización de diez pies de más abajo — con la
   * variante encendida, esa penalización deja de aplicarse. El aviso
   * (`armor_strength_requirement_unmet`) se queda: la mesa sigue queriendo saber que no llega al
   * requisito, solo que ya no le cuesta velocidad por partida doble con la sobrecarga.
   */
  encumbranceVariant = false,
): EquipmentEngineInput {
  const modifiers: Modifier[] = [];
  const acFormulas: AcFormula[] = [];
  const acBonuses: NonNullable<EngineInput["acBonuses"]> = [];
  const warnings: DerivationWarning[] = [];
  const skillProficiencies: Partial<Record<SkillKey, ProficiencyLevel>> = {};
  const saveProficiencies = new Set<AbilityKey>();

  // Equipo imposible: la misma regla que `build.armor` (`resolve.ts`), con la misma excepción
  // (`InvalidEquipmentError`), aplicada a `build.items`.
  const armaduras = items
    .map((item) => item.armor)
    .filter((armor): armor is NonNullable<typeof armor> => !!armor);
  assertValidArmorSet(armaduras);

  const proficienciasDeArmaduraNormalizadas =
    armorProficiencies && armorProficiencies.map((p) => p.trim().toLowerCase());

  const anotarCompetenciaHabilidad = (skill: SkillKey, nivel: ProficiencyLevel) => {
    const actual = skillProficiencies[skill] ?? "none";
    // **Gana la mejor y no se suma.** Misma regla, mismo orden (`ORDEN_COMPETENCIA`), que usa
    // `resolve.ts` para las concesiones de raza y clase — importada de allí, no reescrita.
    if (ORDEN_COMPETENCIA[nivel] > ORDEN_COMPETENCIA[actual]) skillProficiencies[skill] = nivel;
  };

  for (const item of items) {
    const labelKey = `item.${item.ref}`;

    for (const effect of efectosActivos(item)) {
      switch (effect.kind) {
        case "ac":
          acBonuses.push({
            amount: effect.amount,
            labelKey,
            sourceType: "item",
            sourceKey: item.ref,
          });
          break;
        case "abilityScore":
          modifiers.push({
            target: `ability.${effect.ability}`,
            // `set` fija la puntuación (el cinturón de fuerza); `add` la suma. El motor ya sabe
            // representar la primera como `override` — es exactamente lo que existe para esto.
            op: effect.mode === "set" ? "override" : "add",
            amount: effect.amount,
            sourceType: "item",
            sourceKey: item.ref,
            labelKey,
          });
          break;
        case "save":
          if (effect.ability) {
            modifiers.push({
              target: `save.${effect.ability}`,
              op: "add",
              amount: effect.amount,
              sourceType: "item",
              sourceKey: item.ref,
              labelKey,
            });
          } else {
            // Sin `ability`: a las seis (la capa de protección del SRD).
            for (const ability of LAS_SEIS_SALVACIONES)
              modifiers.push({
                target: `save.${ability}`,
                op: "add",
                amount: effect.amount,
                sourceType: "item",
                sourceKey: item.ref,
                labelKey,
              });
          }
          break;
        case "maxHp":
          modifiers.push({
            target: "maxHp",
            op: "add",
            amount: effect.amount,
            sourceType: "item",
            sourceKey: item.ref,
            labelKey,
          });
          break;
        case "speed":
          modifiers.push({
            target: `speed.${effect.movement}`,
            op: "add",
            amount: effect.amount,
            sourceType: "item",
            sourceKey: item.ref,
            labelKey,
          });
          break;
        case "skillProficiency":
          // `effect.skill` sale de `packages/shared` tipado como `string` (el enum se construye
          // desde `Object.keys(SKILLS)` con un ensanche a `[string, ...string[]]`), no como
          // `SkillKey` literal. El esquema ya garantiza en tiempo de ejecución que es una de las
          // dieciocho; el `as` solo recupera el tipo que la validación ya aseguró — el mismo
          // patrón que usa `resolve.ts` en sus propias elecciones de habilidad.
          anotarCompetenciaHabilidad(effect.skill as SkillKey, effect.level);
          break;
        case "saveProficiency":
          saveProficiencies.add(effect.ability);
          break;
      }
    }

    if (item.armor) {
      const contribucion = armorToAcContribution(item.armor, item.ref, labelKey);
      if (contribucion.acFormula) acFormulas.push(contribucion.acFormula);
      if (contribucion.acBonus) acBonuses.push(contribucion.acBonus);

      // Requisito de Fuerza incumplido: el SRD baja 10 pies la velocidad de caminar. **Eso sí es
      // un número** — se aplica como modificador — y además se avisa, porque es justo lo que la
      // mesa pregunta al ponerse la armadura.
      //
      // **Salvo que la raza esté exenta, o que la campaña juegue con la variante de sobrecarga.**
      // El enano no pierde velocidad por armadura pesada (SRD 5.1), y hasta la auditoría de
      // mecánica de 2B sí la perdía aquí: el arquetipo más común de la mesa —enano guerrero con
      // armadura de bandas— corría 15 pies en la pantalla y 25 en el manual. La variante de
      // sobrecarga (migración 6, D-CF-16) es la segunda exención, y viene del propio SRD:
      // «Variant: Encumbrance» dice *"ignore the Strength column of the Armor table"*, que es
      // exactamente de donde sale este −10.
      //
      // **Fix round 2 (MEDIA-A) — con la variante encendida, tampoco se avisa.** La primera
      // versión de este arreglo (fix round 1) seguía avisando —«la mesa quiere saber que no
      // llega al requisito, aunque hoy no le cueste velocidad»—, y eso dejó
      // `apps/web/src/features/character-sheet/vocabulario.ts` diciendo «la velocidad al caminar
      // baja 10 pies» en una hoja donde la velocidad no bajaba: el texto explicando una regla del
      // servidor que ya no es cierta. **Ignorar la columna de Fuerza** —lo que el SRD manda con
      // la variante encendida— es ignorarla del todo: ni el número, ni el aviso sobre un número
      // que no existe. Con la exención del enano (`heavyArmorSpeedExempt`), en cambio, el aviso
      // SÍ se queda: esa es una regla de raza, no de la variante, y el SRD nunca dijo que dejara
      // de avisarse — solo que a él no le cuesta velocidad.
      if (item.armor.strengthRequirement > strengthScore && !encumbranceVariant) {
        if (!heavyArmorSpeedExempt) {
          modifiers.push({
            target: "speed.walk",
            op: "add",
            amount: -10,
            sourceType: "item",
            sourceKey: item.ref,
            labelKey: `${labelKey}.strengthPenalty`,
          });
        }
        warnings.push({
          code: "armor_strength_requirement_unmet",
          key: "speed.walk",
          data: {
            item: item.ref,
            required: item.armor.strengthRequirement,
            actual: strengthScore,
          },
        });
      }

      // **Sin competencia con la categoría, aviso — nunca un impedimento.** SRD 5.1, «Armor
      // Proficiency»: *«If you wear armor that you lack proficiency with, you have disadvantage
      // on any ability check, saving throw, or attack roll that involves Strength or Dexterity,
      // and you can't cast spells.»* Es la misma doctrina que ya usa `attack_not_proficient`
      // (`../attacks.ts`): el motor cuenta y avisa, y es la mesa quien aplica la desventaja —
      // este motor no representa ventaja/desventaja como número. Sólo se comprueba cuando el
      // llamador pasó `armorProficiencies`; sin ese dato, no se pregunta.
      if (
        proficienciasDeArmaduraNormalizadas &&
        !proficienciasDeArmaduraNormalizadas.includes(item.armor.category.toLowerCase())
      ) {
        warnings.push({
          code: "armor_not_proficient",
          key: `armor.${item.ref}`,
          data: { armorKey: item.ref, category: item.armor.category.toLowerCase() },
        });
      }

      // Desventaja en Sigilo **no es un número**: ventaja y desventaja las marca el DM en la
      // mesa, no el motor. Se enseña como aviso, nada más.
      if (item.armor.stealthDisadvantage) {
        warnings.push({
          code: "armor_stealth_disadvantage",
          key: "skill.stealth",
          data: { item: item.ref },
        });
      }
    }
  }

  return {
    modifiers,
    acFormulas,
    acBonuses,
    skillProficiencies,
    saveProficiencies: [...saveProficiencies],
    warnings,
  };
}
