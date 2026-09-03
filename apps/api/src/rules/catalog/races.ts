// Tarea 2A.3 — las nueve razas del SRD 5.1 y sus subrazas.
//
// **Atribución:** material del System Reference Document 5.1, © Wizards of the Coast LLC,
// CC BY 4.0. **Los nombres son los de la traducción oficial al español publicada por Wizards**
// («Documento de referencia del sistema 5.1», el PDF `SRD_CC_v5.1_ES.pdf`), no una traducción
// nuestra; la modificación que sí hacemos es reorganizarlos como datos estructurados. El aviso
// completo, con la nota de modificación, está en `NOTICE.md` de la raíz. Tarea C0.
//
// **El SRD trae una subraza por raza** (Enano de las colinas, Alto elfo, Piesligeros,
// Gnomo de las rocas) y ninguna para humano, dracónido, semielfo, semiorco y tiefling. No se
// inventan las que faltan: lo que no está en el SRD no entra (§4.5 del plan de 2A).

import { ABILITY_KEYS, SKILLS, type SkillKey } from "@dnd/shared";
import type { SrdRace } from "./types";

const TODAS_LAS_HABILIDADES = Object.keys(SKILLS) as SkillKey[];

export const SRD_RACES: SrdRace[] = [
  {
    key: "dwarf",
    name: "Enano",
    size: "MEDIUM",
    darkvisionFeet: 60,
    // SRD 5.1: «Tu velocidad no se reduce por llevar armadura pesada».
    heavyArmorSpeedExempt: true,
    grants: [
      { id: "dwarf-con", kind: "ability", ability: "con", amount: 2, labelKey: "race.dwarf.con" },
      {
        id: "dwarf-speed",
        kind: "speed",
        movement: "walk",
        feet: 25,
        labelKey: "race.dwarf.speed",
      },
      {
        id: "dwarf-resilience",
        kind: "feature",
        name: "Resistencia enana",
        labelKey: "race.dwarf.resilience",
      },
      {
        id: "dwarf-combat-training",
        // **Concesión de verdad desde el 2026-09-03, no texto.** Las cuatro armas del SRD, con
        // sus claves del catálogo: el hacha de batalla, el hacha de mano, el martillo ligero y
        // el martillo de guerra. Antes esto era un `feature` y la hoja del clérigo enano decía
        // «Sin competencia» sobre su propia hacha.
        kind: "weaponProficiency",
        keys: ["battleaxe", "handaxe", "light-hammer", "warhammer"],
        name: "Entrenamiento de combate enano",
        labelKey: "race.dwarf.combatTraining",
      },
      {
        id: "dwarf-stonecunning",
        kind: "feature",
        name: "Afinidad con la piedra",
        labelKey: "race.dwarf.stonecunning",
      },
    ],
    subraces: [
      {
        key: "dwarf-hill",
        name: "Enano de las colinas",
        grants: [
          {
            id: "dwarf-hill-wis",
            kind: "ability",
            ability: "wis",
            amount: 1,
            labelKey: "subrace.dwarfHill.wis",
          },
          // El caso de mesa nº 1 depende de esto: es **por nivel**, no una vez.
          {
            id: "dwarf-hill-toughness",
            kind: "hpPerLevel",
            amount: 1,
            labelKey: "subrace.dwarfHill.toughness",
          },
        ],
      },
    ],
  },
  {
    key: "elf",
    name: "Elfo",
    size: "MEDIUM",
    darkvisionFeet: 60,
    grants: [
      { id: "elf-dex", kind: "ability", ability: "dex", amount: 2, labelKey: "race.elf.dex" },
      { id: "elf-speed", kind: "speed", movement: "walk", feet: 30, labelKey: "race.elf.speed" },
      {
        id: "elf-keen-senses",
        kind: "skill",
        skill: "perception",
        level: "proficient",
        labelKey: "race.elf.keenSenses",
      },
      {
        id: "elf-fey-ancestry",
        kind: "feature",
        name: "Linaje feérico",
        labelKey: "race.elf.feyAncestry",
      },
      { id: "elf-trance", kind: "feature", name: "Trance", labelKey: "race.elf.trance" },
    ],
    subraces: [
      {
        key: "elf-high",
        name: "Alto elfo",
        grants: [
          {
            id: "elf-high-int",
            kind: "ability",
            ability: "int",
            amount: 1,
            labelKey: "subrace.elfHigh.int",
          },
          {
            id: "elf-high-weapon-training",
            kind: "feature",
            name: "Entrenamiento con armas élficas",
            labelKey: "subrace.elfHigh.weaponTraining",
          },
          {
            id: "elf-high-cantrip",
            kind: "feature",
            name: "Truco",
            labelKey: "subrace.elfHigh.cantrip",
          },
        ],
      },
    ],
  },
  {
    key: "halfling",
    name: "Mediano",
    size: "SMALL",
    darkvisionFeet: 0,
    grants: [
      {
        id: "halfling-dex",
        kind: "ability",
        ability: "dex",
        amount: 2,
        labelKey: "race.halfling.dex",
      },
      {
        id: "halfling-speed",
        kind: "speed",
        movement: "walk",
        feet: 25,
        labelKey: "race.halfling.speed",
      },
      {
        id: "halfling-lucky",
        kind: "feature",
        name: "Afortunado",
        labelKey: "race.halfling.lucky",
      },
      { id: "halfling-brave", kind: "feature", name: "Valiente", labelKey: "race.halfling.brave" },
      {
        id: "halfling-nimbleness",
        kind: "feature",
        name: "Agilidad de mediano",
        labelKey: "race.halfling.nimbleness",
      },
    ],
    subraces: [
      {
        key: "halfling-lightfoot",
        name: "Piesligeros",
        grants: [
          {
            id: "halfling-lightfoot-cha",
            kind: "ability",
            ability: "cha",
            amount: 1,
            labelKey: "subrace.halflingLightfoot.cha",
          },
          {
            id: "halfling-lightfoot-stealthy",
            kind: "feature",
            name: "Sigiloso por naturaleza",
            labelKey: "subrace.halflingLightfoot.stealthy",
          },
        ],
      },
    ],
  },
  {
    key: "human",
    name: "Humano",
    size: "MEDIUM",
    darkvisionFeet: 0,
    grants: [
      ...ABILITY_KEYS.map((ability) => ({
        id: `human-${ability}`,
        kind: "ability" as const,
        ability,
        amount: 1,
        labelKey: `race.human.${ability}`,
      })),
      {
        id: "human-speed",
        kind: "speed",
        movement: "walk",
        feet: 30,
        labelKey: "race.human.speed",
      },
      {
        id: "human-language",
        kind: "feature",
        name: "Idiomas",
        labelKey: "race.human.language",
      },
    ],
    subraces: [],
  },
  {
    key: "dragonborn",
    name: "Dracónido",
    size: "MEDIUM",
    darkvisionFeet: 0,
    grants: [
      {
        id: "dragonborn-str",
        kind: "ability",
        ability: "str",
        amount: 2,
        labelKey: "race.dragonborn.str",
      },
      {
        id: "dragonborn-cha",
        kind: "ability",
        ability: "cha",
        amount: 1,
        labelKey: "race.dragonborn.cha",
      },
      {
        id: "dragonborn-speed",
        kind: "speed",
        movement: "walk",
        feet: 30,
        labelKey: "race.dragonborn.speed",
      },
      {
        id: "dragonborn-ancestry",
        kind: "feature",
        name: "Linaje dracónico",
        labelKey: "race.dragonborn.ancestry",
      },
      {
        id: "dragonborn-breath",
        kind: "feature",
        name: "Ataque de aliento",
        labelKey: "race.dragonborn.breath",
      },
      {
        id: "dragonborn-resistance",
        kind: "feature",
        name: "Resistencia al daño",
        labelKey: "race.dragonborn.resistance",
      },
    ],
    subraces: [],
  },
  {
    key: "gnome",
    name: "Gnomo",
    size: "SMALL",
    darkvisionFeet: 60,
    grants: [
      { id: "gnome-int", kind: "ability", ability: "int", amount: 2, labelKey: "race.gnome.int" },
      {
        id: "gnome-speed",
        kind: "speed",
        movement: "walk",
        feet: 25,
        labelKey: "race.gnome.speed",
      },
      {
        id: "gnome-cunning",
        kind: "feature",
        name: "Astucia gnoma",
        labelKey: "race.gnome.cunning",
      },
    ],
    subraces: [
      {
        key: "gnome-rock",
        name: "Gnomo de las rocas",
        grants: [
          {
            id: "gnome-rock-con",
            kind: "ability",
            ability: "con",
            amount: 1,
            labelKey: "subrace.gnomeRock.con",
          },
          {
            id: "gnome-rock-artificers-lore",
            kind: "feature",
            name: "Saber del artífice",
            labelKey: "subrace.gnomeRock.artificersLore",
          },
          {
            id: "gnome-rock-tinker",
            kind: "feature",
            name: "Manitas",
            labelKey: "subrace.gnomeRock.tinker",
          },
        ],
      },
    ],
  },
  {
    key: "half-elf",
    name: "Semielfo",
    size: "MEDIUM",
    darkvisionFeet: 60,
    grants: [
      {
        id: "half-elf-cha",
        kind: "ability",
        ability: "cha",
        amount: 2,
        labelKey: "race.halfElf.cha",
      },
      // Las dos elecciones del caso de mesa nº 5. **Carisma queda excluido**: ya recibe su +2.
      {
        id: "half-elf-asi",
        kind: "abilityChoice",
        choose: 2,
        amount: 1,
        from: [...ABILITY_KEYS],
        excluding: ["cha"],
        labelKey: "race.halfElf.asi",
      },
      {
        id: "half-elf-skills",
        kind: "skillChoice",
        choose: 2,
        from: TODAS_LAS_HABILIDADES,
        level: "proficient",
        labelKey: "race.halfElf.skills",
      },
      {
        id: "half-elf-speed",
        kind: "speed",
        movement: "walk",
        feet: 30,
        labelKey: "race.halfElf.speed",
      },
      {
        id: "half-elf-fey-ancestry",
        kind: "feature",
        name: "Linaje feérico",
        labelKey: "race.halfElf.feyAncestry",
      },
    ],
    subraces: [],
  },
  {
    key: "half-orc",
    name: "Semiorco",
    size: "MEDIUM",
    darkvisionFeet: 60,
    grants: [
      {
        id: "half-orc-str",
        kind: "ability",
        ability: "str",
        amount: 2,
        labelKey: "race.halfOrc.str",
      },
      {
        id: "half-orc-con",
        kind: "ability",
        ability: "con",
        amount: 1,
        labelKey: "race.halfOrc.con",
      },
      {
        id: "half-orc-speed",
        kind: "speed",
        movement: "walk",
        feet: 30,
        labelKey: "race.halfOrc.speed",
      },
      {
        id: "half-orc-menacing",
        kind: "skill",
        skill: "intimidation",
        level: "proficient",
        labelKey: "race.halfOrc.menacing",
      },
      {
        id: "half-orc-relentless",
        kind: "feature",
        name: "Aguante incansable",
        labelKey: "race.halfOrc.relentless",
      },
      {
        id: "half-orc-savage-attacks",
        kind: "feature",
        name: "Ataques salvajes",
        labelKey: "race.halfOrc.savageAttacks",
      },
    ],
    subraces: [],
  },
  {
    key: "tiefling",
    name: "Tiefling",
    size: "MEDIUM",
    darkvisionFeet: 60,
    grants: [
      {
        id: "tiefling-int",
        kind: "ability",
        ability: "int",
        amount: 1,
        labelKey: "race.tiefling.int",
      },
      {
        id: "tiefling-cha",
        kind: "ability",
        ability: "cha",
        amount: 2,
        labelKey: "race.tiefling.cha",
      },
      {
        id: "tiefling-speed",
        kind: "speed",
        movement: "walk",
        feet: 30,
        labelKey: "race.tiefling.speed",
      },
      {
        id: "tiefling-hellish-resistance",
        kind: "feature",
        name: "Resistencia infernal",
        labelKey: "race.tiefling.hellishResistance",
      },
      {
        id: "tiefling-infernal-legacy",
        kind: "feature",
        name: "Linaje infernal",
        labelKey: "race.tiefling.infernalLegacy",
      },
    ],
    subraces: [],
  },
];
