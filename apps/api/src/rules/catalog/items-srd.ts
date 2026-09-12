// Tarea 2B — carril A1: la puerta única del catálogo de objetos del SRD 5.1.
//
// **Atribución:** material del System Reference Document 5.1, © Wizards of the Coast LLC,
// CC BY 4.0. Ver `NOTICE.md` de la raíz.
//
// **Por qué es una puerta y no tres exportaciones sueltas.** `SRD_WEAPONS`, `SRD_GEAR` y
// `SRD_ARMOR` son tablas de transcripción (§A1); lo que consume el resto de la aplicación —el
// inventario de una campaña, el motor de CA— es la **misma forma** que un objeto propio del DM,
// `ResolvedItem` de `packages/shared/src/item.schema.ts`. Esta puerta hace esa traducción una
// vez, y solo aquí: nadie más vuelve a decidir qué ranura ocupa una espada.
//
// **Ningún objeto mágico.** Los objetos mágicos llamativos no están en el SRD 5.1 y no se
// copian aquí — eso lo escribe el DM como objeto propio de su campaña (`CampaignItem`). Y
// ninguno de estos objetos lleva `effects`: la armadura da CA por su propia fórmula
// (`armor.baseAc` + `dexCap`), no por la lista cerrada de `itemEffectSchema` — de eso se encarga
// otro carril.

import type { ItemKind, ResolvedItem } from "@dnd/shared";
import { SRD_ARMOR } from "./armor";
import { SRD_GEAR } from "./gear";
import { SRD_WEAPONS } from "./weapons";

function weaponToResolvedItem(weapon: (typeof SRD_WEAPONS)[number]): ResolvedItem {
  return {
    ref: `SRD:${weapon.key}`,
    source: "SRD",
    name: weapon.name,
    kind: "WEAPON",
    weightOz: weapon.weightOz,
    costCp: weapon.costCp,
    effects: [],
    weapon: {
      category: weapon.category,
      range: weapon.range,
      damageDice: weapon.damageDice,
      damageType: weapon.damageType,
      properties: weapon.properties,
      versatileDice: weapon.versatileDice,
      rangeNormalFt: weapon.rangeNormalFt,
      rangeLongFt: weapon.rangeLongFt,
    },
    requiresAttunement: false,
    attuned: false,
    // El arma por defecto va a la mano principal, empuñada a una o dos manos — 2B no modela
    // todavía la ocupación de las dos ranuras de mano de un arma `TWO_HANDED` (eso es inventario
    // equipado, no el catálogo).
    slot: "MAIN_HAND",
  };
}

function armorToResolvedItem(armor: (typeof SRD_ARMOR)[number]): ResolvedItem {
  const kind: ItemKind = armor.category === "SHIELD" ? "SHIELD" : "ARMOR";
  return {
    ref: `SRD:${armor.key}`,
    source: "SRD",
    name: armor.name,
    kind,
    weightOz: armor.weightOz,
    costCp: armor.costCp,
    effects: [],
    armor: {
      category: armor.category,
      baseAc: armor.baseAc,
      dexCap: armor.dexCap,
      strengthRequirement: armor.strengthRequirement,
      stealthDisadvantage: armor.stealthDisadvantage,
    },
    requiresAttunement: false,
    attuned: false,
    slot: armor.category === "SHIELD" ? "OFF_HAND" : "ARMOR",
  };
}

function gearToResolvedItem(gear: (typeof SRD_GEAR)[number]): ResolvedItem {
  return {
    ref: `SRD:${gear.key}`,
    source: "SRD",
    name: gear.name,
    kind: "GEAR",
    weightOz: gear.weightOz,
    costCp: gear.costCp,
    effects: [],
    requiresAttunement: false,
    attuned: false,
    // Sin ranura: el equipo de aventura se lleva, no se equipa.
  };
}

/** El catálogo entero de objetos del SRD, ya en la forma que consumen el inventario y la web. */
export const SRD_ITEMS: ResolvedItem[] = [
  ...SRD_WEAPONS.map(weaponToResolvedItem),
  ...SRD_ARMOR.map(armorToResolvedItem),
  ...SRD_GEAR.map(gearToResolvedItem),
];

/** Busca un objeto del SRD por su clave corta (`"long-sword"`, no `"SRD:long-sword"`). */
export function findSrdItem(key: string): ResolvedItem | undefined {
  return SRD_ITEMS.find((item) => item.ref === `SRD:${key}`);
}
