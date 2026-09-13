// Tarea 2A.3 — la forma del catálogo SRD 5.1.
//
// **Atribución:** los datos de este directorio proceden del System Reference Document 5.1,
// © Wizards of the Coast LLC, bajo licencia CC BY 4.0. Texto completo del aviso, y la nota de
// modificación (reorganizados como datos estructurados; **los nombres son los de la traducción
// oficial al español de Wizards, no una traducción nuestra**), en `NOTICE.md` de la raíz.
//
// **Esto es una forma, no datos.** Los datos viven en `races.ts`, `classes.ts` y `armor.ts`.
// El motor (`../engine.ts`) no importa nada de aquí: recibe modificadores ya resueltos, y esa
// separación es lo que permite que un fallo de transcripción no parezca un fallo del motor.

import type {
  AbilityKey,
  Actividad,
  DamageModifier,
  Origen,
  ProficiencyLevel,
  ResourceReset,
  SkillKey,
} from "@dnd/shared";
import type { SpellProgression } from "./spell-slots";

/**
 * De dónde sale un trozo de contenido. **Existe desde 2A aunque en 2A solo haya una rama**:
 * el homebrew por campaña de 2B añade la suya sin que el motor cambie ni una línea, que es
 * justo el objetivo (§4.1 del plan de 2A).
 */
export type ContentRef = { source: "SRD"; key: string } | { source: "CAMPAIGN"; id: string };

/** Los seis tamaños del SRD; en 2A solo se usan Pequeño y Mediano. */
export type CreatureSize = "TINY" | "SMALL" | "MEDIUM" | "LARGE" | "HUGE" | "GARGANTUAN";

/**
 * Una concesión del catálogo: lo que una raza, una subraza o una clase te dan. Puede estar
 * **fija** (`+2 Constitución`) o **pendiente de elección** (`+1 a dos características`).
 *
 * No es un `Modifier` del motor: el motor solo entiende los fijos. Traducir concesiones a
 * modificadores es trabajo del resolutor (`resolve.ts`), y las que llevan elección **no se
 * traducen** hasta que 2A.4 añada la fila de elección que las resuelve.
 *
 * **`ItemGrant` NO está en esta unión, a propósito (vuelta de arreglo 1, crítico I1).** `Grant[]`
 * es lo que trae `race.grants` y `subrace.grants`, y ahí lo resuelve `aplicarConcesion` — un
 * `switch (grant.kind)` sin `default` que solo conoce las nueve ramas de abajo. Meter `ItemGrant`
 * en la unión no le daba una rama en ese `switch`: el compilador no avisaba y una `ItemGrant`
 * puesta por error en `race.grants` se habría tirado en silencio. `ItemGrant` solo llega por
 * `ClassFeature.grant`, que tiene su propio camino (`concederActividadDe` en `resolve.ts`) — no
 * necesita estar en `Grant` para eso, y estarlo solo abría un agujero que nadie usa hoy.
 */
export type Grant =
  | AbilityGrant
  | AbilityChoiceGrant
  | SkillGrant
  | SkillChoiceGrant
  | SpeedGrant
  | HpPerLevelGrant
  | WeaponProficiencyGrant
  | DamageModifierGrant
  | FeatureGrant;

export interface GrantBase {
  /** Clave estable y **única en todo el catálogo**: `"half-elf-asi"`, `"dwarf-con"`. */
  id: string;
  labelKey: string;
}

export interface AbilityGrant extends GrantBase {
  kind: "ability";
  ability: AbilityKey;
  amount: number;
}

/** *«+1 a dos características a tu elección»*. La resolución es 2A.4. */
export interface AbilityChoiceGrant extends GrantBase {
  kind: "abilityChoice";
  choose: number;
  amount: number;
  from: AbilityKey[];
  /** Lo que ya recibe un bono fijo y por tanto no se puede volver a elegir. */
  excluding?: AbilityKey[];
}

export interface SkillGrant extends GrantBase {
  kind: "skill";
  skill: SkillKey;
  level: ProficiencyLevel;
}

export interface SkillChoiceGrant extends GrantBase {
  kind: "skillChoice";
  choose: number;
  from: SkillKey[];
  level: ProficiencyLevel;
}

