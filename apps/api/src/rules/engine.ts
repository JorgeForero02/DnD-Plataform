import {
  ABILITY_KEYS,
  SKILLS,
  type AbilityKey,
  type DerivationResult,
  type DerivationWarning,
  type DerivedValue,
  type Movement,
  type Origen,
  type ProficiencyLevel,
  type SkillKey,
  type TraceStep,
} from "@dnd/shared";
import {
  caDeMonstruo,
  competenciaDeMonstruo,
  comprobarEntradaDeMonstruo,
  pgDeMonstruo,
  type MonsterInput,
} from "./monster";

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
  /**
   * Ticket J7 (2026-09-11) — el motivo que el DM escribió al fijar una anulación. Solo lo
   * lleva un modificador `override` construido desde `modificadoresDeAnulacion`; `aplicar()` lo
   * copia tal cual al `TraceStep` que genera, sin tocar ningún otro `op`.
   */
  reason?: string;
}

/**
 * Una fórmula candidata de CA. **Se evalúan todas y gana la mayor** — que es exactamente lo que
 * dicen las reglas y lo que un modelo aditivo se salta.
 */
/** Una característica que suma a una fórmula de CA, con **su** tope. */
export interface AcAbility {
  ability: AbilityKey;
  /**
   * Tope **de esta característica**. `0` en armadura pesada (**no suma nada**), `2` en media,
   * `undefined` en ligera o sin armadura (**sin tope**).
   *
   * **Es por característica y no de la fórmula entera**, y esa es la diferencia que trajo la
   * Defensa sin armadura: una fórmula puede topar la Destreza y no topar la otra. Un tope global
   * habría obligado a elegir entre las dos.
   *
   * **Entero y no negativo.** El tipo no lo puede decir, pero quien lo alimenta sí lo acota
   * (`dexCap` en `packages/shared/src/item.schema.ts` es entero de 0 a 10). Un `cap` negativo
   * entraría por el `Math.min` y **restaría**; uno fraccionario daría una CA con decimales.
   */
  cap?: number;
}

