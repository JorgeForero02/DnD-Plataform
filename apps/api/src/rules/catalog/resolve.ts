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

import {
  characterBuildSchema,
  type AbilityKey,
  type CharacterBuildInput,
  type DamageModifier,
  type DerivationWarning,
  type Movement,
  type ProficiencyLevel,
  type SkillKey,
} from "@dnd/shared";
// **Dirección única: `resolve.ts` importa de `../items`, `../items` nunca importa de aquí.**
// Es lo que evita el ciclo: `resolveBuild` necesita traducir `build.items`, y la regla de
// "cómo se traduce una armadura a CA" y "qué es equipo imposible" vive en `../items.ts` —
// única, para que `build.armor` (abajo, `formulasDeArmadura`) y `build.items` no puedan
// discrepar sobre la misma pregunta.
import {
  armorToAcContribution,
  assertValidArmorSet,
  equipmentToEngineInput,
  InvalidEquipmentError,
  ORDEN_COMPETENCIA,
} from "../items";
import { totalConModificadores, type AcFormula, type EngineInput, type Modifier } from "../engine";
import { SRD_ARMOR } from "./armor";
import { validatePicks, type ChoiceGrant } from "./choices";
import { SRD_CLASSES } from "./classes";
import { SRD_RACES } from "./races";
import { spellSlotResetOn, spellSlotsFor, type SpellSlot } from "./spell-slots";
import type { ContentRef, Grant, SrdArmor, SrdClass, SrdRace, SrdSubrace } from "./types";

/** Re-exportado tal cual: los consumidores existentes lo importan de `./resolve`. */
export { InvalidEquipmentError };

/**
 * Lo que la ficha declara. Las puntuaciones son **base**: la raza entra como modificador.
 *
 * **La forma vive en `@dnd/shared`** (`character-build.schema.ts`) y aqui solo se le da
 * nombre. `resolveBuild` la valida con ese esquema antes de tocar nada: sin eso, una
 * `abilities` a la que le faltara una caracteristica propagaba `NaN` a toda la hoja en
 * silencio, y nadie validaba a la salida.
 */
export type CharacterBuild = CharacterBuildInput;

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
  /**
   * Competencias con armas de la **clase más la raza**. La hoja las pasa al cuadro de ataques;
   * antes solo miraba la clase y el enano perdía las suyas.
   */
  weaponProficiencies: string[];
  /**
   * **Resistencias, inmunidades y vulnerabilidades al daño que dan los rasgos** (paso 1, tarea 8).
   *
   * **La misma forma que `statblock.damageModifiers`** de `@dnd/shared`, y no un segundo esquema:
   * `changeHp` tiene una sola función que aplicarlos (`applyDamageModifiers`), y dos formas de
   * decir lo mismo la obligarían a saber de las dos.
   */
  damageModifiers: DamageModifier[];
  /** Velocidades **en pies**. 2A.12 les aplicará las condiciones. */
  speeds: Partial<Record<"walk" | "climb" | "swim" | "fly" | "burrow", number>>;
  /**
   * Cuantos ataques da una accion de Ataque a este nivel (hueco M2). Uno salvo que la clase
   * diga otra cosa. **El boton de «tira los dos» es 2C**; el numero es de aqui.
   */
  attacksPerAction: number;
  /**
   * Espacios de conjuro a este nivel (hueco M3). Vacio = no lanza todavia, que es un estado
   * legitimo —el paladin de nivel 1— y no un error.
   */
  spellSlots: SpellSlot[];
  /** Donde se reponen. **El brujo, en descanso CORTO.** Lo necesita 2A.8. */
  spellSlotResetOn: "SHORT_REST" | "LONG_REST" | "NONE";
  race: SrdRace;
  subrace?: SrdSubrace;
  characterClass: SrdClass;
}

// `InvalidEquipmentError` (equipo que no puede llevarse a la vez, y que **debe traducirse a
// 400 en el borde**, 2A.6) se mudó a `../items.ts` en el carril A2: es donde vive la regla que
// la lanza (`assertValidArmorSet`), y de ahí se re-exporta arriba para que nada que ya la
// importe de `./resolve` se entere del movimiento.

