import { derive } from "../engine";
import { resolveBuild, type CharacterBuild } from "./resolve";

// Tarea 2A.3 — capa 2 de la verificación (§4.4 del plan): **los casos de mesa conocidos, de
// punta a punta por el motor de 2A.2**.
//
// Son cinco fichas que un director de juego reconocería, con el número que el SRD da. Los
// invariantes cazan el error de copiar y pegar; esto caza el otro, que es peor: una cifra
// transcrita mal, o un rasgo modelado como suma única cuando el SRD lo da **por nivel**.
//
// Ninguna de estas pruebas mira dentro del catálogo: entran claves, sale un número.

function ficha(parcial: Partial<CharacterBuild> & Pick<CharacterBuild, "race" | "class">) {
  const build: CharacterBuild = {
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    level: 1,
    ...parcial,
  };
  const resuelto = resolveBuild(build);
  return { resuelto, resultado: derive(resuelto.input) };
}

describe("caso 1 · enano de las colinas bárbaro, nivel 1, CON 16 → 16 PG", () => {
  // La trampa: Dureza Enana da **+1 PG por nivel**. Una fórmula ingenua da 15 y se olvida del
  // rasgo racial. Este caso existe exactamente para eso.
  const { resuelto, resultado } = ficha({
    // 14 de base + 2 del enano = 16.
    abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 12, cha: 8 },
    race: { source: "SRD", key: "dwarf" },
    subrace: { source: "SRD", key: "dwarf-hill" },
    class: { source: "SRD", key: "barbarian" },
    level: 1,
  });

  it("la Constitución final es 16", () => {
    expect(resultado.derived["ability.con"].total).toBe(16);
  });

  it("los PG máximos son 16, no 15", () => {
    expect(resultado.derived.maxHp.total).toBe(16);
  });

  it("la traza nombra la Dureza Enana, y no la esconde dentro de otro número", () => {
    const pasos = resultado.derived.maxHp.steps.map((s) => s.labelKey);
    expect(pasos).toContain("subrace.dwarfHill.toughness");
  });

  it("la velocidad del enano es de 25 pies", () => {
    expect(resuelto.speeds.walk).toBe(25);
  });
});

describe("caso 2 · el mismo enano a nivel 5, con media fija → 60 PG", () => {
  const { resultado } = ficha({
    abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 12, cha: 8 },
    race: { source: "SRD", key: "dwarf" },
    subrace: { source: "SRD", key: "dwarf-hill" },
    class: { source: "SRD", key: "barbarian" },
    level: 5,
  });

  it("12 + (4 × 7) + (5 × 3) + (5 × 1) = 60", () => {
    expect(resultado.derived.maxHp.total).toBe(60);
  });

  it("la Dureza Enana aporta 5, uno por nivel", () => {
    const paso = resultado.derived.maxHp.steps.find(
      (s) => s.labelKey === "subrace.dwarfHill.toughness",
    );
    expect(paso?.amount).toBe(5);
  });

  it("el bonificador de competencia a nivel 5 es +3", () => {
    expect(resultado.derived.proficiencyBonus.total).toBe(3);
  });
});

describe("caso 3 · elfo alto mago nivel 3, INT 16 → CD 13 y ataque +5", () => {
  const { resultado } = ficha({
    // 15 de base + 1 del elfo alto = 16.
    abilities: { str: 8, dex: 14, con: 14, int: 15, wis: 12, cha: 10 },
    race: { source: "SRD", key: "elf" },
    subrace: { source: "SRD", key: "elf-high" },
    class: { source: "SRD", key: "wizard" },
    level: 3,
  });

  it("la Inteligencia final es 16", () => {
    expect(resultado.derived["ability.int"].total).toBe(16);
  });

  it("la CD de salvación de conjuro es 13 = 8 + 2 competencia + 3 Inteligencia", () => {
    expect(resultado.derived.spellSaveDc.total).toBe(13);
  });

  it("el bono de ataque de conjuro es +5", () => {
    expect(resultado.derived["attack.spell"].total).toBe(5);
  });

  it("el elfo trae competencia en Percepción sin que nadie la elija", () => {
    // +2 de competencia y +1 de Sabiduría 12.
    expect(resultado.derived["skill.perception"].total).toBe(3);
  });
});

describe("caso 4 · guerrero con cota de malla y escudo, DES 14 → CA 18", () => {
  // El caso que un modelo puramente aditivo suspende: la cota de malla **anula** la Destreza.
  // Semiorco a propósito, porque no toca Destreza y así el 14 es el 14.
  const { resultado } = ficha({
    abilities: { str: 15, dex: 14, con: 13, int: 10, wis: 12, cha: 8 },
    race: { source: "SRD", key: "half-orc" },
    class: { source: "SRD", key: "fighter" },
    level: 1,
    armor: [
      { source: "SRD", key: "chain-mail" },
      { source: "SRD", key: "shield" },
    ],
  });

  it("la CA es 18, no 20", () => {
    expect(resultado.derived.ac.total).toBe(18);
  });

  it("el recorte de la Destreza se enseña en la traza en vez de desaparecer", () => {
    const recorte = resultado.derived.ac.steps.find((s) => s.op === "cap");
    expect(recorte).toBeDefined();
    expect(recorte?.amount).toBe(-2);
  });

  it("el escudo suma después, gane la fórmula que gane", () => {
    const escudo = resultado.derived.ac.steps.find((s) => s.sourceKey === "shield");
    expect(escudo?.amount).toBe(2);
  });
});

describe("caso 5 · semielfo sin elecciones resueltas", () => {
  const { resuelto, resultado } = ficha({
    abilities: { str: 10, dex: 12, con: 12, int: 13, wis: 10, cha: 15 },
    race: { source: "SRD", key: "half-elf" },
    class: { source: "SRD", key: "rogue" },
    level: 1,
  });

  it("el +2 de Carisma sí se aplica: es fijo, no una elección", () => {
    expect(resultado.derived["ability.cha"].total).toBe(17);
  });

  it("ninguna otra característica se altera mientras la elección esté sin resolver", () => {
    expect(resultado.derived["ability.str"].total).toBe(10);
    expect(resultado.derived["ability.dex"].total).toBe(12);
    expect(resultado.derived["ability.con"].total).toBe(12);
    expect(resultado.derived["ability.int"].total).toBe(13);
    expect(resultado.derived["ability.wis"].total).toBe(10);
  });

  it("la raza deja dos elecciones pendientes: dos características y dos habilidades", () => {
    const deLaRaza = resuelto.pendingChoices.filter((c) => c.grantId.startsWith("half-elf-"));
    expect(deLaRaza.map((c) => c.grantId).sort()).toEqual(["half-elf-asi", "half-elf-skills"]);
    expect(deLaRaza.find((c) => c.grantId === "half-elf-asi")?.choose).toBe(2);
    expect(deLaRaza.find((c) => c.grantId === "half-elf-skills")?.choose).toBe(2);
  });

  it("Carisma queda excluido de la elección: ya recibe su +2", () => {
    const asi = resuelto.pendingChoices.find((c) => c.grantId === "half-elf-asi");
    expect(asi?.excluding).toEqual(["cha"]);
  });

  it("el pícaro añade su propia elección de cuatro habilidades", () => {
    const deClase = resuelto.pendingChoices.find((c) => c.grantId === "rogue-skills");
    expect(deClase?.choose).toBe(4);
  });

  it("ninguna elección pendiente ha tocado las competencias en habilidades", () => {
    expect(resultado.derived["skill.stealth"].total).toBe(1); // solo Destreza 12
  });
});