export interface AcFormula {
  key: string;
  labelKey: string;
  /** El número del que parte: 10 sin armadura, 16 con cota de malla. */
  base: number;
  /**
   * Qué características suman. **Vacío o ausente = la fórmula es un número pelado.**
   *
   * Eran una sola (`addAbility` + `abilityCap`) hasta el 2026-09-06, y con una no cabía ninguna
   * de las dos Defensas sin armadura del SRD 5.1 — la del bárbaro es *«10 + your Dexterity
   * modifier + your Constitution modifier»* y la del monje *«10 + your Dexterity modifier + your
   * Wisdom modifier»*—, así que un bárbaro salía con **la CA más baja de lo que le toca y con la
   * traza convincente al lado**. Los dos campos viejos **no se conservan como alias**: dos formas
   * de decir lo mismo es como se cuela un tope aplicado dos veces.
   */
  addAbilities?: AcAbility[];
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
   * Fase 2D. **Cuando viene, el motor deriva por el camino de monstruo**: la competencia sale
   * del valor de desafío, la CA la dice el statblock y los PG salen de la fórmula de dados.
   *
   * Es opcional y no un tipo aparte a propósito: todo lo demás —salvaciones, las dieciocho
   * habilidades, percepción pasiva, sentidos, velocidades, bonos de ataque— se deriva igual para
   * un PNJ que para un personaje, y partir `EngineInput` en dos habría duplicado esa mitad. Lo
   * que evita la mezcla silenciosa no es el tipo: es `comprobarEntradaDeMonstruo`, que **lanza**
   * si llegan las dos formas a la vez.
   */
  monster?: MonsterInput;
  /**
   * Velocidades **base**, en pies, antes de objetos: caminar, trepar, nadar, volar, excavar.
   * Igual que las características, entra premezclada con la raza pero **no** con el equipo — un
   * objeto que cambie la velocidad entra como modificador (carril A2, `rules/items.ts`), no
   * sumado aquí, para que la traza pueda enseñar de dónde sale cada pie.
   */
  baseSpeeds?: Partial<Record<Movement, number>>;
  /**
   * Reglas de la mesa (E-RM-3): los PG **decididos** para los niveles 2..(1+length) al nacer — la
   * tirada o el máximo del dado, sin Constitución. Sustituyen a la media solo en esos niveles;
   * los niveles por encima (subidos después con `level-up`) siguen con la media.
   */
  hitPointsPerLevel?: number[];
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

/**
 * Lo que necesita `resolverOrigen` para resolver un `Origen`. **No lee el catálogo de clases**:
 * las tablas de escala llegan ya resueltas en `escalas`. Sin esta separación, probar `escala`
 * habría exigido los datos reales de una clase antes de que existieran (tarea A10, que ya los
 * declara en `catalog/classes.ts` y los trae hasta aquí con `tablaDeEscalas`, más abajo).
 */
export interface ContextoDeDerivacion {
  abilities: Record<AbilityKey, number>;
  level: number;
  /** La característica de lanzamiento de quien usa la actividad, si su clase lanza. */
  spellcastingAbility?: AbilityKey;
  /** El nivel del espacio con el que se lanzó, cuando aplica. */
  nivelDeEspacio?: number;
  /** La CD de conjuro ya derivada — `spellSaveDc` sale del motor con su traza. */
  cdDeConjuro?: number;
  /** Tramos por clave: `[{ desde: 1, valor: 2 }, { desde: 9, valor: 3 }]`. La llena A10. */
  escalas: ReadonlyMap<string, readonly { desde: number; valor: number }[]>;
}

/**
 * Convierte las tablas de escala del catálogo (un `Record` por clave, tarea A10) en el
 * `ReadonlyMap` que `ContextoDeDerivacion.escalas` espera. **Es la única puerta**: sin ella,
 * cada consumidor (`resolve.ts` hoy; `ActivitiesService`, mañana) construiría su propio mapa a
 * mano, y dos formas de decir «esta clave tiene estos tramos» es exactamente cómo una tabla de
 * escala y su copia acaban discrepando.
 *
 * Vive aquí y no en el catálogo porque es la forma del CONTEXTO del motor, no un dato del SRD:
 * el catálogo declara sus tramos como el `Record` que le es natural a una clase con varias
 * tablas propias (`SrdClass.scales`), y esta función es la traducción a lo que `resolverOrigen`
 * sabe leer. El motor sigue sin importar nada de `catalog/` — es `catalog/resolve.ts` quien
 * llama a esto, nunca al revés.
 */
export function tablaDeEscalas(
  tablas: Record<string, readonly { desde: number; valor: number }[]>,
): ContextoDeDerivacion["escalas"] {
  return new Map(Object.entries(tablas));
}

/**
 * La puntuación de una característica, **comprobada**. `EngineInput.abilities` la exige por el
 * tipo, pero `ContextoDeDerivacion` la arma quien llama —a veces con datos de la base, un
 * statblock incompleto o un PNJ importado a medias—, y ahí el tipo ya no protege nada en tiempo
 * de ejecución. Sin esta guarda, una puntuación ausente entra en `abilityModifier` como
 * `undefined` y sale `NaN`: exactamente el mismo fallo convertido en número creíble que
 * `resolverOrigen` existe para evitar, solo que aplazado hasta que alguien intente sumar ese
 * `NaN` o validarlo con `traceStepSchema`.
 */
function puntuacionDeCaracteristica(ctx: ContextoDeDerivacion, ability: AbilityKey): number {
  const puntuacion = ctx.abilities[ability];
  if (typeof puntuacion !== "number" || !Number.isFinite(puntuacion)) {
    throw new Error(`Este contexto no trae la puntuación de "${ability}".`);
  }
  return puntuacion;
}

/**
 * Resuelve un `Origen` a su valor y **deja su paso en la traza** — nunca un número pelado. Es la
 * frontera con Foundry: donde ellos evalúan una cadena como `"@mod + 2"` y `simplifyBonus`
 * devuelve 0 en silencio si algo no evalúa, aquí un origen que no se puede resolver **lanza**.
 * Un fallo convertido en un número creíble es peor que una excepción.
 *
 * **Todos los pasos que produce son `op: "base"`.** `resolverOrigen` no sabe si a este valor lo
 * va a acompañar otro en la misma fórmula (una tirada de daño suma `modificador` + `competencia`)
 * o si lo sustituye por completo: eso lo decide quien compone la actividad, no esta función. Es
 * responsabilidad de quien consuma este paso reetiquetar el `op` a `"add"` cuando lo inserte
 * junto a otros — igual que hace `derive()` al construir sus propios `TraceStep` a mano. Dejarlo
 * aquí en `"base"` sin decir esto habría sido una trampa para A5/A6, que sí componen varios
 * orígenes en una sola fórmula.
 */
export function resolverOrigen(
  origen: Origen,
  ctx: ContextoDeDerivacion,
): { valor: number; paso: TraceStep } {
  switch (origen.tipo) {
    case "fijo":
      return {
        valor: origen.valor,
        paso: paso("base", origen.valor, "base", "fixed", "fixedValue"),
      };

    case "modificador": {
      const valor = abilityModifier(puntuacionDeCaracteristica(ctx, origen.ability));
      return {
        valor,
        paso: paso("base", valor, "ability", origen.ability, `abilityMod.${origen.ability}`),
      };
    }

    case "competencia": {
      const valor = proficiencyBonus(ctx.level);
      return { valor, paso: paso("base", valor, "proficiency", "activity", "proficiencyBonus") };
    }

    case "escala": {
      const tramos = ctx.escalas.get(origen.clave);
      if (!tramos || tramos.length === 0) {
        throw new Error(`No hay tabla de escala para "${origen.clave}".`);
      }
      // Un nivel por DEBAJO del primer tramo no tiene respuesta: la tabla no dice nada sobre
      // ese nivel, y ahí sí hay que lanzar en vez de fingir un cero (la lección de siempre).
      const aplicables = tramos.filter((tramo) => tramo.desde <= ctx.level);
      if (aplicables.length === 0) {
        throw new Error(`La tabla de escala "${origen.clave}" no cubre el nivel ${ctx.level}.`);
      }
      // **Por ENCIMA del último tramo no hay guarda, y es a propósito — no es el mismo agujero
      // que el de abajo (vuelta de arreglo 2).** Un tramo declara «desde aquí», no «solo aquí»:
      // se EXTIENDE hacia arriba hasta el siguiente tramo, o hasta el final de la progresión si
      // no hay ninguno más. Es literalmente la razón de ser de una tabla por tramos y no de
      // veinte filas (tarea A10) — el daño de Furia es `1→+2, 9→+3, 16→+4`, y a nivel 20 son
      // **+4** precisamente porque el tramo de 16 sigue vigente. Si esta rama lanzara por encima
      // del último tramo, todo bárbaro de nivel 17 a 20 haría reventar su propia hoja al intentar
      // leer su daño de Furia — el «arreglo» sería mucho peor que lo que corrige.
      //
      // El nivel 20 de la Furia («Unlimited») **no es un valor de esta tabla**: el SRD no dice
      // «un número más alto», dice que deja de haber tope, y eso es la AUSENCIA de un valor, no
      // uno. Por eso vive en `ItemGrant.usos.sinTopeDesde` (`catalog/types.ts`) y se resuelve
      // ANTES de llegar aquí (`resolve.ts`, `concederActividadDe`): esta función sigue sin saber
      // decir «sin límite», y no tiene que aprender — la tabla se queda solo con números.
      //
      // El tramo que aplica es el de mayor `desde` que no supere el nivel — **no** el de mayor
      // `valor`, y **no** el último del array. La tabla es una lista sin garantía de orden ni de
      // monotonía (nada en el tipo obliga a que un `desde` mayor traiga un `valor` mayor), así
      // que las tres reglas («mayor `desde`», «mayor `valor`», «último elemento») solo coinciden
      // por casualidad en una tabla creciente y bien ordenada.
      const tramo = aplicables.reduce((mejor, actual) =>
        actual.desde > mejor.desde ? actual : mejor,
      );
      return {
        valor: tramo.valor,
        paso: paso("base", tramo.valor, "class", origen.clave, `scale.${origen.clave}`),
      };
    }

    case "lanzamiento": {
      // Un conjuro no puede nombrar una característica concreta: depende de la clase de quien
      // lo lanza. Un no-lanzador usando una actividad de conjuro es un fallo de datos, no un
      // modificador de cero.
      if (!ctx.spellcastingAbility) {
        throw new Error("Este contexto no tiene característica de lanzamiento.");
      }
      const habilidad = ctx.spellcastingAbility;
      const valor = abilityModifier(puntuacionDeCaracteristica(ctx, habilidad));
      return {
        valor,
        paso: paso("base", valor, "ability", habilidad, `abilityMod.${habilidad}`),
      };
    }

    case "nivelDeEspacio": {
      if (ctx.nivelDeEspacio === undefined) {
        throw new Error("Este contexto no trae el nivel del espacio con el que se lanzó.");
      }
      return {
        valor: ctx.nivelDeEspacio,
        paso: paso("base", ctx.nivelDeEspacio, "level", "spellSlot", "spellSlotLevel"),
      };
    }

    case "cdDeConjuro": {
      if (ctx.cdDeConjuro === undefined) {
        throw new Error("Este contexto no trae una CD de conjuro derivada.");
      }
      // `"base"` y no `"class"`: desde una actividad, `spellSaveDc` es un valor ya derivado que
      // se toma como dado, no una regla de clase. `derive()` la construye con pasos `"base"`,
      // `"proficiency"` y `"ability"` — ninguno dice `"class"` — y el paso aquí apunta a la
      // clave de ese valor derivado, no a una fuente nueva.
      return {
        valor: ctx.cdDeConjuro,
        paso: paso("base", ctx.cdDeConjuro, "base", "spellSaveDc", "spellSaveDc"),
      };
    }

    default: {
      // Exhaustivo en compilación (TypeScript reduce `origen` a `never` aquí porque las siete
      // variantes de arriba ya cubren la unión) y una guarda real en ejecución: un `tipo` que
      // llegó sin pasar por `origenSchema.parse` —JSON crudo de la base, un PNJ importado a
      // medias— no cae en un `undefined` mudo, lanza con el `tipo` que trajo.
      const comoLlego = origen as unknown as { tipo?: unknown };
      throw new Error(`Origen con tipo desconocido: "${String(comoLlego.tipo)}".`);
    }
  }
}

export function derive(input: EngineInput): DerivationResult {
  // Antes de nada: una entrada que mezcle statblock y hoja de personaje se rechaza, no se
  // resuelve eligiendo una rama. Ver `monster.ts`.
  comprobarEntradaDeMonstruo(input);

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

  // --- Competencia: del nivel si es un personaje, del valor de desafío si es un PNJ ---
  derived.proficiencyBonus = input.monster
    ? competenciaDeMonstruo(input.monster)
    : {
        key: "proficiencyBonus",
        total: proficiencyBonus(input.level),
        steps: [
          paso(
            "base",
            proficiencyBonus(input.level),
            "level",
            String(input.level),
            "proficiencyBonus",
          ),
        ],
      };
  const prof = derived.proficiencyBonus.total;

  // --- CA: la dice el statblock si es un PNJ; si no, se evalúan las fórmulas y gana la mayor ---
  //
  // El PNJ pasa igualmente por `aplicar`, y eso importa: una anulación manual del DM sobre la CA
  // de un monstruo tiene que seguir funcionando y saliendo en la traza con su delta.
  derived.ac = input.monster
    ? aplicar("ac", caDeMonstruo(input.monster), input.modifiers)
    : calcularCa(input, mods, warnings);

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

  // --- PG máximos: por fórmula de dados si es un PNJ, por clase y nivel si es un personaje ---
  derived.maxHp = input.monster
    ? aplicar("maxHp", pgDeMonstruo(input.monster, mods.con), input.modifiers)
    : calcularPgMaximos(input, mods);

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
  //
  // Ronda 2 de revisión (2026-09-11) — pasa por `aplicar()`, como cualquier otra clave
  // derivada. Hasta esta ficha se construía el objeto a mano y una anulación del DM apuntada a
  // `passivePerception` (una de las cinco de `OVERRIDABLE_KEYS`) no hacía nada: el motor nunca
  // miraba `input.modifiers` para esta clave. El ticket J7 es "la anulación del DM funciona y
  // enseña su motivo"; una clave anulable que el motor ignora contradice eso.
  const percepcion = derived["skill.perception"].total;
  derived.passivePerception = aplicar(
    "passivePerception",
    {
      total: 10 + percepcion,
      steps: [
        paso("base", 10, "base", "passive", "passive.base"),
        paso("add", percepcion, "proficiency", "perception", "skill.perception"),
      ],
    },
    input.modifiers,
  );

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
    addAbilities: [{ ability: "dex" }],
    sourceType: "base",
    sourceKey: "unarmored",
  };
  const candidatas = input.acFormulas?.length ? input.acFormulas : [sinArmadura];