/**
 * Una referencia que el catálogo no sabe resolver. **Deberá traducirse a 400 en el borde**
 * (2A.6): hoy la API no registra ningún filtro de excepciones, así que decir «es un 400» sería
 * mentira — y lo era hasta la revisión del 2026-09-02. Ficha S7 en `docs/06-pendientes.md`.
 */
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

// `none < half < proficient < expertise`. Cuando dos fuentes conceden la misma habilidad **gana
// la mejor y no se suman**, que es la regla de 5.ª edicion y ademas lo unico que no rompe la
// media competencia: un bardo competente en Sigilo no gana ademas la mitad por «Aprendiz de
// todo». **Se importa de `../items`** y no se repite aquí: los objetos equipados conceden
// competencias por el mismo mecanismo, y una segunda copia de esta tabla es exactamente cómo
// dos fuentes acaban discrepando sobre quién gana.

export function resolveBuild(entrada: CharacterBuild): ResolvedBuild {
  // Se valida **aqui**, no solo en el borde: esta funcion es la puerta del catalogo y la
  // llaman tambien las pruebas y, en 2A.9, la subida de nivel, que calcula `level + 1` por
  // dentro y podria colarse en 21 sin pasar por ningun esquema HTTP.
  const build = characterBuildSchema.parse(entrada);
  const race = findRace(build.race);
  const subrace = build.subrace ? findSubrace(race, build.subrace) : undefined;
  const characterClass = findClass(build.class);

  const modifiers: Modifier[] = [];
  const pendingChoices: PendingChoice[] = [];
  const warnings: DerivationWarning[] = [];
  const features: ResolvedFeature[] = [];
  const speeds: ResolvedBuild["speeds"] = {};
  const weaponProficiencies: string[] = [...characterClass.weaponProficiencies];
  const damageModifiers: DamageModifier[] = [];
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
      // **Copia.** Devolver el array del catalogo por referencia dejaba que un consumidor
      // que lo ordenase corrompiera el catalogo compartido del proceso.
      from: [...grant.from],
      excluding:
        grant.kind === "abilityChoice" && grant.excluding ? [...grant.excluding] : undefined,
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
        // Pasa por el mismo sitio que una eleccion: dos fuentes fijas que den la misma
        // habilidad tampoco deben subirla dos veces **ni callarse**.
        anotarCompetencia(grant.skill, grant.level, grant.id);
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
      case "weaponProficiency":
        // Se guarda la competencia **y** se enseña el rasgo: para la mesa es una aptitud con
        // nombre, y para el cuadro de ataques es un bonificador que aparece.
        for (const clave of grant.keys)
          if (!weaponProficiencies.includes(clave)) weaponProficiencies.push(clave);
        features.push({ sourceKey, labelKey: grant.labelKey, name: grant.name });
        break;
      case "damageModifier":
        // **Se guarda el modificador Y se enseña el rasgo**, igual que hace la competencia con
        // armas: para la mesa es una aptitud con nombre, y para `changeHp` es la mitad del daño.
        // El `note` lleva el nombre del rasgo, que es lo que hace que la traza del daño diga
        // **por qué** se redujo en vez de enseñar una resta sin origen.
        damageModifiers.push({
          damageType: grant.damageType,
          effect: grant.effect,
          note: grant.name,
        });
        features.push({ sourceKey, labelKey: grant.labelKey, name: grant.name });
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

  // Una elección que no corresponde a ninguna concesión de esta ficha **es un aviso al
  // derivar, no una excepción**. Al escribir sí es un error, y para eso está
  // `assertNoUnknownChoices`, que llamará el `PATCH` de 2A.6.
  //
  // El motivo del cambio, que salió en la revisión: cuando las elecciones se persistan, cambiar
  // de raza o de clase deja filas viejas ahí. Si derivar lanzara, **el personaje se volvería
  // ilegible por un dato caduco** en vez de pintarse con un aviso. Un dato viejo no es un dato
  // inválido, y va al final porque hasta aquí no se sabe qué concesiones había.
  for (const grantId of Object.keys(choices))
    if (!concesionesConocidas.has(grantId))
      warnings.push({ code: "stale_choice", key: grantId, data: { grantId } });

  // Aptitudes de clase y de subclase hasta el nivel actual. Antes solo salian las de raza, y
  // la ficha S2 de 06 afirmaba que la hoja ya podia decir "al nivel 5 ganas Ataque
  // adicional": era falso, y la revision lo cazo.
  for (const feature of characterClass.features)
    if (feature.level <= build.level)
      features.push({
        sourceKey: characterClass.key,
        labelKey: `class.${characterClass.key}.${feature.key}`,
        name: feature.name,
      });

  // **Encargo A8 (2026-09-07) — un personaje tiene UNA subclase, no todas.** Aquí ponía un
  // bucle sobre `characterClass.subclasses` ENTERO, sin mirar nunca qué había elegido el
  // personaje: recorría todas las subclases de la clase y aplicaba sus rasgos por nivel. Con el
  // catálogo de hoy —una sola subclase por clase— eso se veía como el rasgo de esa senda
  // apareciendo con la elección puesta a `null`, que es la ficha de cualquier personaje recién
  // creado; con una segunda subclase habría sido, literalmente, los rasgos de los dos caminos
  // a la vez.
  //
  // **Nunca lanza.** Una `subclassKey` que no pertenece a esta clase —de otra clase, o de un
  // catálogo que ya cambió— no es una ficha imposible: es el mismo caso que `stale_choice` ya
  // cubre para las elecciones. No se aplica ningún rasgo y se avisa; la hoja sigue siendo
  // legible.
  const subclassRef = build.subclass;
  const subclass =
    subclassRef?.source === "SRD"
      ? characterClass.subclasses.find((s) => s.key === subclassRef.key)
      : undefined;

  if (subclass) {
    for (const feature of subclass.features)
      if (feature.level <= build.level)
        features.push({
          sourceKey: subclass.key,
          labelKey: `subclass.${subclass.key}.${feature.key}`,
          name: feature.name,
        });
  } else if (characterClass.subclasses.length > 0) {
    // **`chosenAtLevel` se lee del catálogo, nunca a mano**: varía por clase (clérigo 1, druida
    // 2, guerrero 3), y escribirlo aquí habría sido la misma clase de mentira que ya se evitó al
    // sacar el nivel de lanzamiento de conjuros del código a la tabla. Con varias subclases se
    // toma la más temprana: es un rasgo de la CLASE, no de cada camino, y todas las subclases de
    // hoy coinciden en su valor.
    const chosenAtLevel = Math.min(...characterClass.subclasses.map((s) => s.chosenAtLevel));
    if (build.level >= chosenAtLevel) {
      warnings.push({
        code: "subclass_not_chosen",
        key: "subclass",
        // Vuelta de arreglo 1 (revisión) — menor: el mismo código cubre dos causas distintas, y
        // sin `reason` la frase mentía en una de ellas. «No has elegido» es falso cuando SÍ hay
        // una `subclassKey` guardada y lo que pasa es que no pertenece a esta clase — la propia
        // pantalla lo enseña aparte, marcado como huérfano. `reason` deja que `describirAviso`
        // (web) diga la frase que corresponde a cada caso, sin inventar un segundo código.
        data: {
          classKey: characterClass.key,
          chosenAtLevel,
          reason: subclassRef ? "wrong_class" : "not_chosen",
        },
      });
    }
  }

  const { acFormulas, acBonuses } = formulasDeArmadura(build.armor ?? []);

  // **Carril A2 — el equipo equipado entra por la misma puerta que la raza y la clase.**
  // `equipmentToEngineInput` ya decide, dentro de sí mismo, qué gana cuando dos objetos compiten
  // por la misma competencia; lo que falta aquí es dejarlo competir también con lo que ya trae
  // la raza o la clase, y por eso vuelve a pasar por `anotarCompetencia` — el mismo mecanismo,
  // no uno paralelo. En la traza, un bono de objeto queda **indistinguible de uno de raza**: es
  // el mismo objetivo que ya perseguían las elecciones (nota de cabecera).
  const equipo = equipmentToEngineInput(
    build.items ?? [],
    build.abilities.str,
    // La exención del enano: su velocidad no baja por armadura pesada (SRD 5.1).
    race.heavyArmorSpeedExempt ?? false,
  );
  modifiers.push(...equipo.modifiers);
  acFormulas.push(...equipo.acFormulas);
  acBonuses.push(...equipo.acBonuses);
  warnings.push(...equipo.warnings);
  for (const [skill, level] of Object.entries(equipo.skillProficiencies) as [
    SkillKey,
    ProficiencyLevel,
  ][])
    anotarCompetencia(skill, level, "items");
  const saveProficiencies = new Set<AbilityKey>(characterClass.saveProficiencies);
  for (const ability of equipo.saveProficiencies) saveProficiencies.add(ability);

  // Velocidades finales (base de la raza + lo que sumen los objetos), con la MISMA regla que
  // usará el motor cuando derive de verdad (`totalConModificadores`, `../engine.ts`) — no una
  // segunda cuenta a mano. `speeds` (arriba) sigue siendo solo la base: es lo que entra en
  // `baseSpeeds`, para que la traza que arma el motor (2A.2) no reciba el equipo premezclado.
  const clavesDeVelocidad = new Set<Movement>(Object.keys(speeds) as Movement[]);
  for (const m of modifiers)
    if (m.target.startsWith("speed."))
      clavesDeVelocidad.add(m.target.slice("speed.".length) as Movement);
  const speedsConEquipo: ResolvedBuild["speeds"] = {};
  for (const movimiento of clavesDeVelocidad)
    speedsConEquipo[movimiento] = totalConModificadores(
      speeds[movimiento] ?? 0,
      `speed.${movimiento}`,
      modifiers,
    );

  return {
    input: {
      abilities: build.abilities,
      level: build.level,
      hitDieSize: characterClass.hitDie,
      modifiers,
      saveProficiencies: [...saveProficiencies],
      skillProficiencies,
      acFormulas,
      acBonuses,
      baseSpeeds: speeds,
      // **Solo si el nivel llega.** Paladin y explorador no lanzan hasta el 2; pasarla
      // siempre hacia que el motor emitiera CD de conjuro y bono de ataque de conjuro a un
      // nivel 1 que no los tiene.
      // La visión en la oscuridad la da la raza, y la subraza no la modifica en el SRD.
      darkvisionFeet: race.darkvisionFeet,
      spellcastingAbility:
        characterClass.spellcastingAbility &&
        build.level >= (characterClass.spellcastingFromLevel ?? 1)
          ? characterClass.spellcastingAbility
          : undefined,
    },
    pendingChoices,
    warnings,
    features,
    weaponProficiencies,
    damageModifiers,
    speeds: speedsConEquipo,
    attacksPerAction: ataquesPorAccion(characterClass, build.level),
    spellSlots: spellSlotsFor(characterClass.spellProgression, build.level),
    spellSlotResetOn: spellSlotResetOn(characterClass.spellProgression),
    race,
    subrace,
    characterClass,
  };
}

