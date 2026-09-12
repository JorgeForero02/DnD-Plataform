import type { ResolvedItem } from "@dnd/shared";
import { resolverOrigen, tablaDeEscalas, type ContextoDeDerivacion } from "../engine";
import { SRD_CLASSES } from "./classes";
import { deriveCharacter } from "./index";
import type { CharacterBuild } from "./resolve";

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

// Encargo A9 (2026-09-07) — el catálogo aprende a CONCEDER una actividad con sus usos.
//
// **Verificado en el SRD 5.1 en inglés (vía 5thsrd.org, "The Barbarian"), no copiado de Foundry
// sin comprobar**: *«you can enter a rage as a bonus action»*, y *«Once you have raged the
// number of times shown for your barbarian level in the Rages column of the Barbarian table,
// you must finish a long rest before you can rage again.»* Coincide con
// `classfeatures/barbarian/barbarian-features/rage.yml` de Foundry (activación `bonus`,
// `uses.recovery: [{ period: lr, type: recoverAll }]`), citado en el informe de esta tarea.
describe("ItemGrant — al nivel 1 un bárbaro recibe la Furia como actividad usable (A9)", () => {
  const build = (classKey: string, level: number) => ({
    abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 8 },
    race: { source: "SRD" as const, key: "human" },
    class: { source: "SRD" as const, key: classKey },
    level,
    choices:
      classKey === "barbarian" ? { "barbarian-skills": ["athletics", "intimidation"] } : undefined,
  });

  it("un bárbaro de nivel 1 recibe la Furia como actividad usable", () => {
    const hoja = deriveCharacter(build("barbarian", 1));
    const furia = hoja.activities.find((a) => a.key === "rage");
    expect(furia?.activation).toEqual({ coste: "BONUS" });
  });

  it("y con sus usos por descanso largo, ya resueltos a un número por el nivel de ESTE personaje", () => {
    const hoja = deriveCharacter(build("barbarian", 1));
    // Aserción de identidad, no `objectContaining` ni `expect.anything()`: si `resetOn` mintiera
    // ("SHORT_REST" en vez de "LONG_REST") o `max` viniera de un origen distinto, esto lo cazaría.
    //
    // **La prueba que tiene que ponerse ROJA si se revierte.** Mutación aplicada y comprobada
    // (ver el informe): quitar `usos` al construir la actividad concedida —"no siembres el
    // recurso"— deja `furia?.usos` en `undefined` y esta prueba en rojo con
    // "Expected: {"max": 2, "resetOn": "LONG_REST"} Received: undefined". Deshecha después.
    expect(hoja.activities.find((a) => a.key === "rage")?.usos).toEqual({
      max: 2,
      resetOn: "LONG_REST",
    });
  });

  it("un mago de nivel 1 NO recibe la Furia", () => {
    const hoja = deriveCharacter(build("wizard", 1));
    expect(hoja.activities.find((a) => a.key === "rage")).toBeUndefined();
  });

  it("los usos de la Furia suben con el nivel: 4 a nivel 9, no los 2 de nivel 1", () => {
    // SRD 5.1, columna «Rages»: 1 → 2, 3 → 3, 6 → 4. Un valor fijo habría acertado a nivel 1 y
    // mentido aquí — es la dimensión que A8 ya enseñó a temer (fijar `chosenAtLevel` a 3 dejaba
    // 1652 pruebas en verde con datos solo de bárbaro).
    const hoja = deriveCharacter(build("barbarian", 9));
    expect(hoja.activities.find((a) => a.key === "rage")?.usos?.max).toBe(4);
  });

  // Vuelta de arreglo 1 (revisión) — crítico I1. La primera versión de esta tarea no tenía esta
  // prueba, y la tabla de escala (que solo llega hasta el tramo `{ desde: 17, valor: 6 }`) no
  // tiene guarda alguna por ENCIMA de su último tramo: un bárbaro de nivel 20 leía ese mismo
  // tramo y su hoja decía "6 usos de Furia" — un número creíble, silencioso y falso. SRD 5.1,
  // columna «Rages», nivel 20: «Unlimited».
  it("a nivel 20 la Furia no tiene tope: `usos.max` es `null`, no el tramo de nivel 17", () => {
    const hoja = deriveCharacter(build("barbarian", 20));
    // Aserción de identidad: si `max` volviera a ser `6` (el tramo de nivel 17), o cualquier
    // otro número inventado para simular "sin límite" (el `999` de Foundry), esto lo cazaría.
    //
    // **La prueba que tiene que ponerse ROJA si se revierte.** Mutación aplicada y comprobada
    // (ver el informe): quitar la comprobación de `sinTopeDesde` en `concederActividadDe` deja
    // `max: 6` aquí, y esta prueba en rojo con "Expected: null Received: 6". Deshecha después.
    expect(hoja.activities.find((a) => a.key === "rage")?.usos).toEqual({
      max: null,
      resetOn: "LONG_REST",
    });
  });

  it("a nivel 19 SÍ hay tope todavía: el sin-tope empieza justo en 20, no antes", () => {
    const hoja = deriveCharacter(build("barbarian", 19));
    expect(hoja.activities.find((a) => a.key === "rage")?.usos?.max).toBe(6);
  });
});

