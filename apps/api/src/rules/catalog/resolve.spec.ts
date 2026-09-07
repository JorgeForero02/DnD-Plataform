import { deriveCharacter } from "./index";

// Encargo A8 (2026-09-07) — un personaje tiene UNA subclase, no todas.
//
// **El fallo que esto prueba estaba vivo en producción.** `resolveBuild` recorría TODAS las
// subclases de la clase resuelta y aplicaba sus rasgos por nivel, sin mirar nunca qué había
// elegido el personaje — no existía ni la columna, ni el campo, ni el filtro. Un bárbaro de
// nivel 3 tenía los rasgos de su camino **sin haberlo elegido nunca**: el catálogo de este
// proyecto solo tiene un camino por clase (`apps/api/src/rules/catalog/classes.ts`), así que la
// forma en que el fallo se ve HOY con los datos reales no es «dos caminos a la vez» —eso hace
// falta un segundo camino en el catálogo, que no existe— sino algo peor: el camino se aplicaba
// **igual con la elección puesta a `null`**, que es exactamente la ficha de un personaje recién
// creado. Es la misma familia de fallo (una guarda ausente), y las pruebas de abajo la miden con
// los datos que de verdad hay, no con un camino inventado.
//
// SRD 5.1, «Path of the Berserker»: el bárbaro elige senda primordial (subclase) al nivel 3
// («Primal Path», nivel 3), y «Frenzy» es un rasgo de esa senda, no de la clase base.

describe("subclassKey — un personaje tiene una subclase, no todas (A8)", () => {
  const build = (subclassKey: string | null, level = 3) => ({
    abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
    race: { source: "SRD" as const, key: "human" },
    class: { source: "SRD" as const, key: "barbarian" },
    subclass: subclassKey ? { source: "SRD" as const, key: subclassKey } : undefined,
    level,
    choices: { "barbarian-skills": ["athletics", "intimidation"] },
  });

  it("un bárbaro Berserker de nivel 3 tiene frenesí, el rasgo de su propia senda", () => {
    const hoja = deriveCharacter(build("berserker"));
    const claves = hoja.features.map((f) => f.name);
    expect(claves).toContain("Frenesí");
  });

  it("sin subclase elegida, NO se aplica ningún rasgo de camino (el fallo vivo en producción)", () => {
    // Antes del A8: `subclassKey` no existía en ningún sitio y `resolve.ts` recorría todas las
    // subclases de la clase sin condición — así que esto daba "Frenesí" con la elección en
    // `null`, que es la ficha de cualquier bárbaro recién creado.
    const hoja = deriveCharacter(build(null));
    expect(hoja.features.map((f) => f.name)).not.toContain("Frenesí");
  });

  it("y la hoja avisa de que falta elegir camino, a partir del nivel en que la clase elige", () => {
    const hoja = deriveCharacter(build(null));
    const aviso = hoja.warnings.find((w) => w.code === "subclass_not_chosen");
    expect(aviso).toBeDefined();
    expect(aviso!.data!.reason).toBe("not_chosen");
  });

  it("por debajo de chosenAtLevel, no se avisa: todavía no le toca elegir", () => {
    // El bárbaro elige camino al nivel 3 (`chosenAtLevel` en el catálogo). A nivel 2 no ha
    // elegido porque no puede — avisar ahí sería mentir.
    const hoja = deriveCharacter(build(null, 2));
    expect(hoja.warnings.map((w) => w.code)).not.toContain("subclass_not_chosen");
    expect(hoja.features.map((f) => f.name)).not.toContain("Frenesí");
  });

  it("una subclassKey que no es de esta clase no revienta la hoja: no aplica nada y avisa", () => {
    // "champion" es la subclase del guerrero (`apps/api/src/rules/catalog/classes.ts`), no del
    // bárbaro. Es el mismo criterio que ya usa `resolve.ts` con `stale_choice`: un dato viejo no
    // es un dato inválido.
    const hoja = deriveCharacter(build("champion"));
    expect(hoja.features.map((f) => f.name)).not.toContain("Frenesí");
    expect(hoja.features.map((f) => f.sourceKey)).not.toContain("champion");
    const aviso = hoja.warnings.find((w) => w.code === "subclass_not_chosen");
    expect(aviso).toBeDefined();
    // Vuelta de arreglo 1 (revisión) — menor: este caso NO es "no ha elegido", es "eligió una
    // que no es de esta clase". El código es el mismo (mismo criterio que `stale_choice`), pero
    // el `reason` tiene que distinguirlo para que la web no diga «todavía no has elegido» de
    // algo que sí se eligió.
    expect(aviso!.data!.reason).toBe("wrong_class");
  });
});

// Vuelta de arreglo 1 (revisión) — I1: `chosenAtLevel` se lee del catálogo, pero solo se
// probaba con el bárbaro, cuya respuesta es 3. Mutación aplicada y revertida: `const
// chosenAtLevel = 3` en vez de leerlo del catálogo deja **estas dos pruebas rojas** (un clérigo
// de nivel 1 y un druida de nivel 2), aunque las cinco del bárbaro de arriba sigan en verde.
describe("chosenAtLevel varía por clase y se lee del catálogo, no se escribe a mano (A8)", () => {
  const build = (classKey: string, level: number) => ({
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 14, cha: 10 },
    race: { source: "SRD" as const, key: "human" },
    class: { source: "SRD" as const, key: classKey },
    level,
  });

  it("el clérigo elige dominio divino al nivel 1: avisa ya al nivel 1 sin elegir", () => {
    // SRD 5.1, Divine Domain: «At 1st level, a cleric gains the Divine Domain feature.»
    const hoja = deriveCharacter(build("cleric", 1));
    expect(hoja.warnings.map((w) => w.code)).toContain("subclass_not_chosen");
  });

  it("el druida elige círculo al nivel 2: al nivel 1 NO avisa", () => {
    // SRD 5.1, Druid Circle: «At 2nd level, a druid gains the Druid Circle feature.»
    const hoja = deriveCharacter(build("druid", 1));
    expect(hoja.warnings.map((w) => w.code)).not.toContain("subclass_not_chosen");
  });

  it("y al nivel 2 sí avisa", () => {
    const hoja = deriveCharacter(build("druid", 2));
    expect(hoja.warnings.map((w) => w.code)).toContain("subclass_not_chosen");
  });
});
