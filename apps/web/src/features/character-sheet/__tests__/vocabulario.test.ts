import { describe, expect, it } from "vitest";
import { describirAviso, explicacionSubclase, traducirLabelKey } from "../vocabulario";

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
  // character-sheet.service.ts — cada anulación manual del DM entra en la traza con esta clave.
  // **Faltaba en la lista y faltaba en el diccionario**, así que un valor anulado enseñaba
  // «Sin traducir: override.manual» en pantalla y ninguna prueba se enteraba: la lista copiaba
  // el mismo olvido que pretendía vigilar.
  "override.manual",
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
  "ac.cap.hide.dex",
  "ac.cap.chain-shirt.dex",
  "ac.cap.scale-mail.dex",
  "ac.cap.breastplate.dex",
  "ac.cap.half-plate.dex",
  "ac.cap.ring-mail.dex",
  "ac.cap.chain-mail.dex",
  "ac.cap.splint.dex",
  "ac.cap.plate.dex",
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
  // agotamiento.ts (2C.4) — el cuarto nivel de agotamiento parte los PG máximos, y el paso lo
  // dice. El nivel viaja en el `sourceKey` (`exhaustion:4`), no en esta clave.
  "maxHp.exhaustion.half",
  // effective-speed.ts (velocidad-efectiva.ts la calca)
  "speed.base",
  "speed.condition.zero",
  "speed.condition.half",
  // items.ts (carril B3, fase 2B) — el equipo equipado. `ref` es el `<item.ref>` completo, no la
  // clave suelta del catálogo, así que es una forma distinta de la de `ac.cap.<key>` de arriba
  // aunque diga lo mismo.
  "item.SRD:chain-mail",
  "item.SRD:chain-mail.strengthPenalty",
  "item.CAMPAIGN:ckly2p7mv0000qzrmn831h5x9",
  "ac.cap.SRD:chain-mail.dex",
  "ac.cap.CAMPAIGN:ckly2p7mv0000qzrmn831h5x9.dex",
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

describe("ningún aviso del servidor puede salir «Sin traducir»", () => {
  // **La lista se mantiene a mano, y por eso está aquí y no en un comentario.** Es la misma
  // clase de red que la de las cabeceras de atribución del catálogo: un `grep` de
  // `code: "…"` sobre `apps/api/src/rules/` y `apps/api/src/characters/` da estos siete.
  // Dos de ellos —los del equipo a dos manos— salieron a producción de esta misma sesión
  // pintando «Sin traducir: versatile_needs_both_hands» porque nadie los tradujo al añadirlos.
  const CODIGOS_QUE_EMITE_LA_API = [
    "ac_formula_discarded",
    "armor_stealth_disadvantage",
    "armor_strength_requirement_unmet",
    "attack_not_proficient",
    "item_unresolved",
    "two_weapon_offhand_damage",
    "versatile_needs_both_hands",
    "unresolved_choice",
    "duplicate_skill_choice",
    "stale_choice",
    // Encargo A8 (2026-09-07) — `apps/api/src/rules/catalog/resolve.ts`.
    "subclass_not_chosen",
  ];

  it.each(CODIGOS_QUE_EMITE_LA_API)("«%s» tiene frase en español", (code) => {
    const frase = describirAviso({ code, key: "x", data: { name: "Espada larga", item: "SRD:x" } });
    expect(frase).not.toMatch(/Sin traducir/);
    expect(frase.length).toBeGreaterThan(10);
  });
});

// Encargo A8 (2026-09-07), vuelta de arreglo 1 — menor. `subclass_not_chosen` cubre dos causas
// distintas y **antes decían la misma frase**, que mentía en una de las dos: «todavía no has
// elegido» es falso cuando SÍ hay una subclase guardada y lo que pasa es que no es de esta clase.
describe("subclass_not_chosen dice una frase distinta según el motivo", () => {
  it("sin elegir ninguna, dice que falta elegir y a qué nivel", () => {
    const frase = describirAviso({
      code: "subclass_not_chosen",
      data: { reason: "not_chosen", chosenAtLevel: 3 },
    });
    expect(frase).toMatch(/todavía no has elegido/i);
    expect(frase).toContain("3");
  });

  it("con una guardada de otra clase, dice que no es de esta clase — nunca «no has elegido»", () => {
    const frase = describirAviso({
      code: "subclass_not_chosen",
      data: { reason: "wrong_class", chosenAtLevel: 3 },
    });
    expect(frase).not.toMatch(/todavía no has elegido/i);
    expect(frase).toMatch(/no pertenece a esta clase/i);
  });
});

// Encargo A8 (2026-09-07), vuelta de arreglo 2 — una cosa suelta que pidió la revisión.
//
// `explicacionSubclase` tiene un fallback genérico («Un camino del SRD 5.1.») para cuando el
// catálogo trae una subclase que el diccionario no cubre — y sin esta prueba, ese fallback podía
// quedarse puesto para siempre sin que nadie se enterara: el patrón ya establecido más arriba
// para `ETIQUETAS_QUE_EL_MOTOR_PUEDE_EMITIR` es exactamente este, una lista copiada a mano de
// `apps/api/src/rules/catalog/classes.ts` (la web no puede importar de `apps/api`), porque si
// alguien añade una clase nueva y se olvida de la frase, algo tiene que enterarse antes que un
// jugador viendo «Un camino del SRD 5.1.» en la pantalla.
const SUBCLASES_DEL_CATALOGO = [
  "berserker", // Bárbaro — Senda del berserker
  "lore", // Bardo — Colegio del conocimiento
  "life-domain", // Clérigo — Dominio de la vida
  "circle-of-the-land", // Druida — Círculo de la tierra
  "champion", // Guerrero — Campeón
  "open-hand", // Monje — Camino de la mano abierta
  "oath-of-devotion", // Paladín — Juramento de entrega
  "hunter", // Explorador — Cazador
  "thief", // Pícaro — Ladrón
  "draconic-bloodline", // Hechicero — Linaje dracónico
  "the-fiend", // Brujo — El Infernal
  "evocation", // Mago — Escuela de evocación
];

describe("cada subclase del catálogo tiene su propia frase, no el fallback genérico", () => {
  const FALLBACK = "Un camino del SRD 5.1.";

  it.each(SUBCLASES_DEL_CATALOGO)("«%s» no cae en el fallback", (clave) => {
    const frase = explicacionSubclase(clave);
    expect(frase).not.toBe(FALLBACK);
    expect(frase.length).toBeGreaterThan(10);
  });

  it("una clave que de verdad no está en el catálogo sí cae en el fallback", () => {
    // El fallback existe para algo: comprobar que sigue ahí para lo que de verdad no se conoce.
    expect(explicacionSubclase("esto-no-existe-en-ningun-catalogo")).toBe(FALLBACK);
  });
});
