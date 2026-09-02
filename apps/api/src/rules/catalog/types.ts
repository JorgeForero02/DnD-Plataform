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

import type { AbilityKey, ProficiencyLevel, SkillKey } from "@dnd/shared";
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
 */
export type Grant =
  | AbilityGrant
  | AbilityChoiceGrant
  | SkillGrant
  | SkillChoiceGrant
  | SpeedGrant
  | HpPerLevelGrant
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

/** Un rasgo sin efecto numérico que el motor pueda calcular hoy: se enseña, no se suma. */
export interface FeatureGrant extends GrantBase {
  kind: "feature";
  /** Nombre en español. La interfaz nunca compone el nombre de un rasgo a partir de su clave. */
  name: string;
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
  grants: Grant[];
  subraces: SrdSubrace[];
}

/** Una aptitud de clase, por nivel. **Solo el nombre**: ver `NOTICE.md` y §"alcance" abajo. */
export interface ClassFeature {
  level: number;
  key: string;
  name: string;
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
  /** **Exactamente dos**, y hay un invariante que lo comprueba. */
  saveProficiencies: AbilityKey[];
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
}