/** Velocidades en **pies**. Los metros son presentación (spec de distancias). */
export interface SpeedGrant extends GrantBase {
  kind: "speed";
  movement: "walk" | "climb" | "swim" | "fly" | "burrow";
  feet: number;
}

/** Dureza Enana: **+1 PG por nivel**, no +1 PG. La diferencia es el caso de mesa nº 1. */
export interface HpPerLevelGrant extends GrantBase {
  kind: "hpPerLevel";
  amount: number;
}

/**
 * Competencia con armas concedida por una raza o subraza — el «Entrenamiento de combate enano».
 *
 * **Nació de una auditoría de mecánica**: hasta el 2026-09-03 esto era un `feature`, o sea texto
 * sin efecto, y el cuadro de ataques solo miraba las competencias de la **clase**. Un clérigo
 * enano con hacha de batalla veía «Sin competencia» en rojo y perdía su bonificador: un número
 * equivocado en la hoja de un personaje corriente, sin que nadie hiciera nada raro.
 *
 * Las claves son las mismas que usa la clase: `"simple"`, `"martial"` o la clave de un arma
 * suelta (`"battleaxe"`).
 */
export interface WeaponProficiencyGrant extends GrantBase {
  kind: "weaponProficiency";
  keys: string[];
  /** Nombre en español del rasgo que la concede, para que la hoja lo siga enseñando. */
  name: string;
}

/**
 * **Resistencia, inmunidad o vulnerabilidad al daño que da un rasgo de raza** (paso 1, tarea 8).
 *
 * Existía la maquinaria —`applyDamageModifiers`, probada— y **no existía de dónde salían los
 * modificadores de un personaje jugador**: los rasgos de raza eran puro texto (`kind: "feature"`),
 * así que un enano recibía el veneno entero y un tiefling ardía con el fuego entero, con la traza
 * convincente al lado.
 *
 * **Reutiliza la forma de `statblock.damageModifiers`** (`@dnd/shared`) y no inventa una segunda:
 * si acabaran siendo dos formas de decir lo mismo, `changeHp` tendría que saber de las dos.
 */
export interface DamageModifierGrant extends GrantBase {
  kind: "damageModifier";
  damageType: DamageModifier["damageType"];
  effect: DamageModifier["effect"];
  /** Nombre en español del rasgo que la concede. La interfaz nunca lo compone desde la clave. */
  name: string;
}

/** Un rasgo sin efecto numérico que el motor pueda calcular hoy: se enseña, no se suma. */
export interface FeatureGrant extends GrantBase {
  kind: "feature";
  /** Nombre en español. La interfaz nunca compone el nombre de un rasgo a partir de su clave. */
  name: string;
}

/**
 * **Concede una actividad completa, con sus propios usos si los tiene** (tarea A9). Es lo que
 * distingue a la Furia de cualquier otra aptitud de clase: hasta hoy `f(1, "rage", "Furia")` era
 * literalmente todo lo que el catálogo sabía de ella, y la hoja no podía enseñar un botón porque
 * no había nada mecánico que pulsar.
 *
 * **`actividad` es la forma de A5/A6** (`Actividad` en `@dnd/shared`), tal cual, y no una copia:
 * el catálogo declara una actividad como cualquier otra que llegue en el paso 3.
 *
 * **`usos.max` es un `Origen`, nunca un entero.** La Furia da 2 usos a nivel 1 y sube por tramos
 * (SRD 5.1, Barbarian: columna «Rages»); escribir `2` a mano habría acertado al nivel 1 y
 * mentido a partir del 3. La tabla que resuelve ese origen —`{ tipo: "escala", clave: ... }`— es
 * la tarea A10, y vive en `classes.ts`, junto a la clase que la declara.
 *
 * **`resetOn` es el vocabulario que ya existe** (`ResourceReset` de `@dnd/shared`): no se
 * inventa un tercer enum para decir lo mismo que `CharacterResource.resetOn` ya dice.
 *
 * **`sinTopeDesde` (vuelta de arreglo 1, crítico I1) — «sin tope» ya es ciudadano de primera en
 * la puerta que va a persistir esto.** SRD 5.1: la Furia es «Unlimited» a partir de nivel 20, y
 * la tabla de escala de `max` (un `Origen`) **no aprende a decir «ilimitado»** — sigue siendo
 * solo números, tramo a tramo. Lo que hace falta es no evaluar esa tabla en absoluto a partir del
 * nivel que el SRD marca como sin tope: `ResolvedActivityUses.max` (`@dnd/shared`) ya es
 * `number | null`, el mismo vocabulario que `CharacterResource.max` en Prisma y que
 * `ResourcesService.adjust` ya sabe leer (`resource.max ?? Number.POSITIVE_INFINITY`). Sin este
 * campo, un bárbaro de nivel 20 —una ficha legal, `level` llega hasta 20— seguía leyendo el
 * tramo de mayor `desde` (17 → 6) y su hoja mentía con un número creíble y silencioso: el mismo
 * fallo de `simplifyBonus` que este proyecto existe para no repetir, solo que sin la guarda de
 * `resolverOrigen` para cazarlo (esa guarda solo lanza POR DEBAJO del primer tramo, nunca por
 * encima).
 */
