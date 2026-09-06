import { SRD_STATBLOCK_POR_REF } from "./monsters-srd";
import { deriveNpc } from "./index";
import { buildAttacks } from "../attacks";
import { findSrdItem } from "./items-srd";

// **Paso 1, tarea 6 — un PNJ es competente con lo que su statblock describe.**
//
// `deriveNpc` dejaba `weaponProficiencies` vacía, así que si se le daba una cimitarra del catálogo
// para que pudiera atacar **tiraba a +2 donde el SRD da +4**, con el aviso `attack_not_proficient`
// encima: la prueba de que el motor lo sabía y no podía hacer nada.
//
// SRD 5.1, Goblin: Dexterity 14 (+2), Challenge 1/4 (bono de competencia **+2**), *«Scimitar.
// Melee Weapon Attack: **+4 to hit**»*. +2 y +2 — la competencia es la mitad del número.

describe("un PNJ y sus armas (paso 1, tarea 6)", () => {
  const goblin = SRD_STATBLOCK_POR_REF.get("SRD:goblin")!;
  const cimitarra = findSrdItem("scimitar")!;

  /** El cuadro de ataques que sale de darle un arma del catálogo a un PNJ ya derivado. */
  function ataquesDe(hoja: ReturnType<typeof deriveNpc>) {
    return buildAttacks({
      items: [{ ...cimitarra, slot: "MAIN_HAND" }] as never,
      abilityMods: {
        str: Math.floor((goblin.abilities.str - 10) / 2),
        dex: Math.floor((goblin.abilities.dex - 10) / 2),
        con: Math.floor((goblin.abilities.con - 10) / 2),
        int: Math.floor((goblin.abilities.int - 10) / 2),
        wis: Math.floor((goblin.abilities.wis - 10) / 2),
        cha: Math.floor((goblin.abilities.cha - 10) / 2),
      },
      proficiencyBonus: hoja.derived.proficiencyBonus.total,
      weaponProficiencies: hoja.weaponProficiencies,
    });
  }

  it("un goblin con su cimitarra ataca a +4, no a +2", () => {
    const ataques = ataquesDe(deriveNpc(goblin));
    expect(ataques.attacks[0].attackBonus.total).toBe(4);
  });

  it("y sin el aviso de no-competencia, que era el motor diciendo que no podía", () => {
    const ataques = ataquesDe(deriveNpc(goblin));
    expect(ataques.warnings.map((w) => w.code)).not.toContain("attack_not_proficient");
  });

  it("la competencia sale del bono por VALOR DE DESAFÍO, no de un número escrito a mano", () => {
    // Goblin, VD 1/4 → +2. Si el bono cambiara, el ataque cambia con él: es la mitad del número.
    expect(deriveNpc(goblin).derived.proficiencyBonus.total).toBe(2);
  });

  it("un PJ sin competencia SIGUE recibiendo el aviso y sin sumar el bono", () => {
    // **La que impide que el arreglo se lleve por delante la regla buena.** Un mago con una
    // espada larga no es competente, y eso el SRD sí lo cobra.
    const espadaLarga = findSrdItem("long-sword")!;
    const ataques = buildAttacks({
      items: [{ ...espadaLarga, slot: "MAIN_HAND" }] as never,
      abilityMods: { str: 0, dex: 2, con: 1, int: 3, wis: 0, cha: 0 },
      proficiencyBonus: 2,
      // Lo que da la clase de mago: nada marcial.
      weaponProficiencies: ["dagger", "quarterstaff"],
    });

    expect(ataques.warnings.map((w) => w.code)).toContain("attack_not_proficient");
    expect(ataques.attacks[0].attackBonus.total).toBe(0);
  });
});
