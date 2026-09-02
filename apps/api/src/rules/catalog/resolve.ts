// Tarea 2A.3 — el resolutor: de una ficha declarada (raza, subraza, clase, nivel, armadura) a
// la entrada que el motor de 2A.2 sabe comer.
//
// **Este es el único sitio donde el catálogo y el motor se tocan**, y es a propósito: el motor
// no importa nada de `catalog/`, así que un fallo de transcripción nunca puede parecer un
// fallo del motor. Quien resuelve `ContentRef` → datos es esto; en 2A solo sabe mirar el SRD,
// y en 2B aprenderá a mirar además la tabla de la campaña **sin que el motor cambie**.
//
// **Las elecciones (2A.4).** Un `abilityChoice` o un `skillChoice` sin resolver sale por
// `pendingChoices`, deja un aviso `unresolved_choice` y **no altera ni una característica**.
// Resuelto, se aplica y en la traza queda **indistinguible de un bono fijo**, que es el
// objetivo: la traza pinta «+1 Carisma (semielfo)» igual que pintaría un +2 de tabla.

import type { AbilityKey, DerivationWarning, ProficiencyLevel, SkillKey } from "@dnd/shared";
import type { AcFormula, EngineInput, Modifier } from "../engine";
import { SRD_ARMOR } from "./armor";
import {
  assertNoUnknownChoices,
  validatePicks,
  type CharacterChoices,
  type ChoiceGrant,
} from "./choices";
import { SRD_CLASSES } from "./classes";
import { SRD_RACES } from "./races";
import type { ContentRef, Grant, SrdArmor, SrdClass, SrdRace, SrdSubrace } from "./types";

/** Lo que la ficha declara. Las puntuaciones son **base**: la raza entra como modificador. */
export interface CharacterBuild {
  abilities: Record<AbilityKey, number>;
  race: ContentRef;
  subrace?: ContentRef;
  class: ContentRef;
  level: number;
  /** Armadura y escudo equipados. En 2A se pasan a mano; las casillas de equipo son 2B. */
  armor?: ContentRef[];
  /** Competencias en habilidades ya decididas. Se funden con las que da la raza. */
  skillProficiencies?: Partial<Record<SkillKey, ProficiencyLevel>>;
  /** Lo que el jugador ha elegido, por clave de concesión (2A.4). */
  choices?: CharacterChoices;
}

/** Una concesión que espera una decisión del jugador. La resolución es 2A.4. */
export interface PendingChoice {
  grantId: string;
  labelKey: string;
  kind: "abilityChoice" | "skillChoice";
  choose: number;
  from: string[];
  excluding?: string[];
}

export interface ResolvedFeature {
  sourceKey: string;
  labelKey: string;
  name: string;
}

export interface ResolvedBuild {
  input: EngineInput;
  pendingChoices: PendingChoice[];
  /**
   * Avisos que nacen del catálogo, no del cálculo: hoy solo `unresolved_choice` y
   * `duplicate_skill_choice`. Se juntan con los del motor en `deriveCharacter`.
   */
  warnings: DerivationWarning[];
  features: ResolvedFeature[];
  /** Velocidades **en pies**. 2A.12 les aplicará las condiciones. */
  speeds: Partial<Record<"walk" | "climb" | "swim" | "fly" | "burrow", number>>;
  race: SrdRace;
  subrace?: SrdSubrace;
  characterClass: SrdClass;
}

/** Una referencia que el catálogo no sabe resolver. Es un 400, no un 500. */
export class UnknownContentError extends Error {
  constructor(
    readonly kind: string,
    readonly ref: ContentRef,
  ) {
    super(`No existe ${kind} para la referencia ${JSON.stringify(ref)}`);
    this.name = "UnknownContentError";
  }
}

function srdKey(ref: ContentRef, kind: string): string {
  // En 2A solo hay una rama. La otra existe para que 2B la rellene, y hasta entonces falla
  // ruidosamente en vez de devolver algo vacío que parezca funcionar.
  if (ref.source !== "SRD") throw new UnknownContentError(kind, ref);
  return ref.key;
}

