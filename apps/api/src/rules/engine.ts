import {
  ABILITY_KEYS,
  SKILLS,
  type AbilityKey,
  type DerivationResult,
  type DerivationWarning,
  type DerivedValue,
  type ProficiencyLevel,
  type SkillKey,
  type TraceStep,
} from "@dnd/shared";

// Tarea 2A.2 — el motor de derivación. **Puro**: sin Nest, sin Prisma, sin HTTP, sin reloj y
// sin azar. Entra el estado base más una lista de modificadores ya resueltos; sale el valor
// derivado con su traza.
//
// **Determinista por construcción.** Nada de este módulo mira la hora ni tira un dado: los
// mismos datos dan exactamente la misma salida, siempre. Es lo que permite probarlo a fondo
// antes de que exista un solo endpoint, que es lo que el plan maestro pide para la parte más
// arriesgada del proyecto.
//
// **El catálogo no vive aquí.** Razas, clases y objetos llegan ya convertidos en modificadores
// (tarea 2A.3). Mezclarlos haría que un fallo del motor pareciera un fallo de transcripción.

/** Un modificador ya resuelto: de dónde sale y qué le hace a qué. */
export interface Modifier {
  /** `"ability.str"`, `"maxHp"`, `"save.dex"`, `"skill.stealth"`, `"speed.walk"`. */
  target: string;
  op: "add" | "override";
  amount: number;
  sourceType: TraceStep["sourceType"];
  sourceKey: string;
  labelKey: string;
}

/**
 * Una fórmula candidata de CA. **Se evalúan todas y gana la mayor** — que es exactamente lo que
 * dicen las reglas y lo que un modelo aditivo se salta.
 */
export interface AcFormula {
  key: string;
  labelKey: string;
  /** El número del que parte: 10 sin armadura, 16 con cota de malla. */
  base: number;
  /** Qué característica suma, si suma alguna. */
  addAbility?: AbilityKey;
  /**
   * Tope de esa característica. `0` en armadura pesada (**no suma nada**), `2` en media,
   * `undefined` en ligera o sin armadura (**sin tope**).
   */
  abilityCap?: number;
  sourceType: TraceStep["sourceType"];
  sourceKey: string;
}

export interface EngineInput {
  /** Puntuaciones **base**, antes de raza: la raza entra como modificador, no premezclada. */
  abilities: Record<AbilityKey, number>;
  level: number;
  /** El tamaño del dado de golpe de la clase: 6, 8, 10 o 12. */
  hitDieSize: number;
  modifiers: Modifier[];
  /** Salvaciones en las que se tiene competencia. */
  saveProficiencies: AbilityKey[];
  /** Competencia por habilidad. Lo que no esté aquí es `"none"`. */
  skillProficiencies: Partial<Record<SkillKey, ProficiencyLevel>>;
  /** Fórmulas candidatas de CA. Si no hay ninguna, se usa la de sin armadura. */
  acFormulas?: AcFormula[];
  /** Escudos y demás sumas planas a la CA, que se aplican **elija la fórmula que elija**. */
  acBonuses?: {
    amount: number;
    labelKey: string;
    sourceType: TraceStep["sourceType"];
    sourceKey: string;
  }[];
  /** La característica de lanzamiento de conjuros, si la clase lanza. */
  spellcastingAbility?: AbilityKey;
}

/**
 * Lo que aporta cada estado de competencia. **Cuatro estados, no tres**: la media competencia
 * suma la mitad redondeando hacia abajo, y con ella el bardo de nivel 2 y el guerrero campeón
 * de nivel 7 dejan de tener una hoja que anuncia una aptitud que no aplica.
 */
export function bonoDeCompetencia(nivel: ProficiencyLevel, prof: number): number {
  switch (nivel) {
    case "expertise":
      return prof * 2;
    case "proficient":
      return prof;
    case "half":
      return Math.floor(prof / 2);
    default:
      return 0;
  }
}

