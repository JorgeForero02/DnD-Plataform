import {
  ABILITY_KEYS,
  SKILLS,
  type AbilityKey,
  type DerivationResult,
  type DerivationWarning,
  type DerivedValue,
  type Movement,
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
  /**
   * Visión en la oscuridad **en pies**, de la raza. `0` o ausente = no ve en la oscuridad.
   *
   * Está aquí y no solo en el catálogo porque la mesa pregunta *«¿tú ves en la oscuridad?»* y la
   * hoja tiene que contestar sin que nadie mire una tabla. **Es un sentido, no una regla de
   * iluminación**: dice cuánto alcanza la vista, no qué hay iluminado — eso necesita posiciones
   * y es la fase 3 (ver la especificación de distancias, §12 bis).
   */
  darkvisionFeet?: number;
  /**
   * Velocidades **base**, en pies, antes de objetos: caminar, trepar, nadar, volar, excavar.
   * Igual que las características, entra premezclada con la raza pero **no** con el equipo — un
   * objeto que cambie la velocidad entra como modificador (carril A2, `rules/items.ts`), no
   * sumado aquí, para que la traza pueda enseñar de dónde sale cada pie.
   */
  baseSpeeds?: Partial<Record<Movement, number>>;
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

  // --- Sentidos ---
  derived["senses.darkvision"] = aplicar(
    "senses.darkvision",
    {
      total: input.darkvisionFeet ?? 0,
      steps: [paso("base", input.darkvisionFeet ?? 0, "race", "darkvision", "senses.darkvision")],
    },
    input.modifiers,
  );

  // --- Velocidades: la base de la raza más lo que sumen (o resten) los objetos, con traza ---
  //
  // Antes salían planas de `resolve.ts` (`ResolvedBuild.speeds`), sin traza: un objeto que
  // cambiara la velocidad habría sido un número sin origen, justo lo que esta traza existe
  // para evitar. Se recorren las claves de `baseSpeeds` **y** las que solo aparecen como
  // modificador (un anillo de vuelo en una raza sin velocidad de vuelo no tiene base, pero sí
  // tiene que poder derivarse desde 0).
  const clavesDeVelocidad = new Set<Movement>(Object.keys(input.baseSpeeds ?? {}) as Movement[]);
  for (const m of input.modifiers) {
    if (m.target.startsWith("speed."))
      clavesDeVelocidad.add(m.target.slice("speed.".length) as Movement);
  }
  for (const movimiento of clavesDeVelocidad) {
    const base = input.baseSpeeds?.[movimiento] ?? 0;
    derived[`speed.${movimiento}`] = aplicar(
      `speed.${movimiento}`,
      {
        total: base,
        steps: [paso("base", base, "race", movimiento, `speed.${movimiento}.base`)],
      },
      input.modifiers,
    );
  }

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
      // **El paso de la característica lleva el modificador BRUTO, y el recorte va aparte.**
      // Antes llevaba el ya recortado y además se añadía el paso del recorte, así que la traza
      // contaba el tope dos veces: con cota de malla y Destreza 12 la hoja decía «CA 16» y su
      // propia explicación sumaba 15. Nadie lo vio en 2A porque **nada alimentaba la armadura
      // todavía**; apareció al enchufar el inventario de 2B, que es exactamente para lo que
      // sirve enchufar cosas. Ahora los pasos suman el total, que es lo mínimo que se le puede
      // pedir a una explicación.
      steps.push(
        paso("add", bruto, "ability", formula.addAbility, `abilityMod.${formula.addAbility}`),
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

/**
 * El total de una clave tras sus modificadores, **sin traza** — la misma regla que `aplicar()`
 * (primero los `add`, luego el `override` que gana), para cuando hace falta el número y no el
 * paso a paso.
 *
 * Existe para `resolve.ts`: `ResolvedBuild.speeds` es un mapa de números, no de `DerivedValue`
 * con traza (esa forma no cambia, la fija 2A.3), así que necesita el total ya aplicado el
 * equipo antes de que exista una hoja derivada. Reutiliza esta función en vez de sumar los
 * modificadores a mano — es la misma regla que `derive()`, y solo puede vivir en un sitio.
 */
export function totalConModificadores(base: number, key: string, modifiers: Modifier[]): number {
  let total = base;
  for (const m of modifiers.filter((m) => m.target === key && m.op === "add")) total += m.amount;
  const overrides = modifiers.filter((m) => m.target === key && m.op === "override");
  if (overrides.length > 0) total = overrides[overrides.length - 1].amount;
  return total;
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
