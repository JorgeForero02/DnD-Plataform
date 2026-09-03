import {
  ABILITY_KEYS,
  bonoDeCompetenciaPorVd,
  dadoDeGolpeDe,
  vdLegible,
  type AbilityKey,
  type DerivedValue,
  type ProficiencyLevel,
  type SkillKey,
  type Statblock,
  type TraceStep,
} from "@dnd/shared";

/**
 * Fase 2D — las tres derivaciones en las que un monstruo contradice a una hoja de personaje.
 *
 * Todo lo demás del motor sirve igual para los dos: las salvaciones, las dieciocho habilidades
 * con sus cuatro estados de competencia, la percepción pasiva, los sentidos, las velocidades y
 * los bonos de ataque salen de la misma cuenta. Lo que cambia es de dónde vienen **tres**
 * números de partida, y por eso esto es un fichero pequeño al lado del motor y no un motor
 * paralelo. Un segundo motor para PNJ sería el mismo error que un segundo modelo de estado:
 * dos copias que se desincronizan el día que alguien arregla un fallo en una sola.
 *
 * Ver `docs/superpowers/specs/2026-09-03-fase-2D-alcance-design.md`, §4.
 */

/** Lo que el motor necesita saber de un statblock para derivar por el camino de monstruo. */
export interface MonsterInput {
  /** Valor de desafío. De aquí sale el bonificador de competencia. */
  cr: number;
  /** La CA **dicha** por el statblock. No se deriva de ninguna fórmula de armadura. */
  ac: number;
  /** El paréntesis del libro: «armadura de cuero, escudo», «armadura natural». */
  acNote?: string;
  hitDiceCount: number;
  hitDieSize: number;
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
 * El bonificador de competencia de un PNJ, con su traza.
 *
 * El paso dice **«desafío 1/4»** y no «nivel 0», que es lo que se vería si se colase un monstruo
 * por el camino del personaje. La mesa pregunta de dónde sale el número y esta es la respuesta
 * verdadera.
 */
export function competenciaDeMonstruo(monster: MonsterInput): DerivedValue {
  const prof = bonoDeCompetenciaPorVd(monster.cr);
  return {
    key: "proficiencyBonus",
    total: prof,
    steps: [paso("base", prof, "challenge", vdLegible(monster.cr), "proficiencyBonus.byChallenge")],
  };
}

/**
 * La CA de un PNJ: **el número que dice el statblock**, con la nota del libro como origen.
 *
 * No se evalúan fórmulas de armadura y no se suma la Destreza. Un goblin tiene CA 15 porque el
 * libro dice 15; reconstruirlo como «11 de cuero + 2 de escudo + 2 de Destreza» obligaría a
 * inventarle un inventario a cada monstruo para que la cuenta saliera, y el día que no saliera
 * —que es la mitad de los monstruos con armadura natural— habría que mentir en la ficha. Es
 * exactamente la razón por la que existen las anulaciones manuales de 2A.
 *
 * La nota del libro viaja en `sourceKey` para que la traza pueda decir *«15, armadura de cuero y
 * escudo»* sin que el motor tenga que entender qué es un escudo.
 */
export function caDeMonstruo(monster: MonsterInput): { total: number; steps: TraceStep[] } {
  return {
    total: monster.ac,
    steps: [paso("base", monster.ac, "statblock", monster.acNote ?? "stated", "ac.statblock")],
  };
}

/**
 * Los PG máximos de un PNJ: la media de sus dados de golpe **más el modificador de Constitución
 * una vez por cada dado**.
 *
 * El SRD imprime «PG 59 (7d10 + 21)» y la Constitución **no está dentro de la fórmula de
 * dados**: el +21 es el modificador (+3) repetido siete veces, una por dado. Sumarlo una sola
 * vez —que es lo que parece natural leyendo «7d10 + 21»— da 48 en vez de 59, y es la primera
 * mutación que se probó contra este bloque: trece pruebas en rojo.
 *
 * La media de un dado se redondea **hacia abajo sobre el total**, no dado a dado. Con 1d8 el
 * libro dice 4, no 5.
 */
export function pgDeMonstruo(
  monster: MonsterInput,
  modCon: number,
): { total: number; steps: TraceStep[] } {
  const mediaDeLosDados = Math.floor((monster.hitDiceCount * (monster.hitDieSize + 1)) / 2);
  const porConstitucion = modCon * monster.hitDiceCount;

  const steps: TraceStep[] = [
    paso(
      "base",
      mediaDeLosDados,
      "statblock",
      `${monster.hitDiceCount}d${monster.hitDieSize}`,
      "maxHp.hitDiceAverage",
    ),
  ];
  if (porConstitucion !== 0) {
    steps.push(paso("add", porConstitucion, "ability", "con", "maxHp.conPerHitDie"));
  }

  // Una criatura no baja de 1 PG por muy mala que sea su Constitución, igual que un personaje.
  const bruto = mediaDeLosDados + porConstitucion;
  if (bruto < 1) {
    steps.push(paso("override", 1 - bruto, "base", "minimum", "maxHp.minimum"));
    return { total: 1, steps };
  }
  return { total: bruto, steps };
}

/**
 * El puente: de un statblock a lo que el motor come.
 *
 * **La única puerta.** Igual que `items-srd.ts` traduce una vez qué ranura ocupa una espada,
 * esto traduce una vez qué es un statblock para el motor, y nadie más vuelve a decidir que el
 * nivel de un PNJ es 0. Los `modifiers` se pasan por fuera porque un PNJ también puede llevar
 * equipo y anulaciones del DM, y esos ya los resuelve el carril de siempre.
 */
export function entradaDeMotorDe(statblock: Statblock): {
  abilities: Record<AbilityKey, number>;
  level: number;
  hitDieSize: number;
  saveProficiencies: AbilityKey[];
  skillProficiencies: Partial<Record<SkillKey, ProficiencyLevel>>;
  darkvisionFeet: number;
  baseSpeeds: Statblock["speeds"];
  monster: MonsterInput;
} {
  const abilities = {} as Record<AbilityKey, number>;
  for (const a of ABILITY_KEYS) abilities[a] = statblock.abilities[a];

  return {
    abilities,
    // **Cero a propósito, y comprobado.** Un PNJ no tiene nivel ni dado de golpe de clase; si
    // alguno llegara con valor, `comprobarEntradaDeMonstruo` lanza en vez de derivar a medias.
    level: 0,
    hitDieSize: 0,
    saveProficiencies: [...statblock.saveProficiencies],
    skillProficiencies: { ...statblock.skillProficiencies } as Partial<
      Record<SkillKey, ProficiencyLevel>
    >,
    darkvisionFeet: statblock.darkvisionFeet ?? 0,
    baseSpeeds: statblock.speeds,
    monster: {
      cr: statblock.cr,
      ac: statblock.ac,
      acNote: statblock.acNote,
      hitDiceCount: statblock.hitDiceCount,
      hitDieSize: dadoDeGolpeDe(statblock),
    },
  };
}

/**
 * Rechaza una entrada que mezcle las dos formas, **en vez de elegir una rama en silencio**.
 *
 * `Character` pasa a tener dos formas a partir de 2D —la de clase y nivel, y la de statblock— y
 * la especificación de alcance lo marcó como el riesgo de datos de la fase: toda derivación que
 * asuma la primera es un fallo esperando. Un PNJ con `level: 3` colado por descuido derivaría su
 * competencia del nivel y nadie se enteraría, porque el número seguiría siendo plausible.
 */
export function comprobarEntradaDeMonstruo(input: {
  monster?: MonsterInput;
  level: number;
  hitDieSize: number;
  acFormulas?: unknown[];
  spellcastingAbility?: string;
}): void {
  if (!input.monster) return;
  const conflictos: string[] = [];
  if (input.level !== 0) conflictos.push(`level=${input.level}`);
  if (input.hitDieSize !== 0) conflictos.push(`hitDieSize=${input.hitDieSize}`);
  if (input.acFormulas?.length) conflictos.push(`acFormulas=${input.acFormulas.length}`);
  if (input.spellcastingAbility)
    conflictos.push(`spellcastingAbility=${input.spellcastingAbility}`);
  if (conflictos.length > 0) {
    throw new Error(
      `derive: entrada mixta — se pasó un statblock y además datos de personaje (${conflictos.join(", ")}). ` +
        "Un PNJ deriva por su statblock: nivel y dado de golpe van a 0, la CA la dice el statblock y no una fórmula.",
    );
  }
}