/** SRD 5.1: modificador = redondeo hacia abajo de (puntuación − 10) / 2. */
export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** SRD 5.1: +2 a nivel 1, y uno más cada cuatro niveles. */
export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((level - 1) / 4);
}

/**
 * SRD 5.1: la media de un dado de golpe se redondea **hacia arriba** — un d10 da 6, no 5,5.
 * Es `dado / 2 + 1`.
 */
export function averageHitDie(hitDieSize: number): number {
  return Math.floor(hitDieSize / 2) + 1;
}

export function derive(input: EngineInput): DerivationResult {
  const derived: Record<string, DerivedValue> = {};
  const warnings: DerivationWarning[] = [];

  // --- Características, con sus modificadores de raza y demás ---
  const scores = {} as Record<AbilityKey, number>;
  for (const ability of ABILITY_KEYS) {
    const valor = aplicar(
      `ability.${ability}`,
      {
        total: input.abilities[ability],
        steps: [paso("base", input.abilities[ability], "base", ability, `ability.${ability}.base`)],
      },
      input.modifiers,
    );
    derived[valor.key] = valor;
    scores[ability] = valor.total;
  }

  const mods = {} as Record<AbilityKey, number>;
  for (const ability of ABILITY_KEYS) {
    mods[ability] = abilityModifier(scores[ability]);
    derived[`abilityMod.${ability}`] = {
      key: `abilityMod.${ability}`,
      total: mods[ability],
      steps: [paso("base", mods[ability], "ability", ability, `abilityMod.${ability}`)],
    };
  }

  // --- Competencia ---
  const prof = proficiencyBonus(input.level);
  derived.proficiencyBonus = {
    key: "proficiencyBonus",
    total: prof,
    steps: [paso("base", prof, "level", String(input.level), "proficiencyBonus")],
  };

  // --- CA: se evalúan todas las fórmulas y gana la mayor ---
  derived.ac = calcularCa(input, mods, warnings);

  // --- Iniciativa: el modificador de Destreza, y lo que le sumen ---
  // Estaba en la anatomía de la hoja (§1.6) desde el principio y el motor no la derivaba. Es
  // una línea, y tenerla aquí evita que la pantalla de 2A.10 tenga que volver a tocar el motor.
  derived.initiative = aplicar(
    "initiative",
    {
      total: mods.dex,
      steps: [paso("base", mods.dex, "ability", "dex", "abilityMod.dex")],
    },
    input.modifiers,
  );

  // --- PG máximos ---
  derived.maxHp = calcularPgMaximos(input, mods);

  // --- Salvaciones ---
  for (const ability of ABILITY_KEYS) {
    const competente = input.saveProficiencies.includes(ability);
    const steps: TraceStep[] = [
      paso("base", mods[ability], "ability", ability, `abilityMod.${ability}`),
    ];
    if (competente) steps.push(paso("add", prof, "proficiency", "save", "proficiencyBonus"));
    derived[`save.${ability}`] = aplicar(
      `save.${ability}`,
      { total: mods[ability] + (competente ? prof : 0), steps },
      input.modifiers,
    );
  }

  // --- Habilidades, con los cuatro estados de competencia ---
  for (const [skill, ability] of Object.entries(SKILLS) as [SkillKey, AbilityKey][]) {
    const nivel: ProficiencyLevel = input.skillProficiencies[skill] ?? "none";
    const extra = bonoDeCompetencia(nivel, prof);
    const steps: TraceStep[] = [
      paso("base", mods[ability], "ability", ability, `abilityMod.${ability}`),
    ];
    if (nivel === "proficient")
      steps.push(paso("add", prof, "proficiency", skill, "proficiencyBonus"));
    // **La mitad, redondeando hacia abajo.** Con competencia +3 son +1, no +1,5: la 5.ª edición
    // redondea siempre hacia abajo salvo que diga lo contrario, y esta no lo dice.
    if (nivel === "half")
      steps.push(paso("add", Math.floor(prof / 2), "proficiency", skill, "halfProficiency"));
    // La pericia **duplica** el bonificador; se cuenta como dos pasos para que la traza lo
    // enseñe en vez de esconder un ×2 dentro de un número.
    if (nivel === "expertise") {
      steps.push(paso("add", prof, "proficiency", skill, "proficiencyBonus"));
      steps.push(paso("add", prof, "proficiency", skill, "expertise"));
    }
    derived[`skill.${skill}`] = aplicar(
      `skill.${skill}`,
      { total: mods[ability] + extra, steps },
      input.modifiers,
    );
  }

  // --- Percepción pasiva: 10 + el bono de Percepción. Se usa constantemente en la mesa ---
  const percepcion = derived["skill.perception"].total;
  derived.passivePerception = {
    key: "passivePerception",
    total: 10 + percepcion,
    steps: [
      paso("base", 10, "base", "passive", "passive.base"),
      paso("add", percepcion, "proficiency", "perception", "skill.perception"),
    ],
  };

  // --- Ataques ---
  derived["attack.melee"] = {
    key: "attack.melee",
    total: prof + mods.str,
    steps: [
      paso("base", mods.str, "ability", "str", "abilityMod.str"),
      paso("add", prof, "proficiency", "weapon", "proficiencyBonus"),
    ],
  };
  derived["attack.ranged"] = {
    key: "attack.ranged",
    total: prof + mods.dex,
    steps: [
      paso("base", mods.dex, "ability", "dex", "abilityMod.dex"),
      paso("add", prof, "proficiency", "weapon", "proficiencyBonus"),
    ],
  };

  // --- Conjuros, solo si la clase lanza ---
  if (input.spellcastingAbility) {
    const habilidad = input.spellcastingAbility;
    derived.spellSaveDc = {
      key: "spellSaveDc",
      total: 8 + prof + mods[habilidad],
      steps: [
        paso("base", 8, "base", "spell", "spellSaveDc.base"),
        paso("add", prof, "proficiency", "spellcasting", "proficiencyBonus"),
        paso("add", mods[habilidad], "ability", habilidad, `abilityMod.${habilidad}`),
      ],
    };
    derived["attack.spell"] = {
      key: "attack.spell",
      total: prof + mods[habilidad],
      steps: [
        paso("base", mods[habilidad], "ability", habilidad, `abilityMod.${habilidad}`),
        paso("add", prof, "proficiency", "spellcasting", "proficiencyBonus"),
      ],
    };
  }

  return { derived, warnings };
}

