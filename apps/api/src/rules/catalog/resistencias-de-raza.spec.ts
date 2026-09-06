import { deriveCharacter } from "./index";

// **Paso 1, tarea 8a — de dónde salen los modificadores de daño de un PERSONAJE JUGADOR.**
//
// La maquinaria existía y estaba probada (`applyDamageModifiers`); lo que faltaba era la fuente.
// Los rasgos de raza eran puro texto (`kind: "feature"`), así que **un enano recibía el veneno
// entero y un tiefling ardía con el fuego entero**, con la traza convincente al lado.
//
// Esta mitad se prueba **sin tocar un solo punto de golpe**: la hoja declara la resistencia. Que
// `changeHp` la aplique es 8b.

describe("las resistencias que dan los rasgos de raza (paso 1, tarea 8a)", () => {
  const base = {
    level: 3,
    abilities: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
    class: { source: "SRD" as const, key: "fighter" },
    choices: { "fighter-skills": ["athletics", "perception"] },
  };

  it("un enano declara resistencia al veneno, y el rasgo se sigue enseñando", () => {
    // SRD 5.1, Dwarven Resilience: «You have advantage on saving throws against poison, and you
    // have resistance against poison damage.»
    const hoja = deriveCharacter({
      ...base,
      race: { source: "SRD", key: "dwarf" },
      subrace: { source: "SRD", key: "dwarf-hill" },
    } as never);

    expect(hoja.damageModifiers).toContainEqual({
      damageType: "POISON",
      effect: "RESIST",
      note: "Resistencia enana",
    });
    // **Y sigue apareciendo como rasgo**: para la mesa es una aptitud con nombre, no solo media
    // resta. Es el mismo trato que la competencia con armas.
    expect(hoja.features.map((f: { name: string }) => f.name)).toContain("Resistencia enana");
  });

  it("un tiefling declara resistencia al fuego", () => {
    // SRD 5.1, Hellish Resistance: «You have resistance to fire damage.»
    const hoja = deriveCharacter({
      ...base,
      race: { source: "SRD", key: "tiefling" },
    } as never);

    expect(hoja.damageModifiers).toContainEqual({
      damageType: "FIRE",
      effect: "RESIST",
      note: "Resistencia infernal",
    });
  });

  it("un humano no declara ninguna: la lista vacía no es una resistencia inventada", () => {
    const hoja = deriveCharacter({ ...base, race: { source: "SRD", key: "human" } } as never);
    expect(hoja.damageModifiers).toEqual([]);
  });

  it("el dracónido NO declara ninguna, y eso es deliberado", () => {
    // SRD 5.1, Damage Resistance: «You have resistance to the damage type associated with your
    // draconic ancestry.» Ese linaje es una ELECCIÓN de entre diez que el catálogo no modela;
    // escribir un tipo concreto sería elegir por el jugador y escribir los diez, darle diez
    // resistencias. Se queda como rasgo de texto hasta que exista la elección.
    const hoja = deriveCharacter({
      ...base,
      race: { source: "SRD", key: "dragonborn" },
    } as never);

    expect(hoja.damageModifiers).toEqual([]);
    expect(hoja.features.map((f: { name: string }) => f.name)).toContain("Resistencia al daño");
  });
});