export function findRace(ref: ContentRef): SrdRace {
  const key = srdKey(ref, "raza");
  const race = SRD_RACES.find((r) => r.key === key);
  if (!race) throw new UnknownContentError("raza", ref);
  return race;
}

export function findSubrace(race: SrdRace, ref: ContentRef): SrdSubrace {
  const key = srdKey(ref, "subraza");
  const subrace = race.subraces.find((s) => s.key === key);
  if (!subrace) throw new UnknownContentError("subraza", ref);
  return subrace;
}

export function findClass(ref: ContentRef): SrdClass {
  const key = srdKey(ref, "clase");
  const found = SRD_CLASSES.find((c) => c.key === key);
  if (!found) throw new UnknownContentError("clase", ref);
  return found;
}

export function findArmor(ref: ContentRef): SrdArmor {
  const key = srdKey(ref, "armadura");
  const armor = SRD_ARMOR.find((a) => a.key === key);
  if (!armor) throw new UnknownContentError("armadura", ref);
  return armor;
}

const ORDEN_COMPETENCIA: Record<ProficiencyLevel, number> = {
  none: 0,
  proficient: 1,
  expertise: 2,
};

export function resolveBuild(build: CharacterBuild): ResolvedBuild {
  const race = findRace(build.race);
  const subrace = build.subrace ? findSubrace(race, build.subrace) : undefined;
  const characterClass = findClass(build.class);

  const modifiers: Modifier[] = [];
  const pendingChoices: PendingChoice[] = [];
  const warnings: DerivationWarning[] = [];
  const features: ResolvedFeature[] = [];
  const speeds: ResolvedBuild["speeds"] = {};
  const skillProficiencies: Partial<Record<SkillKey, ProficiencyLevel>> = {
    ...build.skillProficiencies,
  };
  const choices = build.choices ?? {};
  const concesionesConocidas = new Set<string>();

  const anotarCompetencia = (skill: SkillKey, level: ProficiencyLevel, grantId: string) => {
    const actual = skillProficiencies[skill] ?? "none";
    if (ORDEN_COMPETENCIA[level] > ORDEN_COMPETENCIA[actual]) {
      skillProficiencies[skill] = level;
      return;
    }
    // Elegir una habilidad que ya se tiene por otra vía **no es un error**: el SRD lo desaconseja
    // pero este resolutor no ve todas las fuentes de una mesa real. Se avisa, que es lo que la
    // hoja necesita para decir «esta elección no te está dando nada».
    warnings.push({
      code: "duplicate_skill_choice",
      key: `skill.${skill}`,
      data: { grantId, skill, alreadyAt: actual },
    });
  };

  /**
   * Devuelve las elecciones si están completas y válidas; si no, apunta el pendiente y el
   * aviso. **Validar lanza**: una elección imposible no se degrada a pendiente.
   */
  const resolverEleccion = (grant: ChoiceGrant): string[] | undefined => {
    concesionesConocidas.add(grant.id);
    const { picks, complete } = validatePicks(grant, choices[grant.id]);
    if (complete) return picks;

    pendingChoices.push({
      grantId: grant.id,
      labelKey: grant.labelKey,
      kind: grant.kind,
      choose: grant.choose,
      from: grant.from,
      excluding: grant.kind === "abilityChoice" ? grant.excluding : undefined,
    });
    // La lista `from` **no cabe en `data`**: el esquema de `@dnd/shared` solo admite escalares,
    // a propósito, para que un aviso no se convierta en un objeto arbitrario. Quien quiera la
    // lista la tiene en `pendingChoices`, que es su sitio.
    warnings.push({
      code: "unresolved_choice",
      key: grant.id,
      data: { grantId: grant.id, kind: grant.kind, needed: grant.choose, picked: picks.length },
    });
    return undefined;
  };

  const aplicarConcesion = (grant: Grant, sourceType: "race" | "subrace", sourceKey: string) => {
    switch (grant.kind) {
      case "ability":
        modifiers.push({
          target: `ability.${grant.ability}`,
          op: "add",
          amount: grant.amount,
          sourceType,
          sourceKey,
          labelKey: grant.labelKey,
        });
        break;
      case "hpPerLevel":
        // **Por nivel.** Es el caso de mesa nº 1: una fórmula ingenua suma +1 una sola vez y
        // da 15 PG donde el SRD da 16.
        modifiers.push({
          target: "maxHp",
          op: "add",
          amount: grant.amount * build.level,
          sourceType,
          sourceKey,
          labelKey: grant.labelKey,
        });
        break;
      case "skill":
        if (
          ORDEN_COMPETENCIA[grant.level] >
          ORDEN_COMPETENCIA[skillProficiencies[grant.skill] ?? "none"]
        )
          skillProficiencies[grant.skill] = grant.level;
        break;
      case "abilityChoice": {
        const picks = resolverEleccion(grant);
        // Resuelta, **es un modificador como cualquier otro**: mismo `op`, mismo `sourceType`,
        // misma pinta en la traza. Ese es todo el objetivo del mecanismo.
        for (const ability of picks ?? [])
          modifiers.push({
            target: `ability.${ability}`,
            op: "add",
            amount: grant.amount,
            sourceType,
            sourceKey,
            labelKey: grant.labelKey,
          });
        break;
      }
      case "skillChoice": {
        const picks = resolverEleccion(grant);
        for (const skill of picks ?? [])
          anotarCompetencia(skill as SkillKey, grant.level, grant.id);
        break;
      }
      case "speed":
        speeds[grant.movement] = grant.feet;
        break;
      case "feature":
        features.push({ sourceKey, labelKey: grant.labelKey, name: grant.name });
        break;
    }
  };

  for (const grant of race.grants) aplicarConcesion(grant, "race", race.key);
  for (const grant of subrace?.grants ?? []) aplicarConcesion(grant, "subrace", subrace!.key);

  // La elección de habilidades de la clase es **el mismo mecanismo**: se fabrica la concesión
  // desde la tabla de la clase y pasa por el mismo camino que la de la raza.
  const habilidadesDeClase: ChoiceGrant = {
    id: `${characterClass.key}-skills`,
    labelKey: `class.${characterClass.key}.skills`,
    kind: "skillChoice",
    choose: characterClass.skillChoice.choose,
    from: characterClass.skillChoice.from,
    level: "proficient",
  };
  for (const skill of resolverEleccion(habilidadesDeClase) ?? [])
    anotarCompetencia(skill as SkillKey, "proficient", habilidadesDeClase.id);

  // Lo último: una elección que no corresponde a ninguna concesión de esta ficha es un error,
  // no algo que se ignora. Va al final porque hasta aquí no se sabe cuáles había.
  assertNoUnknownChoices(choices, concesionesConocidas);

  const { acFormulas, acBonuses } = formulasDeArmadura(build.armor ?? []);

  return {
    input: {
      abilities: build.abilities,
      level: build.level,
      hitDieSize: characterClass.hitDie,
      modifiers,
      saveProficiencies: characterClass.saveProficiencies,
      skillProficiencies,
      acFormulas,
      acBonuses,
      spellcastingAbility: characterClass.spellcastingAbility,
    },
    pendingChoices,
    warnings,
    features,
    speeds,
    race,
    subrace,
    characterClass,
  };
}

/**
 * Un escudo **no es una fórmula candidata**: es una suma plana que se aplica gane la que gane.
 * Meterlo como fórmula haría que «escudo solo» compitiera con «cota de malla» y ganara la
 * peor de las dos.
 */
function formulasDeArmadura(refs: ContentRef[]): {
  acFormulas: AcFormula[];
  acBonuses: NonNullable<EngineInput["acBonuses"]>;
} {
  const acFormulas: AcFormula[] = [];
  const acBonuses: NonNullable<EngineInput["acBonuses"]> = [];

  for (const ref of refs) {
    const armor = findArmor(ref);
    if (armor.category === "SHIELD") {
      acBonuses.push({
        amount: armor.baseAc,
        labelKey: `armor.${armor.key}`,
        sourceType: "item",
        sourceKey: armor.key,
      });
      continue;
    }
    acFormulas.push({
      key: armor.key,
      labelKey: `armor.${armor.key}`,
      base: armor.baseAc,
      addAbility: "dex",
      abilityCap: armor.dexCap,
      sourceType: "item",
      sourceKey: armor.key,
    });
  }

  return { acFormulas, acBonuses };
}