function calcularCa(
  input: EngineInput,
  mods: Record<AbilityKey, number>,
  warnings: DerivationWarning[],
): DerivedValue {
  const sinArmadura: AcFormula = {
    key: "unarmored",
    labelKey: "ac.unarmored",
    base: 10,
    addAbility: "dex",
    sourceType: "base",
    sourceKey: "unarmored",
  };
  const candidatas = input.acFormulas?.length ? input.acFormulas : [sinArmadura];

  const evaluadas = candidatas.map((formula) => {
    const steps: TraceStep[] = [
      paso("base", formula.base, formula.sourceType, formula.sourceKey, formula.labelKey),
    ];
    let total = formula.base;

    if (formula.addAbility) {
      const bruto = mods[formula.addAbility];
      const tope = formula.abilityCap;
      const aplicado = tope === undefined ? bruto : Math.min(bruto, tope);
      steps.push(
        paso("add", aplicado, "ability", formula.addAbility, `abilityMod.${formula.addAbility}`),
      );
      total += aplicado;
      // El recorte se **enseña**: sin este paso, «CA 16» con Destreza 20 parece un error.
      if (tope !== undefined && bruto > tope) {
        steps.push(
          paso(
            "cap",
            aplicado - bruto,
            formula.sourceType,
            formula.sourceKey,
            `ac.cap.${formula.key}`,
          ),
        );
      }
    }
    return { formula, total, steps };
  });

  // Gana la mayor. Empate: la primera, que es el orden en que las dio el catálogo.
  const ganadora = evaluadas.reduce((mejor, actual) =>
    actual.total > mejor.total ? actual : mejor,
  );

  // Las descartadas se devuelven como aviso: «con armadura de cuero tendrías 13». Barato de
  // producir, y en la mesa es justo lo que alguien pregunta.
  for (const otra of evaluadas) {
    if (otra.formula.key === ganadora.formula.key) continue;
    warnings.push({
      // Convencion unica de codigos: minusculas y en ingles, como el resto del codigo.
      // Era `AC_FORMULA_DESCARTADA`, mayusculas y en espanol, y `deriveCharacter` acababa
      // fundiendo dos convenciones incompatibles en una sola lista que la pantalla de
      // 2A.10 tendria que aceptar. Lo cazo la revision del 2026-09-02.
      code: "ac_formula_discarded",
      key: "ac",
      data: { formula: otra.formula.key, labelKey: otra.formula.labelKey, total: otra.total },
    });
  }

  const steps = [...ganadora.steps];
  let total = ganadora.total;
  for (const bono of input.acBonuses ?? []) {
    steps.push(paso("add", bono.amount, bono.sourceType, bono.sourceKey, bono.labelKey));
    total += bono.amount;
  }

  return aplicar("ac", { total, steps }, input.modifiers);
}