  const evaluadas = candidatas.map((formula) => {
    // **Una característica no se suma dos veces**, y esto es la misma guardia que justificó no
    // dejar `addAbility` como alias: dos formas de decir lo mismo es como se cuela un valor
    // aplicado dos veces. Con el array, el peligro se mudó dentro del array — y una traza con la
    // Destreza repetida **cuadra**, así que ningún invariante de los que hay lo cazaría.
    const nombradas = (formula.addAbilities ?? []).map((a) => a.ability);
    if (new Set(nombradas).size !== nombradas.length) {
      throw new Error(
        `La fórmula de CA "${formula.key}" suma la misma característica más de una vez.`,
      );
    }
    const steps: TraceStep[] = [
      paso("base", formula.base, formula.sourceType, formula.sourceKey, formula.labelKey),
    ];
    let total = formula.base;

    // **Un paso por característica.** Recorrer aquí en vez de sumar antes es lo que hace que la
    // traza enseñe «+2 por Destreza» y «+3 por Constitución» por separado, que es lo que alguien
    // pregunta en la mesa cuando no le cuadra su CA.
    for (const suma of formula.addAbilities ?? []) {
      const bruto = mods[suma.ability];
      const tope = suma.cap;
      // **Un tope de 0 significa «no suma», no «suma como mucho cero».** La diferencia solo se
      // ve con una Destreza mala: el SRD dice que la armadura pesada *no te deja sumar* el
      // modificador, y `Math.min(−1, 0)` lo dejaba **restar**. Un enano con Destreza 8 y
      // armadura de placas salía con CA 17 donde el manual da 18, con la traza enseñándolo como
      // si fuera correcto. En ligera y media sí se suma un modificador negativo: ahí la regla es
      // «suma, hasta un máximo», y un máximo no es un suelo. Lo encontró la auditoría de
      // mecánica de 2B.
      const aplicado = tope === undefined ? bruto : tope === 0 ? 0 : Math.min(bruto, tope);
      // **El paso de la característica lleva el modificador BRUTO, y el recorte va aparte.**
      // Antes llevaba el ya recortado y además se añadía el paso del recorte, así que la traza
      // contaba el tope dos veces: con cota de malla y Destreza 12 la hoja decía «CA 16» y su
      // propia explicación sumaba 15. Nadie lo vio en 2A porque **nada alimentaba la armadura
      // todavía**; apareció al enchufar el inventario de 2B, que es exactamente para lo que
      // sirve enchufar cosas. Ahora los pasos suman el total, que es lo mínimo que se le puede
      // pedir a una explicación.
      steps.push(paso("add", bruto, "ability", suma.ability, `abilityMod.${suma.ability}`));
      total += aplicado;
      // El recorte se **enseña**: sin este paso, «CA 16» con Destreza 20 parece un error. La
      // condición es «el aplicado no es el bruto», no «el bruto se pasa del tope»: con armadura
      // pesada y Destreza 8 el aplicado (0) tampoco es el bruto (−1), y sin este paso la traza
      // sumaba 17 debajo de un 18.
      if (aplicado !== bruto) {
        steps.push(
          paso(
            "cap",
            aplicado - bruto,
            formula.sourceType,
            formula.sourceKey,
            // **El paso nombra la característica recortada, no solo la fórmula.** Con el tope
            // por característica, dos topes distintos en la misma fórmula producían dos pasos
            // indistinguibles —misma `op`, misma `labelKey`, mismo origen— y la pantalla los
            // traducía **los dos** como «Tope de Destreza», que sería el texto mintiendo sobre
            // una regla del servidor. Hoy no es alcanzable (solo la armadura topa, y solo la
            // Destreza); era una mina armada para el paso 2. La traza se deriva al leer, así que
            // cambiar el formato no migra nada.
            `ac.cap.${formula.key}.${suma.ability}`,
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
  const fijados = (input.hitPointsPerLevel ?? []).slice(0, Math.max(0, input.level - 1));
  const nivelesConMedia = input.level - 1 - fijados.length;
  const sumaFijada = fijados.reduce((s, v) => s + v, 0);
  const siguientes = sumaFijada + nivelesConMedia * media + (input.level - 1) * mods.con;

  const steps: TraceStep[] = [
    paso("base", input.hitDieSize, "class", "hit-die", "maxHp.firstLevel"),
    paso("add", mods.con, "ability", "con", "abilityMod.con"),
  ];
  if (fijados.length > 0) {
    steps.push(paso("add", sumaFijada, "level", "creation", "maxHp.perLevelAtCreation"));
  }
  if (nivelesConMedia > 0) {
    steps.push(
      paso("add", nivelesConMedia * media, "level", String(input.level), "maxHp.perLevel"),
    );
  }
  if (input.level > 1) {
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
 * equipo antes de que exista una hoja derivada.
 *
 * **Y es de verdad el único sitio donde vive esa regla**: `aplicar()` —el camino con traza—
 * llama a esta función para el número y solo se ocupa de los pasos. La primera versión de este
 * comentario decía «solo puede vivir en un sitio» mientras las dos funciones la implementaban
 * por separado; lo cazó la auditoría de documentación de 2B, y se arregló el código en vez del
 * comentario, que era lo que la frase prometía.
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
  const steps = [...partida.steps];
  let corriendo = partida.total;

  for (const m of modifiers.filter((m) => m.target === key && m.op === "add")) {
    corriendo += m.amount;
    steps.push(paso("add", m.amount, m.sourceType, m.sourceKey, m.labelKey));
  }
  // El `override` va **al final y gana**, porque es lo que significa: la anulación manual del DM
  // no se suma a nada, sustituye el resultado. Si hay varios, gana el último — y eso es una
  // decisión, no un accidente: el orden de la lista lo fija quien la construye. El paso guarda
  // el **delta** para que la traza siga sumando el total.
  for (const m of modifiers.filter((m) => m.target === key && m.op === "override")) {
    steps.push(
      paso("override", m.amount - corriendo, m.sourceType, m.sourceKey, m.labelKey, m.reason),
    );
    corriendo = m.amount;
  }

  // **El número lo decide `totalConModificadores`, no este bucle.** Aquí se arman los pasos; la
  // regla de qué gana vive una sola vez, y así las dos formas de preguntarla no pueden discrepar.
  return { key, total: totalConModificadores(partida.total, key, modifiers), steps };
}

function paso(
  op: TraceStep["op"],
  amount: number,
  sourceType: TraceStep["sourceType"],
  sourceKey: string,
  labelKey: string,
  reason?: string,
): TraceStep {
  return { op, amount, sourceType, sourceKey, labelKey, ...(reason ? { reason } : {}) };
}