export interface ItemGrant extends GrantBase {
  kind: "grant";
  actividad: Actividad;
  usos?: {
    max: Origen;
    resetOn: ResourceReset;
    /** Nivel desde el que `usos.max` deja de tener tope y `ResolvedActivityUses.max` es `null`. */
    sinTopeDesde?: number;
  };
}

export interface SrdSubrace {
  key: string;
  name: string;
  grants: Grant[];
}

export interface SrdRace {
  key: string;
  name: string;
  size: CreatureSize;
  /** Alcance de la visión en la oscuridad, en pies. `0` si no tiene. */
  darkvisionFeet: number;
  /**
   * SRD 5.1, enano: *«Tu velocidad no se reduce por llevar armadura pesada»*. Sin esto, el
   * arquetipo más común de la mesa —enano guerrero con armadura de bandas— corría 15 pies en la
   * pantalla y 25 en el manual, y la velocidad decide quién alcanza al mago.
   */
  heavyArmorSpeedExempt?: boolean;
  grants: Grant[];
  subraces: SrdSubrace[];
}

/** Una aptitud de clase, por nivel. **Solo el nombre**: ver `NOTICE.md` y §"alcance" abajo. */
export interface ClassFeature {
  level: number;
  key: string;
  name: string;
  /**
   * Lo que este rasgo concede además de su nombre — hoy, **solo** una actividad con sus usos
   * (`ItemGrant`, tarea A9). Ausente en casi todos los rasgos, que siguen siendo nombre y nivel
   * a propósito (ver el alcance declarado arriba): **solo la Furia gana su forma completa**,
   * decisión del autor del 2026-09-06 que no se reabre aquí.
   */
  grant?: ItemGrant;
}

export interface SrdSubclass {
  key: string;
  name: string;
  /** Nivel al que la clase elige subclase. Varía: clérigo 1, druida 2, guerrero 3. */
  chosenAtLevel: number;
  features: ClassFeature[];
}

