/**
 * **`LABEL_KEYS` — el vocabulario que el motor de reglas puede emitir** (tarea 34, tandas 2-5;
 * fix round 1 tras revisión).
 *
 * Hasta la tarea 34, `apps/web/src/features/character-sheet/__tests__/vocabulario.test.ts`
 * llevaba esta misma lista escrita **a mano** en el fichero de la prueba, porque la web no
 * puede importar `apps/api/src/rules/**` (vive en otro paquete). Copiarla a mano es la
 * duplicación que `docs/04-convenciones.md` prohíbe.
 *
 * **La primera versión de este fichero (antes del fix round 1) tenía un fallo real**: aceptaba
 * cualquier `labelKey` que empezara por `race.`, `subrace.`, `class.`, `armor.`, `ability.` o
 * `abilityMod.` — así que una raza, clase o armadura nueva pasaba el registro sin que nadie la
 * tradujera, que es exactamente la garantía que la ficha pedía y no se cumplía (35 de 54 claves
 * pasaban solo por prefijo). El registro ahora exige **coincidencia exacta** para esas familias:
 * `LABEL_KEYS` lista cada clave, generada leyendo los datos reales del catálogo (no el texto
 * fuente) en `apps/api/src/rules/label-keys-catalog.spec.ts` — ese fichero es quien vuelve a
 * derivar la lista de razas/subrazas/clases/armaduras y falla si el catálogo trae una clave que
 * no está aquí.
 *
 * `LABEL_KEY_DYNAMIC_PREFIXES` se ha reducido a las familias que **de verdad no se pueden
 * enumerar**: `item.<ref>` lleva el id de un objeto de campaña (cuid arbitrario), `ac.cap.<ref>`
 * la misma referencia, y `temporary:<motivo>` la prosa libre que el DM o el jugador escriben a
 * mano. Ninguna de las tres tiene un catálogo cerrado que recorrer.
 */