// Encargo A10 (2026-09-07) — números que suben por tramos, no por veinte filas.
//
// **Dónde vive esta prueba, y por qué aquí y no en `engine.spec.ts`.** `resolverOrigen` (el
// motor, A4) ya prueba `escala` con una tabla de mentira construida a mano. Lo que A10 añade es
// la tabla REAL del catálogo (`classes.ts`) — así que la prueba que demuestra que ESA tabla
// entra por la puerta del motor, y no por un camino nuevo que devuelva un número inventado,
// tiene que vivir donde la tabla vive: aquí, importando `SRD_CLASSES` y `resolverOrigen` juntos.
describe("ScaleValue — la tabla real del catálogo entra por resolverOrigen (A10)", () => {
  const barbaro = SRD_CLASSES.find((c) => c.key === "barbarian")!;

  function ctxConNivel(level: number): ContextoDeDerivacion {
    return {
      abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      level,
      escalas: tablaDeEscalas(barbaro.scales ?? {}),
    };
  }

  it("una escala se define por TRAMOS, no por veinte filas", () => {
    expect(barbaro.scales?.["rage-damage"]).toHaveLength(3); // 1, 9, 16
    expect(barbaro.scales?.["barbarian-rages"]).toHaveLength(5); // 1, 3, 6, 12, 17
  });

  it("el daño de Furia es +2 a nivel 1 y +3 a nivel 9", () => {
    expect(resolverOrigen({ tipo: "escala", clave: "rage-damage" }, ctxConNivel(1)).valor).toBe(2);
    expect(resolverOrigen({ tipo: "escala", clave: "rage-damage" }, ctxConNivel(9)).valor).toBe(3);
  });

  // No se repite aquí la prueba "pedir un nivel por debajo del primer tramo lanza": ya vive en
  // `engine.spec.ts` (tarea A4, "escala: lanza si el nivel no llega al primer tramo de la
  // tabla") y es la MISMA guarda de `resolverOrigen`, no una segunda. Fabricar una tabla nueva
  // aquí solo para repetirla con datos de mentira es justo lo que las lecciones de esta tanda
  // piden no hacer — las tablas reales del SRD (`barbarian-rages`, `rage-damage`) empiezan las
  // dos en el nivel 1, el mínimo del juego, así que no hay una ficha real con la que reproducir
  // ese caso: la mutación (cambiar el lanzamiento por un cero) se comprobó igualmente contra la
  // prueba de A4, y queda citada en el informe de esta tarea.
});

// Round 1 de revisión, Tarea 15 (I6, medio) — el único cableado de producción de
// `armor_not_proficient` es `resolveBuild` pasando `characterClass.armorProficiencies` a
// `equipmentToEngineInput` (`resolve.ts`), y no tenía ninguna prueba a este nivel: `items.spec.ts`
// cubre la función pura, pero nada comprobaba que `resolveBuild` de verdad le pasara el dato de
// la clase. Sin esta prueba, borrar ese argumento —lo que hace la mutación de abajo— habría
// pasado con toda la suite en verde.
describe("armor_not_proficient viaja desde la clase hasta el aviso (Tarea 15, I6)", () => {
  const cotaDePlacas: ResolvedItem = {
    ref: "plate",
    source: "SRD",
    name: "Cota de placas",
    kind: "ARMOR",
    weightOz: 0,
    effects: [],
    requiresAttunement: false,
    attuned: false,
    armor: {
      category: "HEAVY",
      baseAc: 18,
      dexCap: 0,
      strengthRequirement: 15,
      stealthDisadvantage: true,
    },
  };

  const build = (classKey: string): CharacterBuild => ({
    abilities: { str: 16, dex: 10, con: 14, int: 12, wis: 10, cha: 8 },
    race: { source: "SRD", key: "human" },
    class: { source: "SRD", key: classKey },
    level: 1,
    items: [cotaDePlacas],
  });

  it("un mago con cota de placas avisa: el mago no es competente con armadura pesada", () => {
    const hoja = deriveCharacter(build("wizard"));
    expect(hoja.warnings).toContainEqual(
      expect.objectContaining({
        code: "armor_not_proficient",
        data: expect.objectContaining({ armorKey: "plate", category: "heavy" }),
      }),
    );
  });

  it("un guerrero con la misma cota de placas NO avisa: es competente con armadura pesada", () => {
    const hoja = deriveCharacter(build("fighter"));
    expect(hoja.warnings.some((w) => w.code === "armor_not_proficient")).toBe(false);
  });
});
