import { describe, expect, it } from "vitest";
import { traducirLabelKey } from "../vocabulario";

// Tarea 2A.10 — "toda labelKey que el motor puede devolver tiene traducción (recórrelas y
// compruébalo)". Esta lista es la enumeración manual de cada `labelKey` que
// `apps/api/src/rules/engine.ts`, `apps/api/src/rules/catalog/resolve.ts` y
// `apps/api/src/character-state/speed/effective-speed.ts` pueden devolver — en un paso de
// traza (`DerivedValue.steps`) o en el `labelKey` de una elección pendiente
// (`PendingChoice.labelKey`, p. ej. `class.bard.skills`, `race.halfElf.asi`) — recorrida a mano
// leyendo esos ficheros (la web no puede importarlos: viven en `apps/api`). Si el motor añade
// una clave nueva sin que este fichero la traduzca, esta prueba es la que se entera primero:
// falla en vez de dejar que la pantalla imprima inglés en silencio.
const ETIQUETAS_QUE_EL_MOTOR_PUEDE_EMITIR = [
  // engine.ts — fijas
  "proficiencyBonus",
  "ac.unarmored",
  "maxHp.firstLevel",
  "maxHp.perLevel",
  "maxHp.conPerLevel",
  "maxHp.minimum",
  "passive.base",
  "senses.darkvision",
  "halfProficiency",
  "expertise",
  "spellSaveDc.base",
  "skill.perception",
  // engine.ts — por característica
  "ability.str.base",
  "ability.dex.base",
  "ability.con.base",
  "ability.int.base",
  "ability.wis.base",
  "ability.cha.base",
  "abilityMod.str",
  "abilityMod.dex",
  "abilityMod.con",
  "abilityMod.int",
  "abilityMod.wis",
  "abilityMod.cha",
  // engine.ts — recorte de CA por tope de Destreza (una por armadura con `dexCap`)
  "ac.cap.hide",
  "ac.cap.chain-shirt",
  "ac.cap.scale-mail",
  "ac.cap.breastplate",
  "ac.cap.half-plate",
  "ac.cap.ring-mail",
  "ac.cap.chain-mail",
  "ac.cap.splint",
  "ac.cap.plate",
  // resolve.ts (formulasDeArmadura) — una por armadura del catálogo (apps/api/.../armor.ts)
  "armor.padded",
  "armor.leather",
  "armor.studded-leather",
  "armor.hide",
  "armor.chain-shirt",
  "armor.scale-mail",
  "armor.breastplate",
  "armor.half-plate",
  "armor.ring-mail",
  "armor.chain-mail",
  "armor.splint",
  "armor.plate",
  "armor.shield",
  // resolve.ts / races.ts — concesiones de característica y habilidad que sí generan traza
  // (kind "ability", "abilityChoice" resuelta, o "skill"/"skillChoice" resuelta)
  "race.dwarf.con",
  "subrace.dwarfHill.wis",
  "race.elf.dex",
  "race.elf.keenSenses",
  "subrace.elfHigh.int",
  "race.halfling.dex",
  "subrace.halflingLightfoot.cha",
  "race.human.str",
  "race.human.dex",
  "race.human.con",
  "race.human.int",
  "race.human.wis",
  "race.human.cha",
  "race.dragonborn.str",
  "race.dragonborn.cha",
  "race.gnome.int",
  "subrace.gnomeRock.con",
  "race.halfElf.cha",
  "race.halfElf.asi",
  "race.halfOrc.str",
  "race.halfOrc.con",
  "race.halfOrc.menacing",
  "race.tiefling.int",
  "race.tiefling.cha",
  // resolve.ts — elección de habilidades de clase (una por clase del catálogo)
  "class.barbarian.skills",
  "class.bard.skills",
  "class.cleric.skills",
  "class.druid.skills",
  "class.fighter.skills",
  "class.monk.skills",
  "class.paladin.skills",
  "class.ranger.skills",
  "class.rogue.skills",
  "class.sorcerer.skills",
  "class.warlock.skills",
  "class.wizard.skills",
  // effective-speed.ts (velocidad-efectiva.ts la calca)
  "speed.base",
  "speed.condition.zero",
  "speed.condition.half",
];

describe("traducirLabelKey — cobertura de todas las claves que el motor puede emitir", () => {
  it.each(ETIQUETAS_QUE_EL_MOTOR_PUEDE_EMITIR)("traduce %s", (labelKey) => {
    const { conocida, texto } = traducirLabelKey(labelKey);
    expect(conocida, `«${labelKey}» debería tener traducción`).toBe(true);
    expect(texto.startsWith("Sin traducir:")).toBe(false);
  });

  it("una clave que el motor no puede emitir se marca como no traducida, nunca en silencio", () => {
    const { conocida, texto } = traducirLabelKey("race.beholder.deathRay");
    expect(conocida).toBe(false);
    expect(texto).toBe("Sin traducir: race.beholder.deathRay");
  });
});