export const LABEL_KEYS = [
  // --- Fijas del motor (engine.ts, attacks.ts, monster.ts, character-state/**, resolverOrigen) ---
  "proficiencyBonus",
  "ac.unarmored",
  "maxHp.firstLevel",
  "maxHp.perLevel",
  "maxHp.perLevelAtCreation",
  "maxHp.conPerLevel",
  "maxHp.minimum",
  "passive.base",
  "senses.darkvision",
  "halfProficiency",
  "expertise",
  "spellSaveDc.base",
  // `resolverOrigen`, kind "cdDeConjuro" — una CD de conjuro ya derivada, tomada como dato desde
  // una actividad (rage-damage no la usa hoy, pero el camino es el mismo que "fixedValue").
  "spellSaveDc",
  "skill.perception",
  // character-sheet.service.ts — cada anulación manual del DM.
  "override.manual",
  // `resolverOrigen`, kind "fijo" — un número escrito a mano en una actividad o rasgo.
  "fixedValue",
  // `resolverOrigen`, kind "nivelDeEspacio" — el nivel del hueco con el que se lanzó un conjuro.
  "spellSlotLevel",
  // agotamiento.ts (2C.4) — el cuarto nivel de agotamiento parte los PG máximos.
  "maxHp.exhaustion.half",
  // monster.ts (fase 2D) — un PNJ es una fila de Character y pasa por la misma Traza.tsx.
  "proficiencyBonus.byChallenge",
  "ac.statblock",
  "maxHp.hitDiceAverage",
  "maxHp.conPerHitDie",
  // character-sheet.service.ts:1916 — `resolverOrigen({ tipo: "escala", clave: "rage-damage" })`,
  // el daño extra de Furia por nivel. Es la única tabla de escala que hoy se resuelve fuera del
  // catálogo genérico (una llamada fija, no una por clase), así que es una clave suelta y no una
  // familia — de ahí que no haya un prefijo "scale." en la lista de abajo.
  "scale.rage-damage",
  // resolverOrigen, kind "ataqueDeConjuro" (tarea 3A.1, T1) — el bono de ataque de conjuro ya
  // derivado (`derived["attack.spell"]`), tomado como dato desde una actividad. Misma forma que
  // "spellSaveDc" para "cdDeConjuro" justo arriba.
  "attack.spell",
  // resolverOrigen, kind "nivelDeClase" (tarea 3A.1, T1) — familia `nivelDeClase.<clase>`, una
  // por cada clase del catálogo que de verdad usa esta variante (Tomar Aliento del guerrero, Ki
  // del monje — las dos de `casos-raros.json`). Se registra una entrada por clase, como
  // "scale.rage-damage" arriba, no por prefijo: las clases son un catálogo cerrado, no algo
  // genuinamente no enumerable como `item.<ref>`. Ampliar esta lista cuando una clase nueva use
  // `nivelDeClase` de verdad (T2 en adelante).
  "nivelDeClase.fighter",
  "nivelDeClase.monk",
  // effective-speed.ts — la velocidad YA EFECTIVA (tras aplicar condiciones), distinta de la
  // velocidad base por tipo de movimiento (familia `speed.<movimiento>.base` más abajo).
  "speed.base",
  "speed.condition.zero",
  "speed.condition.half",
  // Migración 6 (D-CF-16) — el paso de la sobrecarga, ANTES de las condiciones (SRD 5.1,
  // Variant: Encumbrance): la velocidad baja 10 o 20 pies, y las condiciones actúan después
  // sobre el resultado. Solo aparece con la variante encendida en la campaña.
  "speed.encumbered",
  "speed.heavily-encumbered",
  // apply-damage-modifiers.ts (tarea 2.5.1) — la traza de daño tras resistencias/inmunidades.
  "damage.raw",
  "damage.modifier.immune",
  "damage.modifier.resist",
  "damage.modifier.vulnerable",

  // --- Por característica (seis fijas, AbilityKey en @dnd/shared) ---
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

  // --- Por tipo de movimiento (cinco fijos, `Movement` en packages/shared/src/item.schema.ts:
  // "walk" | "climb" | "swim" | "fly" | "burrow") — velocidad BASE, antes de condiciones. ---
  "speed.walk.base",
  "speed.climb.base",
  "speed.swim.base",
  "speed.fly.base",
  "speed.burrow.base",

  // --- armor.ts (SRD_ARMOR) — una por armadura/escudo del catálogo ---
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
  // ac.cap.<armadura>.dex — solo las que declaran `dexCap` (armor.ts); el escudo no tiene tope.
  "ac.cap.hide.dex",
  "ac.cap.chain-shirt.dex",
  "ac.cap.scale-mail.dex",
  "ac.cap.breastplate.dex",
  "ac.cap.half-plate.dex",
  "ac.cap.ring-mail.dex",
  "ac.cap.chain-mail.dex",
  "ac.cap.splint.dex",
  "ac.cap.plate.dex",

  // --- races.ts (SRD_RACES) — SOLO los grants de kind "ability" | "hpPerLevel" |
  // "abilityChoice" | "skillChoice": son los únicos cuyo `labelKey` llega a un `Modifier` (traza,
  // vía engine.ts) o a un `PendingChoice` (elección sin resolver). Los de kind "feature",
  // "speed", "weaponProficiency", "damageModifier" y "skill" (llano) empujan a la lista de
  // rasgos (`features`, `BloquesDelPie.tsx`) que se pinta con `.name`, nunca con
  // `traducirLabelKey(.labelKey)` — están fuera del registro a propósito, no por olvido. La
  // lista exacta la deriva `label-keys-catalog.spec.ts` leyendo `SRD_RACES` de verdad; esto es
  // el lado que tiene que coincidir con ella.
  "race.dwarf.con",
  "subrace.dwarfHill.wis",
  "subrace.dwarfHill.toughness",
  "race.elf.dex",
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
  "race.halfElf.skills",
  "race.halfOrc.str",
  "race.halfOrc.con",
  "race.tiefling.int",
  "race.tiefling.cha",

  // --- resolve.ts — elección de habilidades de clase, una por clase de SRD_CLASSES ---
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

  // --- items.ts (carril B3, fase 2B) — ejemplos de la familia de `item.<ref>`, incluidos aquí
  // (y no solo por prefijo) porque `vocabulario.test.ts` necesita un caso real que traducir. ---
  "item.SRD:chain-mail",
  "item.SRD:chain-mail.strengthPenalty",
  "item.CAMPAIGN:ckly2p7mv0000qzrmn831h5x9",
  "ac.cap.SRD:chain-mail.dex",
  "ac.cap.CAMPAIGN:ckly2p7mv0000qzrmn831h5x9.dex",
] as const;

export type LabelKey = (typeof LABEL_KEYS)[number];

/**
 * Prefijos de las familias que de verdad no se pueden enumerar: llevan un id arbitrario (objeto
 * de campaña) o prosa libre (motivo de un modificador temporal). `item.` cubre también
 * `ac.cap.<ref>.dex` porque ambas empiezan por la referencia completa del objeto
 * (`ac.cap.SRD:chain-mail.dex`, `ac.cap.CAMPAIGN:<cuid>.dex`) — de ahí los dos prefijos
 * `ac.cap.SRD:` / `ac.cap.CAMPAIGN:`, más estrechos que un `ac.cap.` a secas para no volver a
 * aceptar por prefijo las armaduras con nombre, que ahora son exactas en `LABEL_KEYS`.
 */
export const LABEL_KEY_DYNAMIC_PREFIXES = [
  "item.",
  "ac.cap.SRD:",
  "ac.cap.CAMPAIGN:",
  "temporary:",
] as const;

/**
 * Si una `labelKey` que el motor emite está cubierta: exacta en `LABEL_KEYS`, o por el prefijo de
 * una de las tres familias genuinamente no enumerables. La usa
 * `apps/api/src/rules/label-keys-catalog.spec.ts` para comprobar que ninguna clave nueva del
 * catálogo o del motor se cuela sin registrarse.
 */
export function esLabelKeyRegistrada(labelKey: string): boolean {
  if ((LABEL_KEYS as readonly string[]).includes(labelKey)) return true;
  return LABEL_KEY_DYNAMIC_PREFIXES.some((prefijo) => labelKey.startsWith(prefijo));
}