function calcularPgMaximos(input: EngineInput, mods: Record<AbilityKey, number>): DerivedValue {
  // SRD 5.1: máximo del dado al nivel 1; a partir de ahí, la media (fallo 5 del plan: media fija
  // por defecto). El modificador de Constitución se suma **en cada nivel**, incluido el primero,
  // y por eso una Constitución baja duele más cuanto más alto es el nivel.
  const primerNivel = input.hitDieSize + mods.con;
  const media = averageHitDie(input.hitDieSize);
  const siguientes = (input.level - 1) * (media + mods.con);

  const steps: TraceStep[] = [
    paso("base", input.hitDieSize, "class", "hit-die", "maxHp.firstLevel"),
    paso("add", mods.con, "ability", "con", "abilityMod.con"),
  ];
  if (input.level > 1) {
    steps.push(
      paso("add", (input.level - 1) * media, "level", String(input.level), "maxHp.perLevel"),
    );
    steps.push(paso("add", (input.level - 1) * mods.con, "ability", "con", "maxHp.conPerLevel"));
  }

  // Un personaje nunca tiene menos de 1 PG por nivel, por mala que sea su Constitución.
  const bruto = primerNivel + siguientes;
  const suelo = input.level;
  if (bruto < suelo) {
    steps.push(paso("override", suelo - bruto, "base", "minimum", "maxHp.minimum"));
    return aplicar("maxHp", { total: suelo, steps }, input.modifiers);
  }

  return aplicar("maxHp", { total: bruto, steps }, input.modifiers);
}

/** Aplica los modificadores que apuntan a esta clave, en orden: primero los `add`, luego los `override`. */
function aplicar(
  key: string,
  partida: { total: number; steps: TraceStep[] },
  modifiers: Modifier[],
): DerivedValue {
  let total = partida.total;
  const steps = [...partida.steps];

  for (const m of modifiers.filter((m) => m.target === key && m.op === "add")) {
    total += m.amount;
    steps.push(paso("add", m.amount, m.sourceType, m.sourceKey, m.labelKey));
  }
  // El `override` va **al final y gana**, porque es lo que significa: la anulación manual del DM
  // no se suma a nada, sustituye el resultado. Si hay varios, gana el último — y eso es una
  // decisión, no un accidente: el orden de la lista lo fija quien la construye.
  for (const m of modifiers.filter((m) => m.target === key && m.op === "override")) {
    steps.push(paso("override", m.amount - total, m.sourceType, m.sourceKey, m.labelKey));
    total = m.amount;
  }

  return { key, total, steps };
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