/**
 * `build.armor` — el camino **legado** de referencias SRD sueltas, previo a `build.items`
 * (carril A2). **No decide por su cuenta cómo una armadura se convierte en CA**: eso vive en
 * `armorToAcContribution` (`../items.ts`), y esta función solo mira el catálogo (`findArmor`)
 * y llama. Dos sitios traduciendo la misma regla de armadura-a-CA es justo lo que se quiere
 * evitar — ver la nota de cabecera del fichero.
 */
function formulasDeArmadura(refs: ContentRef[]): {
  acFormulas: AcFormula[];
  acBonuses: NonNullable<EngineInput["acBonuses"]>;
} {
  const acFormulas: AcFormula[] = [];
  const acBonuses: NonNullable<EngineInput["acBonuses"]> = [];
  const equipo = refs.map(findArmor);

  // Dos armaduras de cuerpo, o dos escudos, no es una ficha rara: es una ficha imposible. Misma
  // comprobación que usa `build.items` (`../items.ts`), para que las dos puertas del equipo
  // apliquen exactamente la misma regla.
  assertValidArmorSet(equipo);

  for (const armor of equipo) {
    const contribucion = armorToAcContribution(armor, armor.key, `armor.${armor.key}`);
    if (contribucion.acFormula) acFormulas.push(contribucion.acFormula);
    if (contribucion.acBonus) acBonuses.push(contribucion.acBonus);
  }

  return { acFormulas, acBonuses };
}

/**
 * La banda de mayor `fromLevel` que no supere el nivel. Sin entradas, **uno** — que es lo que
 * tiene todo el mundo, y por eso el catalogo solo declara las excepciones.
 */
function ataquesPorAccion(clase: SrdClass, level: number): number {
  const bandas = (clase.attacksPerAction ?? []).filter((b) => level >= b.fromLevel);
  return bandas.length ? bandas[bandas.length - 1].attacks : 1;
}