export interface SrdClass {
  key: string;
  name: string;
  /** 6, 8, 10 o 12. */
  hitDie: number;
  /**
   * Reglas de la mesa (D-CF-53). SRD 5.1, «Starting Wealth by Class»: la tirada en po con la que
   * nace quien no coge el equipo de clase. `times` porque la gramática de `dice.ts` no tiene
   * multiplicación y `5d4×10` es «tira 5d4 y multiplica»; el monje va sin ×10 en la tabla.
   */
  startingGold: { dice: string; times: number };
  /** **Exactamente dos**, y hay un invariante que lo comprueba. */
  saveProficiencies: AbilityKey[];
  /**
   * **Claves de máquina, no prosa**: `"light"`, `"medium"`, `"heavy"`, `"shield"` en armadura;
   * `"simple"`, `"martial"` o la clave de un arma suelta (`"long-sword"`) en armas.
   *
   * Hasta el 2026-09-03 eran frases en español («Armas sencillas»), y **no las leía nadie**. En
   * cuanto el cuadro de ataques de 2B empezó a preguntar «¿tiene competencia con esta arma?», la
   * respuesta era siempre que no —comparaba `"martial"` contra «Armas marciales»—, así que la
   * hoja de todo guerrero habría restado su bonificador de competencia **en silencio**. Lo cazó
   * la integración, no una prueba: las dos mitades estaban bien por separado.
   *
   * El español sale en la pantalla, como con toda clave del catálogo.
   */
  armorProficiencies: string[];
  weaponProficiencies: string[];
  /** Cuántas habilidades elige al nivel 1, y de qué lista. */
  skillChoice: { choose: number; from: SkillKey[] };
  /** Sin conjuros: `undefined`. Los cuatro marciales del SRD no lanzan. */
  spellcastingAbility?: AbilityKey;
  /**
   * Nivel al que empieza a lanzar. **Paladín y explorador lanzan desde el 2, no desde el 1**, y
   * antes de la revisión del 2026-09-02 esta columna no existía: la característica se pasaba al
   * motor sin mirar el nivel, así que un paladín de nivel 1 recibía CD de salvación de conjuro
   * y bono de ataque de conjuro que el SRD no le da. `1` cuando lanza desde el principio.
   */
  spellcastingFromLevel?: number;
  /**
   * Qué tabla de espacios de conjuro le toca (hueco M3). `undefined` = no lanza.
   *
   * Son **tres** y confundirlas es el error obvio: completa (bardo, clérigo, druida, hechicero,
   * mago), media (paladín y explorador) y de pacto (brujo, que además repone en descanso
   * **corto**).
   */
  spellProgression?: SpellProgression;
  /**
   * Cuántos ataques da una acción de Ataque, por nivel (hueco M2). **Ataque Extra no es un
   * rasgo condicional como Ataque Furtivo: es un número**, y clasificarlo como texto hacía que
   * la hoja del personaje más común de una mesa —el guerrero de nivel 5— mintiera.
   *
   * Se lee como bandas: la entrada de mayor `fromLevel` que no supere el nivel actual. Sin
   * entradas, un ataque.
   */
  attacksPerAction?: { fromLevel: number; attacks: number }[];
  /** Niveles de mejora de característica. Guerrero y pícaro tienen más. */
  asiLevels: number[];
  features: ClassFeature[];
  /** El SRD trae **una** por clase. Se modela para que quepa el homebrew de 2B. */
  subclasses: SrdSubclass[];
  /**
   * **Las tablas de escala de la clase, por clave** (tarea A10). Un tramo dice desde qué nivel
   * aplica y qué valor tiene; la lista no promete estar ordenada — `resolverOrigen`
   * (`../engine.ts`) ya no asume monotonía ni orden, y esta tabla tampoco lo necesita.
   *
   * **Cada clave es la de un `Origen` de tipo `escala`** (`{ tipo: "escala", clave }`,
   * `@dnd/shared`), y por eso vive junto a la clase que la declara: es SU dato, no una tabla
   * global de todo el catálogo que cualquier clase pudiera pisar por accidente.
   */
  scales?: Record<string, readonly ScaleStep[]>;
}

/**
 * Un tramo de una tabla de escala: desde qué nivel de PERSONAJE aplica, y qué valor tiene.
 * **Es la misma forma que `ContextoDeDerivacion.escalas` ya espera** (`../engine.ts`, tarea A4):
 * no se declara una segunda aquí, se reutiliza su estructura para que `resolve.ts` solo tenga
 * que envolver el `Record` en el `ReadonlyMap` que el motor sabe leer.
 */
export interface ScaleStep {
  desde: number;
  valor: number;
}

export type ArmorCategory = "LIGHT" | "MEDIUM" | "HEAVY" | "SHIELD";

export interface SrdArmor {
  key: string;
  name: string;
  category: ArmorCategory;
  /** CA de partida. En un escudo es la suma plana (+2), no una fórmula. */
  baseAc: number;
  /**
   * Tope de Destreza: `undefined` en ligera (sin tope), `2` en media, `0` en pesada
   * (**no suma nada**). En un escudo no aplica.
   */
  dexCap?: number;
  /** Fuerza mínima para no perder 10 pies de velocidad. `0` si no exige. */
  strengthRequirement: number;
  /** Desventaja en Sigilo. Se enseña; automatizarlo es 2C. */
  stealthDisadvantage: boolean;
  /**
   * Peso en **onzas** (16 oz = 1 lb) y precio en **piezas de cobre** (1 po = 100 pc). Tarea 2B
   * (carril A1): son inventario, y el inventario usa las mismas unidades enteras que
   * `packages/shared/src/item.schema.ts` — la unidad íntegra abajo, la legible arriba.
   */
  weightOz: number;
  costCp: number;
}
